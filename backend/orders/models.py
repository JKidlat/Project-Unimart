"""
Order and OrderItem models for marketplace purchases.
Supports multi-product carts, campus delivery details, and Paystack references.
"""

from django.db import models
from django.conf import settings
from marketplace.models import Product


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("shipped", "Shipped"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders_made",
        help_text="User who placed the order."
    )
    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=50, blank=True)
    university = models.CharField(max_length=255, blank=True)
    hostel_room = models.CharField(max_length=255, blank=True)

    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=20.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    payment_method = models.CharField(max_length=50, default='paystack')
    payment_reference = models.CharField(max_length=120, blank=True, null=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Current status of the order."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['buyer'], name='order_buyer_idx'),
            models.Index(fields=['status'], name='order_status_idx'),
            models.Index(fields=['created_at'], name='order_created_idx'),
        ]

    def __str__(self):
        return f"Order #{self.id} - {self.buyer.email} ({self.status})"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="order_items"
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sales_items"
    )
    quantity = models.PositiveIntegerField(default=1)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        if not self.total_price:
            self.total_price = self.quantity * self.price_at_purchase
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity}x {self.product.title} in Order #{self.order_id}"