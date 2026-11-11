"""
Core platform models shared across Unimart:
- MediaAsset: Persistent PostgreSQL-backed image/media storage when external bucket storage is unconfigured.
- SupportTicket & SupportMessage: Full customer support ticket & admin response lifecycle.
- AccountDeletionAudit: Anonymized Data Protection Act (Act 843) deletion audit record.
"""

import uuid
from django.conf import settings
from django.db import models


class MediaAsset(models.Model):
    """Persistent binary media record stored in PostgreSQL across stateless container deploys."""

    KIND_CHOICES = [
        ("product", "Product Listing"),
        ("avatar", "User Profile Avatar"),
        ("support", "Support Attachment"),
        ("general", "General"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_media",
    )
    kind = models.CharField(max_length=30, choices=KIND_CHOICES, default="general")
    original_name = models.CharField(max_length=255, blank=True, default="")
    content_type = models.CharField(max_length=100)
    size_bytes = models.PositiveIntegerField()
    data = models.BinaryField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["uploaded_by", "-created_at"]),
            models.Index(fields=["kind", "-created_at"]),
        ]

    def __str__(self):
        return f"MediaAsset({self.id}, {self.content_type}, {self.size_bytes}B)"


class SupportTicket(models.Model):
    """Customer support request linked to user account and tracked in Admin Panel."""

    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_tickets",
    )
    contact_name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    category = models.CharField(max_length=100, default="General Inquiry")
    order_reference = models.CharField(max_length=64, blank=True, default="")
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    admin_response = models.TextField(blank=True, default="")
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="responded_support_tickets",
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["contact_email"]),
        ]

    def __str__(self):
        return f"Ticket #{self.id}: {self.subject} ({self.status})"


class SupportMessage(models.Model):
    """Individual chronological reply inside a SupportTicket conversation."""

    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_messages",
    )
    sender_name = models.CharField(max_length=255)
    is_admin = models.BooleanField(default=False)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["ticket", "created_at"]),
        ]

    def __str__(self):
        return f"SupportMessage(#{self.ticket_id}, admin={self.is_admin})"


class AccountDeletionAudit(models.Model):
    """Non-PII anonymized log retaining deletion audit metadata under Ghana Act 843."""

    deleted_user_id = models.IntegerField()
    email_sha256 = models.CharField(max_length=64)
    reason = models.TextField(blank=True, default="")
    had_transactions = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"AccountDeletionAudit(user={self.deleted_user_id}, had_transactions={self.had_transactions})"
