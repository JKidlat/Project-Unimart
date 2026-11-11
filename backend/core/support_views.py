"""
Customer support API views and serialization helpers for Unimart.
Customers can create support tickets, view only their own tickets,
view administrator responses, and post follow-up replies.
"""

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SupportMessage, SupportTicket

User = get_user_model()


class SupportMessageSerializer(serializers.ModelSerializer):
    senderName = serializers.CharField(source="sender_name", read_only=True)
    isAdmin = serializers.BooleanField(source="is_admin", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = SupportMessage
        fields = ["id", "senderName", "isAdmin", "message", "createdAt"]


class SupportTicketSerializer(serializers.ModelSerializer):
    contactName = serializers.CharField(source="contact_name", required=False, allow_blank=True)
    contactEmail = serializers.EmailField(source="contact_email", required=False, allow_blank=True)
    orderReference = serializers.CharField(source="order_reference", required=False, allow_blank=True, default="")
    adminResponse = serializers.CharField(source="admin_response", read_only=True)
    respondedAt = serializers.DateTimeField(source="responded_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    messages = SupportMessageSerializer(many=True, read_only=True)
    statusLabel = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "user",
            "customer",
            "contactName",
            "contactEmail",
            "category",
            "orderReference",
            "subject",
            "description",
            "status",
            "statusLabel",
            "adminResponse",
            "respondedAt",
            "createdAt",
            "updatedAt",
            "messages",
        ]
        read_only_fields = [
            "id",
            "user",
            "customer",
            "status",
            "statusLabel",
            "adminResponse",
            "respondedAt",
            "createdAt",
            "updatedAt",
            "messages",
        ]

    def get_statusLabel(self, obj):
        return obj.get_status_display()

    def get_customer(self, obj):
        u = obj.user
        if not u:
            return {
                "id": None,
                "name": obj.contact_name,
                "email": obj.contact_email,
                "university": "Guest / Unregistered",
                "role": "Guest",
                "phone": "",
            }
        profile = getattr(u, "profile", None)
        uni = profile.university.name if (profile and profile.university) else "Unassigned"
        role = "Admin" if (u.is_staff or u.is_superuser) else ("Seller" if (profile and profile.is_vendor) else "Buyer")
        return {
            "id": u.id,
            "name": u.full_name or obj.contact_name or u.email.split("@")[0],
            "email": u.email,
            "university": uni,
            "role": role,
            "phone": getattr(u, "phone_number", "") or "",
        }


class SupportTicketListCreateView(APIView):
    """
    GET /api/support/tickets/ - List authenticated customer's own support tickets.
    POST /api/support/tickets/ - Create a new support request stored in PostgreSQL.
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        tickets = (
            SupportTicket.objects.filter(user=request.user)
            .select_related("user", "user__profile", "user__profile__university", "responded_by")
            .prefetch_related("messages")
            .order_by("-created_at")
        )
        return Response({"results": SupportTicketSerializer(tickets, many=True).data})

    def post(self, request):
        user = request.user if request.user.is_authenticated else None
        contact_name = (
            (user.full_name or user.email.split("@")[0])
            if user
            else (request.data.get("contactName") or request.data.get("name") or "").strip()
        )
        contact_email = (
            user.email
            if user
            else (request.data.get("contactEmail") or request.data.get("email") or "").strip().lower()
        )
        category = (request.data.get("category") or "General Inquiry").strip()[:100] or "General Inquiry"
        order_ref = (request.data.get("orderReference") or request.data.get("order_reference") or "").strip()[:64]
        subject = (request.data.get("subject") or "").strip()
        description = (request.data.get("description") or request.data.get("message") or "").strip()

        errors = {}
        if not contact_name:
            errors["contactName"] = "Please provide your name."
        if not contact_email:
            errors["contactEmail"] = "Please provide your email address."
        if not subject:
            errors["subject"] = "Please provide a short subject for your request."
        if not description or len(description) < 10:
            errors["description"] = "Please describe your issue in at least 10 characters."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # If unauthenticated user provided an email, link to account ONLY when email matches;
        # logged-in requests always associate directly to request.user.
        linked_user = user
        if linked_user is None and contact_email:
            linked_user = User.objects.filter(email__iexact=contact_email, is_active=True).first()

        ticket = SupportTicket.objects.create(
            user=linked_user,
            contact_name=contact_name,
            contact_email=contact_email,
            category=category,
            order_reference=order_ref,
            subject=subject[:255],
            description=description,
            status="open",
        )
        return Response(
            {"message": "Support request submitted successfully.", "ticket": SupportTicketSerializer(ticket).data},
            status=status.HTTP_201_CREATED,
        )


class SupportTicketDetailView(APIView):
    """Retrieve a single customer ticket or append a customer reply (owner-only)."""

    permission_classes = [permissions.IsAuthenticated]

    def _get_owned_ticket(self, request, pk):
        ticket = generics.get_object_or_404(
            SupportTicket.objects.select_related("user", "user__profile", "user__profile__university").prefetch_related(
                "messages"
            ),
            pk=pk,
        )
        if ticket.user_id != request.user.id and not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied("You do not have permission to access this support ticket.")
        return ticket

    def get(self, request, pk):
        ticket = self._get_owned_ticket(request, pk)
        return Response({"ticket": SupportTicketSerializer(ticket).data})

    def post(self, request, pk):
        ticket = self._get_owned_ticket(request, pk)
        body = (request.data.get("message") or "").strip()
        if not body:
            return Response({"message": "Please enter a reply message."}, status=status.HTTP_400_BAD_REQUEST)

        SupportMessage.objects.create(
            ticket=ticket,
            sender=request.user,
            sender_name=request.user.full_name or request.user.email.split("@")[0],
            is_admin=False,
            message=body,
        )
        if ticket.status == "resolved":
            ticket.status = "open"
        ticket.updated_at = timezone.now()
        ticket.save(update_fields=["status", "updated_at"])
        ticket.refresh_from_db()
        return Response({"ticket": SupportTicketSerializer(ticket).data}, status=status.HTTP_201_CREATED)

