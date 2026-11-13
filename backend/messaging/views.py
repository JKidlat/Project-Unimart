"""
Unified Seller-Buyer Messaging API views.
Strict ownership isolation: buyers and sellers can only view and post within
conversations where they are `buyer` or `seller`.
Supports linking conversations to individual SellerOrders (suborders).
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from marketplace.models import Product
from orders.models import SellerOrder
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

User = get_user_model()


def _assert_participant(conversation: Conversation, user):
    if user.id not in (conversation.buyer_id, conversation.seller_id) and not (user.is_staff or user.is_superuser):
        raise PermissionDenied("You do not have permission to access this conversation.")


class ConversationListCreateView(APIView):
    """
    GET /api/messages/conversations/ - List user's conversations (optionally `?role=seller|buyer`).
    POST /api/messages/conversations/ - Start or retrieve a conversation for a product/seller or suborder.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role_filter = (request.query_params.get("role") or "").strip().lower()
        search = (request.query_params.get("search") or "").strip()

        qs = (
            Conversation.objects.select_related(
                "buyer",
                "buyer__profile",
                "buyer__profile__university",
                "seller",
                "seller__profile",
                "seller__profile__university",
                "product",
                "seller_order",
            )
            .prefetch_related("messages", "messages__proposal")
            .order_by("-updated_at")
        )

        if role_filter == "seller":
            qs = qs.filter(seller=request.user)
        elif role_filter == "buyer":
            qs = qs.filter(buyer=request.user)
        else:
            qs = qs.filter(Q(buyer=request.user) | Q(seller=request.user))

        if search:
            qs = qs.filter(
                Q(product__title__icontains=search)
                | Q(buyer__full_name__icontains=search)
                | Q(seller__full_name__icontains=search)
                | Q(seller__profile__business_name__icontains=search)
                | Q(seller_order__suborder_number__icontains=search)
            )

        serializer = ConversationSerializer(qs, many=True, context={"request": request})
        total_unread = sum(item["unread_count"] for item in serializer.data)
        return Response({"unread_count": total_unread, "results": serializer.data})

    @transaction.atomic
    def post(self, request):
        product_id = request.data.get("product_id") or request.data.get("productId")
        seller_id = request.data.get("seller_id") or request.data.get("sellerId")
        seller_order_id = request.data.get("seller_order_id") or request.data.get("suborder_id")
        initial_message = (request.data.get("initial_message") or request.data.get("message") or "").strip()

        product = None
        suborder = None

        if seller_order_id:
            suborder = generics.get_object_or_404(
                SellerOrder.objects.select_related("seller", "buyer", "master_order"),
                pk=seller_order_id
            )
            if request.user.id not in (suborder.seller_id, suborder.buyer_id) and not (request.user.is_staff or request.user.is_superuser):
                raise PermissionDenied("You do not have permission to view or start this order conversation.")
            buyer = suborder.buyer
            seller = suborder.seller
            first_item = suborder.items.select_related("product").first()
            product = first_item.product if first_item else None
        elif product_id:
            product = generics.get_object_or_404(Product.objects.select_related("seller"), pk=product_id)
            seller = product.seller
            buyer = request.user
        elif seller_id:
            seller = generics.get_object_or_404(User, pk=seller_id, is_active=True)
            buyer = request.user
        else:
            return Response(
                {"error": "Either seller_order_id, product_id, or seller_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if seller.id == buyer.id and not suborder:
            return Response(
                {"error": "You cannot start a conversation with yourself about your own listing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if suborder:
            conv = Conversation.objects.filter(seller_order=suborder).first()
        else:
            conv = (
                Conversation.objects.filter(buyer=buyer, seller=seller, product=product, seller_order__isnull=True)
                .order_by("-updated_at")
                .first()
            )

        created = False
        if not conv:
            conv = Conversation.objects.create(
                buyer=buyer,
                seller=seller,
                product=product,
                seller_order=suborder,
            )
            created = True

        if initial_message:
            Message.objects.create(
                conversation=conv,
                sender=request.user,
                body=initial_message[:2000],
                is_read=False,
            )
            conv.updated_at = timezone.now()
            conv.save(update_fields=["updated_at"])

        conv.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        messages = conv.messages.select_related("sender", "conversation", "proposal").order_by("created_at")

        return Response(
            {
                "conversation": ConversationSerializer(conv, context={"request": request}).data,
                "messages": MessageSerializer(messages, many=True).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ConversationDetailView(APIView):
    """Retrieve a conversation thread and mark incoming messages as read."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        conv = generics.get_object_or_404(
            Conversation.objects.select_related(
                "buyer",
                "buyer__profile",
                "buyer__profile__university",
                "seller",
                "seller__profile",
                "seller__profile__university",
                "product",
                "seller_order",
            ).prefetch_related("messages", "messages__proposal"),
            pk=pk,
        )
        _assert_participant(conv, request.user)
        conv.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        messages = conv.messages.select_related("sender", "conversation", "proposal").order_by("created_at")
        return Response({
            "conversation": ConversationSerializer(conv, context={"request": request}).data,
            "messages": MessageSerializer(messages, many=True).data,
        })


class ConversationMessageCreateView(APIView):
    """Send a persistent message within a conversation (participants only)."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        conv = generics.get_object_or_404(Conversation, pk=pk)
        _assert_participant(conv, request.user)

        body = (request.data.get("body") or request.data.get("message") or "").strip()
        if not body:
            return Response({"error": "Message cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            body=body[:2000],
            is_read=False,
        )
        conv.updated_at = timezone.now()
        conv.save(update_fields=["updated_at"])

        return Response(
            {
                "message": MessageSerializer(msg).data,
                "conversation": ConversationSerializer(conv, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class UnreadMessageCountView(APIView):
    """Return total unread messages across all buyer and seller conversations for user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = (
            Message.objects.filter(
                Q(conversation__buyer=request.user) | Q(conversation__seller=request.user),
                is_read=False,
            )
            .exclude(sender=request.user)
            .count()
        )
        return Response({"unread_count": count})
