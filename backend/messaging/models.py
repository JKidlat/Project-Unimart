"""
Buyer-Seller persistent messaging models for Unimart.
A single Conversation links a specific Buyer, Seller, optional Product,
and optional SellerOrder (suborder).
Supports text messages, automated system order updates, and interactive
structured delivery proposals.
"""

from django.conf import settings
from django.db import models
from marketplace.models import Product


class Conversation(models.Model):
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="buyer_conversations",
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_conversations",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
    )
    seller_order = models.ForeignKey(
        "orders.SellerOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
        help_text="Seller suborder associated with this conversation, if initiated from an order."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["buyer", "-updated_at"]),
            models.Index(fields=["seller", "-updated_at"]),
            models.Index(fields=["seller_order"]),
        ]

    def __str__(self):
        order_part = f" (order={self.seller_order_id})" if self.seller_order_id else ""
        return f"Conv #{self.id}: {self.buyer_id} <-> {self.seller_id}{order_part}"


class Message(models.Model):
    MESSAGE_TYPE_CHOICES = [
        ("text", "Text"),
        ("system", "System"),
        ("delivery_proposal", "Delivery Proposal"),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sent_messages",
    )
    body = models.TextField()
    message_type = models.CharField(
        max_length=30,
        choices=MESSAGE_TYPE_CHOICES,
        default="text",
    )
    proposal = models.ForeignKey(
        "orders.DeliveryAgreement",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_messages",
        help_text="Structured delivery proposal linked to this message if message_type='delivery_proposal'."
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional structured event details (e.g., event='order_placed', suborder_number='UM-1001-A')."
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["conversation", "is_read"]),
            models.Index(fields=["message_type"]),
        ]

    def __str__(self):
        sender_label = f"User #{self.sender_id}" if self.sender_id else "System"
        return f"Msg #{self.id} ({self.message_type}) in Conv #{self.conversation_id} by {sender_label}"
