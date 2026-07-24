"""
Product model for marketplace items.

Products are created by sellers (users) and linked to universities.
Each product can have multiple orders and reviews.
"""

from django.db import models
from django.conf import settings
from django.db.models import Avg
from universities.models import University


class Product(models.Model):
    """
    Product model representing items available for sale in the marketplace.
    
    Products are automatically linked to sellers via request.user in views.
    The seller field is set in perform_create() to ensure users can only
    create products under their own account.
    """
    PRODUCT_TYPE_CHOICES = [
        ("physical", "Physical Product"),
        ("digital", "Digital Product"),
        ("service", "Service"),
    ]

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="products",
        help_text="The user who created this product. Automatically set from request.user."
    )
    university = models.ForeignKey(
        University,
        on_delete=models.PROTECT,
        related_name="products",
        help_text="University this product is associated with. Protected from deletion."
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    product_type = models.CharField(
        max_length=20,
        choices=PRODUCT_TYPE_CHOICES
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Product price in decimal format"
    )

    is_available = models.BooleanField(
        default=True,
        help_text="Whether the product is currently available for purchase"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Automatically updated when product is modified"
    )

    class Meta:
        """
        Meta configuration for Product model.
        
        Default ordering by creation date (newest first) for better UX.
        Indexes improve query performance for common filters.
        """
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['seller'], name='product_seller_idx'),
            models.Index(fields=['university'], name='product_university_idx'),
            models.Index(fields=['price'], name='product_price_idx'),
            models.Index(fields=['created_at'], name='product_created_idx'),
            models.Index(fields=['is_available'], name='product_available_idx'),
        ]

    def __str__(self):
        """String representation of the product."""
        return f"{self.title} - {self.seller.email}"

    @property
    def average_rating(self):
        """
        Calculate the average rating for this product from all reviews.
        
        Returns:
            float: Average rating (1-5) or 0.0 if no reviews exist.
        
        This property is used in the serializer to display product ratings
        without requiring a separate API call.
        """
        # Use select_related/prefetch_related in views for optimization
        # This property accesses the reverse relation 'reviews' from Review model
        avg_rating = self.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg_rating, 2) if avg_rating else 0.0
