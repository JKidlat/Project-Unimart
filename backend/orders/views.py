"""
Views for multi-vendor ordering, seller suborders, delivery settings,
delivery agreements, status transitions, and issue reporting.
"""

from decimal import Decimal
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsEmailVerifiedForWrite
from messaging.models import Conversation, Message
from .models import (
    Order,
    SellerOrder,
    SellerDeliverySettings,
    BuyerDeliveryPreferences,
    DeliveryAgreement,
    OrderIssueReport,
)
from .serializers import (
    OrderSerializer,
    OrderStatusUpdateSerializer,
    SellerOrderSerializer,
    SellerDeliverySettingsSerializer,
    BuyerDeliveryPreferencesSerializer,
    DeliveryAgreementSerializer,
    ProposeDeliverySerializer,
    OrderIssueReportSerializer,
)
from .services import complete_seller_order_and_deduct_inventory, complete_order_and_deduct_inventory


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ============================================================================
# SELLER DELIVERY SETTINGS
# ============================================================================

class SellerDeliverySettingsView(APIView):
    """
    GET /api/orders/seller-delivery-settings/ - Retrieve seller's delivery configuration defaults.
    PUT/PATCH /api/orders/seller-delivery-settings/ - Update seller's delivery configuration defaults.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        settings_obj, _ = SellerDeliverySettings.objects.get_or_create(seller=user)
        serializer = SellerDeliverySettingsSerializer(settings_obj, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        return self._update(request)

    def patch(self, request):
        return self._update(request)

    def _update(self, request):
        user = request.user
        settings_obj, _ = SellerDeliverySettings.objects.get_or_create(seller=user)
        serializer = SellerDeliverySettingsSerializer(
            settings_obj,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ============================================================================
# BUYER DELIVERY PREFERENCES
# ============================================================================

class BuyerDeliveryPreferencesView(APIView):
    """
    GET /api/orders/buyer-delivery-preferences/ - Retrieve buyer's saved checkout preferences.
    PUT/PATCH /api/orders/buyer-delivery-preferences/ - Update buyer's saved checkout preferences.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        prefs, _ = BuyerDeliveryPreferences.objects.get_or_create(buyer=user)
        serializer = BuyerDeliveryPreferencesSerializer(prefs, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        return self._update(request)

    def patch(self, request):
        return self._update(request)

    def _update(self, request):
        user = request.user
        prefs, _ = BuyerDeliveryPreferences.objects.get_or_create(buyer=user)
        serializer = BuyerDeliveryPreferencesSerializer(
            prefs,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ============================================================================
# MASTER ORDERS (BUYER PERSPECTIVE / ADMIN)
# ============================================================================

class OrderListCreateView(generics.ListCreateAPIView):
    """
    List user master orders (`?role=buyer` | `?role=seller`) or place a new multi-vendor order.
    """
    serializer_class = OrderSerializer
    pagination_class = StandardPagination

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsEmailVerifiedForWrite()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        role_filter = (self.request.query_params.get('role') or '').strip().lower()
        base = (
            Order.objects
            .select_related('buyer')
            .prefetch_related(
                'seller_orders',
                'seller_orders__seller',
                'seller_orders__seller__profile',
                'seller_orders__items',
                'seller_orders__items__product',
                'seller_orders__delivery_agreements',
                'items',
                'items__product',
                'items__seller',
                'items__seller__profile',
            )
            .order_by('-created_at')
        )

        if role_filter == 'seller':
            return base.filter(seller_orders__seller=user).distinct()
        if role_filter == 'buyer':
            return base.filter(buyer=user)

        if user.is_staff or user.is_superuser:
            return base

        return base.filter(Q(buyer=user) | Q(seller_orders__seller=user)).distinct()


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve master order details or update status.
    Scoped strictly to the buyer, sellers with suborders in this order, or administrators.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base = (
            Order.objects
            .select_related('buyer')
            .prefetch_related(
                'seller_orders',
                'seller_orders__seller',
                'seller_orders__seller__profile',
                'seller_orders__items',
                'seller_orders__items__product',
                'seller_orders__delivery_agreements',
                'items',
                'items__product',
                'items__seller',
                'items__seller__profile',
            )
        )
        if user.is_staff or user.is_superuser:
            return base
        return base.filter(Q(buyer=user) | Q(seller_orders__seller=user)).distinct()

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return OrderStatusUpdateSerializer
        return OrderSerializer


# ============================================================================
# SELLER SUBORDERS (SELLER & BUYER SUBORDER MANAGEMENT)
# ============================================================================

class SellerOrderListView(generics.ListAPIView):
    """
    List individual SellerOrders (suborders).
    For sellers: returns suborders assigned to them.
    For buyers (or `?role=buyer`): returns suborders of their purchases.
    Admins can view all suborders.
    """
    serializer_class = SellerOrderSerializer
    pagination_class = StandardPagination
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role_filter = (self.request.query_params.get('role') or '').strip().lower()
        status_filter = (self.request.query_params.get('status') or '').strip().lower()
        search = (self.request.query_params.get('search') or '').strip()

        base = (
            SellerOrder.objects
            .select_related('master_order', 'master_order__buyer', 'seller', 'seller__profile', 'buyer', 'buyer__profile')
            .prefetch_related('items', 'items__product', 'delivery_agreements', 'events', 'conversations')
            .order_by('-created_at')
        )

        if user.is_staff or user.is_superuser:
            qs = base
        elif role_filter == 'buyer':
            qs = base.filter(buyer=user)
        else:
            # Default to seller's suborders
            qs = base.filter(seller=user)

        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)

        if search:
            qs = qs.filter(
                Q(suborder_number__icontains=search)
                | Q(master_order__order_number__icontains=search)
                | Q(buyer__full_name__icontains=search)
                | Q(seller__full_name__icontains=search)
                | Q(items__product_title_snapshot__icontains=search)
            ).distinct()

        return qs


class SellerOrderDetailView(generics.RetrieveAPIView):
    """
    Retrieve single SellerOrder details.
    Permission strictly verified: user must be the seller, the buyer, or staff.
    """
    serializer_class = SellerOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base = (
            SellerOrder.objects
            .select_related('master_order', 'master_order__buyer', 'seller', 'seller__profile', 'buyer', 'buyer__profile')
            .prefetch_related('items', 'items__product', 'delivery_agreements', 'events', 'conversations')
        )
        if user.is_staff or user.is_superuser:
            return base
        return base.filter(Q(seller=user) | Q(buyer=user))


def _get_or_create_suborder_conversation(suborder: SellerOrder) -> Conversation:
    conv = suborder.conversations.first()
    if not conv:
        first_item = suborder.items.select_related('product').first()
        prod = first_item.product if first_item else None
        conv = Conversation.objects.create(
            buyer=suborder.buyer,
            seller=suborder.seller,
            product=prod,
            seller_order=suborder,
        )
    return conv


class SellerOrderAcceptView(APIView):
    """
    POST /api/orders/seller-orders/<id>/accept/
    Seller accepts an order within the 12-hour response window.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        user = request.user
        suborder = generics.get_object_or_404(
            SellerOrder.objects.select_related('master_order', 'seller', 'buyer'),
            pk=pk
        )

        if suborder.seller_id != user.id and not (user.is_staff or user.is_superuser):
            raise PermissionDenied("Only the designated seller can accept this order.")

        if suborder.status != 'pending_response':
            return Response(
                {"error": f"Cannot accept order in '{suborder.status}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = suborder.status
        next_status = 'awaiting_delivery_agreement' if suborder.fulfilment_method in ('custom', 'undecided') else 'accepted'
        suborder.status = next_status
        suborder.save(update_fields=['status', 'updated_at'])

        suborder.log_event(
            actor=user,
            event_type="order_accepted",
            from_status=old_status,
            to_status=next_status,
            description="Seller accepted the order."
        )

        # Notify via order conversation
        conv = _get_or_create_suborder_conversation(suborder)
        seller_label = (getattr(user, 'profile', None) and user.profile.business_name) or user.full_name or "Seller"
        Message.objects.create(
            conversation=conv,
            sender=user,
            message_type="system",
            body=f"✅ {seller_label} has accepted order #{suborder.suborder_number}!",
            metadata={"event": "order_accepted", "suborder_number": suborder.suborder_number}
        )

        suborder.master_order.recalculate_derived_status_and_totals(save=True)
        return Response(SellerOrderSerializer(suborder, context={'request': request}).data)


class SellerOrderRejectView(APIView):
    """
    POST /api/orders/seller-orders/<id>/reject/
    Seller rejects an order, providing a reason.
    Independent lifecycle: Does NOT affect other sellers' suborders.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        user = request.user
        suborder = generics.get_object_or_404(
            SellerOrder.objects.select_related('master_order', 'seller', 'buyer'),
            pk=pk
        )

        if suborder.seller_id != user.id and not (user.is_staff or user.is_superuser):
            raise PermissionDenied("Only the designated seller can reject this order.")

        if suborder.status not in ('pending_response', 'awaiting_delivery_agreement'):
            return Response(
                {"error": f"Cannot reject an order that is already '{suborder.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({"error": "Please provide a reason for rejecting the order."}, status=status.HTTP_400_BAD_REQUEST)

        old_status = suborder.status
        suborder.status = 'rejected'
        suborder.rejection_reason = reason
        suborder.save(update_fields=['status', 'rejection_reason', 'updated_at'])

        suborder.log_event(
            actor=user,
            event_type="order_rejected",
            from_status=old_status,
            to_status="rejected",
            description=f"Seller rejected order: {reason}"
        )

        conv = _get_or_create_suborder_conversation(suborder)
        seller_label = (getattr(user, 'profile', None) and user.profile.business_name) or user.full_name or "Seller"
        Message.objects.create(
            conversation=conv,
            sender=user,
            message_type="system",
            body=f"❌ {seller_label} declined order #{suborder.suborder_number}.\nReason: {reason}",
            metadata={"event": "order_rejected", "suborder_number": suborder.suborder_number, "reason": reason}
        )

        suborder.master_order.recalculate_derived_status_and_totals(save=True)
        return Response(SellerOrderSerializer(suborder, context={'request': request}).data)


class SellerOrderProposeDeliveryView(APIView):
    """
    POST /api/orders/seller-orders/<id>/propose-delivery/
    Proposes a delivery fee, location, and time window for the suborder.
    Posts an interactive delivery proposal card to the order conversation.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        user = request.user
        suborder = generics.get_object_or_404(
            SellerOrder.objects.select_related('master_order', 'seller', 'buyer'),
            pk=pk
        )

        if user.id not in (suborder.seller_id, suborder.buyer_id) and not (user.is_staff or user.is_superuser):
            raise PermissionDenied("You do not have permission to propose delivery for this order.")

        if suborder.status in ('completed', 'cancelled', 'rejected'):
            return Response(
                {"error": f"Cannot propose delivery for a {suborder.status} order."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ProposeDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Supersede any prior pending proposals for this suborder
        suborder.delivery_agreements.filter(status='pending').update(status='superseded')

        agreement = DeliveryAgreement.objects.create(
            seller_order=suborder,
            proposed_by=user,
            fulfilment_method=data['fulfilment_method'],
            proposed_fee=data['proposed_fee'],
            delivery_location=data['delivery_location'],
            estimated_delivery=data.get('estimated_delivery', ''),
            notes=data.get('notes', ''),
            status='pending',
        )

        # Update suborder status to awaiting_delivery_agreement if not already preparing
        if suborder.status in ('pending_response', 'accepted'):
            old_s = suborder.status
            suborder.status = 'awaiting_delivery_agreement'
            suborder.save(update_fields=['status', 'updated_at'])
            suborder.log_event(user, "delivery_proposed", old_s, "awaiting_delivery_agreement", f"Delivery proposed: GH₵{agreement.proposed_fee} at {agreement.delivery_location}")

        # Post structured message to conversation
        conv = _get_or_create_suborder_conversation(suborder)
        proposer_name = (getattr(user, 'profile', None) and user.profile.business_name) or user.full_name or user.email
        method_label = dict(SellerOrder.FULFILMENT_METHOD_CHOICES).get(agreement.fulfilment_method, agreement.fulfilment_method)

        body_text = (
            f"📋 Delivery Proposal from {proposer_name}:\n"
            f"• Method: {method_label}\n"
            f"• Fee: GH₵{agreement.proposed_fee:.2f}\n"
            f"• Location: {agreement.delivery_location}\n"
            f"• Estimated Window: {agreement.estimated_delivery or 'To be agreed'}\n"
            f"{('• Notes: ' + agreement.notes) if agreement.notes else ''}"
        )

        Message.objects.create(
            conversation=conv,
            sender=user,
            message_type="delivery_proposal",
            proposal=agreement,
            body=body_text,
            metadata={
                "event": "delivery_proposal_created",
                "proposal_id": agreement.id,
                "proposed_fee": float(agreement.proposed_fee),
                "fulfilment_method": agreement.fulfilment_method,
                "delivery_location": agreement.delivery_location,
            }
        )

        return Response(DeliveryAgreementSerializer(agreement, context={'request': request}).data, status=status.HTTP_201_CREATED)


class DeliveryAgreementAcceptView(APIView):
    """
    POST /api/orders/delivery-agreements/<id>/accept/
    The counterparty accepts the delivery proposal.
    Directly updates suborder confirmed_delivery_fee, location, and fulfilment method.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        user = request.user
        agreement = generics.get_object_or_404(
            DeliveryAgreement.objects.select_related('seller_order', 'seller_order__master_order', 'seller_order__seller', 'seller_order__buyer', 'proposed_by'),
            pk=pk
        )
        suborder = agreement.seller_order

        # Verify counterparty
        if agreement.proposed_by_id == user.id and not (user.is_staff or user.is_superuser):
            return Response({"error": "You cannot accept your own proposal."}, status=status.HTTP_400_BAD_REQUEST)

        if user.id not in (suborder.seller_id, suborder.buyer_id) and not (user.is_staff or user.is_superuser):
            raise PermissionDenied("You do not have permission to act on this agreement.")

        if agreement.status != 'pending':
            return Response({"error": f"Proposal is already {agreement.status}."}, status=status.HTTP_400_BAD_REQUEST)

        agreement.status = 'accepted'
        agreement.responded_at = timezone.now()
        agreement.save(update_fields=['status', 'responded_at'])

        # Update suborder with confirmed terms
        old_status = suborder.status
        suborder.confirmed_delivery_fee = agreement.proposed_fee
        suborder.fulfilment_method = agreement.fulfilment_method
        suborder.delivery_location = agreement.delivery_location
        suborder.estimated_delivery = agreement.estimated_delivery
        suborder.status = 'preparing'
        suborder.save(update_fields=[
            'confirmed_delivery_fee',
            'fulfilment_method',
            'delivery_location',
            'estimated_delivery',
            'status',
            'updated_at',
        ])

        suborder.log_event(
            actor=user,
            event_type="agreement_accepted",
            from_status=old_status,
            to_status="preparing",
            description=f"Delivery agreement accepted: GH₵{agreement.proposed_fee} at {agreement.delivery_location}"
        )

        conv = _get_or_create_suborder_conversation(suborder)
        approver_name = (getattr(user, 'profile', None) and user.profile.business_name) or user.full_name or "Counterparty"
        Message.objects.create(
            conversation=conv,
            sender=user,
            message_type="system",
            body=f"🤝 {approver_name} accepted the delivery agreement! Terms confirmed at GH₵{agreement.proposed_fee:.2f}. Seller is now preparing order.",
            metadata={"event": "agreement_accepted", "agreement_id": agreement.id}
        )

        suborder.master_order.recalculate_derived_status_and_totals(save=True)
        return Response(SellerOrderSerializer(suborder, context={'request': request}).data)


class DeliveryAgreementRejectView(APIView):
    """
    POST /api/orders/delivery-agreements/<id>/reject/
    The counterparty declines the proposal.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        user = request.user
        agreement = generics.get_object_or_404(
            DeliveryAgreement.objects.select_related('seller_order', 'seller_order__master_order', 'seller_order__seller', 'seller_order__buyer', 'proposed_by'),
            pk=pk
        )
        suborder = agreement.seller_order

        if user.id not in (suborder.seller_id, suborder.buyer_id) and not (user.is_staff or user.is_superuser):
            raise PermissionDenied("You do not have permission to act on this agreement.")

        if agreement.status != 'pending':
            return Response({"error": f"Proposal is already {agreement.status}."}, status=status.HTTP_400_BAD_REQUEST)

        reason = (request.data.get('reason') or '').strip()
        agreement.status = 'rejected'
        agreement.rejection_reason = reason
        agreement.responded_at = timezone.now()
        agreement.save(update_fields=['status', 'rejection_reason', 'responded_at'])

        suborder.log_event(
            actor=user,
            event_type="agreement_rejected",
            from_status=suborder.status,
            to_status=suborder.status,
            description=f"Delivery proposal declined: {reason}"
        )

        conv = _get_or_create_suborder_conversation(suborder)
        Message.objects.create(
            conversation=conv,
            sender=user,
            message_type="system",
            body=f"⚠️ Delivery proposal was declined.\nReason: {reason or 'No reason provided'}. Please propose alternative terms.",
            metadata={"event": "agreement_rejected", "agreement_id": agreement.id, "reason": reason}
        )

        return Response(DeliveryAgreementSerializer(agreement, context={'request': request}).data)


class SellerOrderUpdateStatusView(APIView):
    """
    PATCH /api/orders/seller-orders/<id>/update-status/
    Controlled status lifecycle for individual SellerOrders:
    - Seller transitions: accepted -> preparing -> ready_for_collection / dispatched -> delivered -> completed.
    - Buyer transitions: ready_for_collection / dispatched / delivered -> completed (confirm receipt).
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def patch(self, request, pk):
        user = request.user
        suborder = generics.get_object_or_404(
            SellerOrder.objects.select_related('master_order', 'seller', 'buyer'),
            pk=pk
        )
        next_status = (request.data.get('status') or '').strip().lower()

        valid_statuses = dict(SellerOrder.STATUS_CHOICES)
        if next_status not in valid_statuses:
            return Response({"error": f"Invalid status '{next_status}'."}, status=status.HTTP_400_BAD_REQUEST)

        is_seller = suborder.seller_id == user.id
        is_buyer = suborder.buyer_id == user.id
        is_admin = user.is_staff or user.is_superuser

        if not (is_seller or is_buyer or is_admin):
            raise PermissionDenied("You do not have permission to update this order's status.")

        if suborder.status in ('completed', 'cancelled') and not is_admin:
            return Response(
                {"error": f"Suborder #{suborder.suborder_number} is already {suborder.status} and cannot be modified."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle completion with atomic inventory deduction
        if next_status == 'completed':
            allowed_complete_from = ('ready_for_collection', 'dispatched', 'delivered', 'preparing', 'accepted')
            if suborder.status not in allowed_complete_from and not is_admin:
                return Response(
                    {"error": f"Cannot complete an order currently in '{suborder.status}' state."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            completed_order = complete_seller_order_and_deduct_inventory(suborder, actor=user)

            conv = _get_or_create_suborder_conversation(suborder)
            actor_label = "Buyer" if is_buyer else ("Seller" if is_seller else "Admin")
            Message.objects.create(
                conversation=conv,
                sender=user,
                message_type="system",
                body=f"🎉 Order #{suborder.suborder_number} marked as COMPLETED by {actor_label}! Thank you for shopping on Unimart.",
                metadata={"event": "suborder_completed", "suborder_number": suborder.suborder_number}
            )

            return Response(SellerOrderSerializer(completed_order, context={'request': request}).data)

        # Seller lifecycle validation
        if is_seller and not is_admin:
            allowed_seller_transitions = {
                'pending_response': ['accepted', 'rejected'],
                'accepted': ['preparing', 'awaiting_delivery_agreement', 'ready_for_collection', 'dispatched'],
                'awaiting_delivery_agreement': ['preparing', 'accepted'],
                'preparing': ['ready_for_collection', 'dispatched'],
                'ready_for_collection': ['completed', 'delivered'],
                'dispatched': ['delivered', 'completed'],
                'delivered': ['completed'],
            }
            allowed = allowed_seller_transitions.get(suborder.status, [])
            if next_status not in allowed:
                return Response(
                    {"error": f"Cannot transition from '{suborder.status}' to '{next_status}'. Allowed: {', '.join(allowed)}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Buyer lifecycle validation
        if is_buyer and not is_seller and not is_admin:
            if next_status != 'completed':
                return Response(
                    {"error": "Buyers can only mark orders as completed (confirming receipt) or cancel before fulfillment."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        old_status = suborder.status
        suborder.status = next_status
        suborder.save(update_fields=['status', 'updated_at'])

        suborder.log_event(
            actor=user,
            event_type="status_changed",
            from_status=old_status,
            to_status=next_status,
            description=f"Status advanced to {valid_statuses.get(next_status, next_status)}."
        )

        conv = _get_or_create_suborder_conversation(suborder)
        status_readable = valid_statuses.get(next_status, next_status)
        Message.objects.create(
            conversation=conv,
            sender=user,
            message_type="system",
            body=f"📦 Order #{suborder.suborder_number} status updated to: {status_readable}",
            metadata={"event": "status_changed", "suborder_number": suborder.suborder_number, "status": next_status}
        )

        suborder.master_order.recalculate_derived_status_and_totals(save=True)
        return Response(SellerOrderSerializer(suborder, context={'request': request}).data)


class SellerOrderCancelView(APIView):
    """
    POST /api/orders/seller-orders/<id>/cancel/
    Cancels a suborder.
    - Buyer can cancel while suborder is pending_response or accepted before dispatch.
    - Seller can cancel before dispatch with cancellation reason.
    - Admins can cancel anytime.
    Independent lifecycle: Never cancels other sellers' suborders.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        user = request.user
        suborder = generics.get_object_or_404(
            SellerOrder.objects.select_related('master_order', 'seller', 'buyer'),
            pk=pk
        )

        is_seller = suborder.seller_id == user.id
        is_buyer = suborder.buyer_id == user.id
        is_admin = user.is_staff or user.is_superuser

        if not (is_seller or is_buyer or is_admin):
            raise PermissionDenied("You do not have permission to cancel this order.")

        if suborder.status in ('completed', 'cancelled', 'rejected'):
            return Response(
                {"error": f"Cannot cancel suborder in '{suborder.status}' status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if suborder.status in ('dispatched', 'delivered') and not is_admin:
            return Response(
                {"error": "Cannot cancel an order that is already dispatched or delivered. Please report an issue instead."},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({"error": "Please provide a reason for cancelling the order."}, status=status.HTTP_400_BAD_REQUEST)

        old_status = suborder.status
        suborder.status = 'cancelled'
        suborder.cancellation_reason = reason
        suborder.cancelled_by = user
        suborder.save(update_fields=['status', 'cancellation_reason', 'cancelled_by', 'updated_at'])

        actor_role = "Buyer" if is_buyer else ("Seller" if is_seller else "Admin")
        suborder.log_event(
            actor=user,
            event_type="order_cancelled",
            from_status=old_status,
            to_status="cancelled",
            description=f"Cancelled by {actor_role}. Reason: {reason}"
        )

        conv = _get_or_create_suborder_conversation(suborder)
        Message.objects.create(
            conversation=conv,
            sender=user,
            message_type="system",
            body=f"🚫 Order #{suborder.suborder_number} was cancelled by {actor_role}.\nReason: {reason}",
            metadata={"event": "suborder_cancelled", "suborder_number": suborder.suborder_number, "reason": reason}
        )

        suborder.master_order.recalculate_derived_status_and_totals(save=True)
        return Response(SellerOrderSerializer(suborder, context={'request': request}).data)


class SellerOrderReportIssueView(APIView):
    """
    POST /api/orders/seller-orders/<id>/report-issue/
    Report an issue on a suborder. Flags the suborder and alerts platform admins.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        user = request.user
        suborder = generics.get_object_or_404(
            SellerOrder.objects.select_related('master_order', 'seller', 'buyer'),
            pk=pk
        )

        if user.id not in (suborder.seller_id, suborder.buyer_id) and not (user.is_staff or user.is_superuser):
            raise PermissionDenied("You do not have permission to report an issue on this order.")

        issue_type = (request.data.get('issue_type') or 'other').strip()
        description = (request.data.get('description') or '').strip()

        if not description:
            return Response({"error": "Please provide a description of the issue."}, status=status.HTTP_400_BAD_REQUEST)

        report = OrderIssueReport.objects.create(
            seller_order=suborder,
            reported_by=user,
            issue_type=issue_type,
            description=description,
            status='open',
        )

        old_status = suborder.status
        suborder.status = 'issue_reported'
        suborder.save(update_fields=['status', 'updated_at'])

        suborder.log_event(
            actor=user,
            event_type="issue_reported",
            from_status=old_status,
            to_status="issue_reported",
            description=f"Issue reported ({report.get_issue_type_display()}): {description}"
        )

        conv = _get_or_create_suborder_conversation(suborder)
        reporter_role = "Buyer" if user.id == suborder.buyer_id else "Seller"
        Message.objects.create(
            conversation=conv,
            sender=user,
            message_type="system",
            body=f"⚠️ {reporter_role} reported an issue: {report.get_issue_type_display()}.\nDetails: {description}\nOur support team has been notified.",
            metadata={"event": "issue_reported", "report_id": report.id, "issue_type": issue_type}
        )

        suborder.master_order.recalculate_derived_status_and_totals(save=True)
        return Response(OrderIssueReportSerializer(report, context={'request': request}).data, status=status.HTTP_201_CREATED)
