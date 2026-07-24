"""
Order model for marketplace purchases.

Orders track purchases made by buyers from sellers.
The buyer and seller are automatically set from the product and request.user.
Total price is auto-calculated from quantity and price_at_purchase.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from marketplace.models import Product


class Order(models.Model):
    """
    Order model representing a purchase transaction.
    
    Orders are created when a buyer purchases a product.
    The buyer is automatically set from request.user in the view.
    The seller is automatically set from product.seller.
    The price_at_purchase captures the product price at the time of order
    (in case prices change later).
    The total_price is auto-calculated from quantity * price_at_purchase.
    """
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
        help_text="User who placed the order. Automatically set from request.user."
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders_received",
        help_text="User who owns the product. Automatically set from product.seller."
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="orders",
        help_text="Product being ordered. Protected from deletion to preserve order history."
    )

    quantity = models.PositiveIntegerField(
        default=1,
        help_text="Number of items ordered. Must be greater than zero."
    )
    price_at_purchase = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Product price at the time of order. Captured to preserve historical pricing."
    )
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total order amount (quantity * price_at_purchase). Auto-calculated."
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Current status of the order."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Automatically updated when order status changes."
    )

    class Meta:
        """
        Meta configuration for Order model.
        
        Default ordering by creation date (newest first).
        Indexes improve query performance for common filters.
        """
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['buyer'], name='order_buyer_idx'),
            models.Index(fields=['seller'], name='order_seller_idx'),
            models.Index(fields=['product'], name='order_product_idx'),
            models.Index(fields=['status'], name='order_status_idx'),
            models.Index(fields=['created_at'], name='order_created_idx'),
        ]

    def __str__(self):
        """String representation of the order."""
        return f"Order #{self.id} - {self.buyer.email} -> {self.product.title}"

    def clean(self):
        """
        Validate order data before saving.
        
        Ensures quantity is positive and product is available.
        """
        if self.quantity <= 0:
            raise ValidationError("Quantity must be greater than zero.")
        
        if self.product and not self.product.is_available:
            raise ValidationError("Cannot order an unavailable product.")

    def save(self, *args, **kwargs):
        """
        Override save to auto-calculate total_price.
        
        The total_price is calculated as quantity * price_at_purchase.
        This ensures consistency and prevents manual calculation errors.
        """
        # Auto-calculate total price before saving
        if self.quantity and self.price_at_purchase:
            self.total_price = self.quantity * self.price_at_purchase
        
        # Run validation
        self.full_clean()
        
        super().save(*args, **kwargs)