"""
Review model for product ratings and comments.

Users can only review products they have purchased.
Each user can only leave one review per product (enforced by unique_together).
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from marketplace.models import Product


class Review(models.Model):
    """
    Review model for product ratings and comments.
    
    Users can only create reviews for products they have purchased.
    Each user can only leave one review per product (unique_together constraint).
    The user field is automatically set from request.user in the view.
    """
    RATING_CHOICES = [
        (1, '1 - Poor'),
        (2, '2 - Fair'),
        (3, '3 - Good'),
        (4, '4 - Very Good'),
        (5, '5 - Excellent'),
    ]
    MODERATION_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('flagged', 'Flagged'),
        ('removed', 'Removed'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
        help_text="User who wrote the review. Automatically set from request.user."
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
        help_text="Product being reviewed."
    )
    rating = models.IntegerField(
        choices=RATING_CHOICES,
        help_text="Rating from 1 to 5 stars."
    )
    comment = models.TextField(
        blank=True,
        null=True,
        help_text="Optional comment describing the review."
    )
    moderation_status = models.CharField(
        max_length=20,
        choices=MODERATION_CHOICES,
        default='approved',
        help_text="Administrative moderation status."
    )
    flag_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Reason if review was flagged or removed."
    )
    report_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of moderation reports against this review."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Automatically updated when review is modified."
    )

    class Meta:
        """
        Meta configuration for Review model.
        
        unique_together ensures each user can only review a product once.
        This prevents duplicate reviews and spam.
        Indexes improve query performance for common filters.
        """
        unique_together = [['user', 'product']]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user'], name='review_user_idx'),
            models.Index(fields=['product'], name='review_product_idx'),
            models.Index(fields=['rating'], name='review_rating_idx'),
            models.Index(fields=['created_at'], name='review_created_idx'),
        ]

    def __str__(self):
        """String representation of the review."""
        return f"{self.user.email} - {self.product.title} - {self.rating} stars"

    def clean(self):
        """
        Validate review data before saving.
        
        Ensures rating is between 1 and 5.
        """
        if self.rating < 1 or self.rating > 5:
            raise ValidationError("Rating must be between 1 and 5.")

