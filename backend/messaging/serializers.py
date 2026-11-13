"""Serializers for persistent buyer-seller conversations and messages."""

from rest_framework import serializers
from core.media import normalize_public_image_url
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(read_only=True)
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    proposal_details = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender_id",
            "sender_name",
            "sender_role",
            "message_type",
            "body",
            "proposal",
            "proposal_details",
            "metadata",
            "is_read",
            "created_at",
        ]
        read_only_fields = [
            "id", "conversation", "sender_id", "sender_name", "sender_role",
            "message_type", "proposal", "proposal_details", "metadata", "is_read", "created_at"
        ]

    def get_sender_name(self, obj):
        u = obj.sender
        if not u:
            return "System"
        profile = getattr(u, "profile", None)
        if obj.conversation and obj.sender_id == obj.conversation.seller_id:
            if profile and profile.business_name:
                return profile.business_name
        return u.full_name or u.email.split("@")[0]

    def get_sender_role(self, obj):
        if not obj.sender_id:
            return "system"
        if obj.conversation and obj.sender_id == obj.conversation.seller_id:
            return "seller"
        return "buyer"

    def get_proposal_details(self, obj):
        p = obj.proposal
        if not p:
            return None
        return {
            "id": p.id,
            "seller_order_id": p.seller_order_id,
            "proposed_by_id": p.proposed_by_id,
            "fulfilment_method": p.fulfilment_method,
            "fulfilment_method_display": p.get_fulfilment_method_display(),
            "proposed_fee": float(p.proposed_fee),
            "delivery_location": p.delivery_location,
            "estimated_delivery": p.estimated_delivery,
            "notes": p.notes,
            "status": p.status,
            "rejection_reason": p.rejection_reason,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "responded_at": p.responded_at.isoformat() if p.responded_at else None,
        }


class ConversationSerializer(serializers.ModelSerializer):
    product_details = serializers.SerializerMethodField()
    counterparty = serializers.SerializerMethodField()
    viewer_role = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    suborder_details = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "buyer_id",
            "seller_id",
            "product_id",
            "product_details",
            "seller_order_id",
            "suborder_details",
            "counterparty",
            "viewer_role",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]

    def get_product_details(self, obj):
        p = obj.product
        if not p:
            return None
        request = self.context.get("request")
        return {
            "id": p.id,
            "title": p.title,
            "price": float(p.price),
            "stock": p.stock,
            "image": normalize_public_image_url(p.image, request=request),
        }

    def get_suborder_details(self, obj):
        so = obj.seller_order
        if not so:
            return None
        return {
            "id": so.id,
            "suborder_number": so.suborder_number,
            "status": so.status,
            "status_display": so.get_status_display(),
            "subtotal": float(so.subtotal),
            "confirmed_delivery_fee": float(so.confirmed_delivery_fee),
            "fulfilment_method": so.fulfilment_method,
            "fulfilment_method_display": so.get_fulfilment_method_display(),
            "delivery_location": so.delivery_location,
            "estimated_delivery": so.estimated_delivery,
        }

    def get_counterparty(self, obj):
        request = self.context.get("request")
        me = getattr(request, "user", None)
        is_viewer_seller = bool(me and me.id == obj.seller_id)
        other = obj.buyer if is_viewer_seller else obj.seller
        profile = getattr(other, "profile", None)
        uni = profile.university.short_name if (profile and profile.university) else (
            profile.university.name if (profile and profile.university) else "Unassigned"
        )
        display = (
            (profile.business_name or other.full_name or "Verified Seller")
            if not is_viewer_seller
            else (other.full_name or "Student Buyer")
        )
        return {
            "id": other.id,
            "name": display,
            "full_name": other.full_name or display,
            "university": uni,
            "verified": bool(getattr(other, "is_verified_student", False)),
            "profile_pic": normalize_public_image_url(getattr(profile, "profile_pic", None), request=request),
            "role": "Buyer" if is_viewer_seller else "Seller",
        }

    def get_viewer_role(self, obj):
        request = self.context.get("request")
        me = getattr(request, "user", None)
        return "seller" if (me and me.id == obj.seller_id) else "buyer"

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        if not last:
            return None
        return {
            "id": last.id,
            "body": last.body,
            "sender_id": last.sender_id,
            "message_type": last.message_type,
            "is_read": last.is_read,
            "created_at": last.created_at.isoformat(),
        }

    def get_unread_count(self, obj):
        request = self.context.get("request")
        me = getattr(request, "user", None)
        if not me:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=me).count()
