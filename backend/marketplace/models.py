"""
Product and Category models for marketplace items.
"""

from django.db import models
from django.conf import settings
from django.db.models import Avg
from universities.models import University


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, blank=True, default='ShoppingBag')
    image = models.CharField(max_length=500, blank=True)
    color = models.CharField(max_length=50, blank=True, default='bg-purple-100')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    PRODUCT_TYPE_CHOICES = [
        ("physical", "Physical Product"),
        ("digital", "Digital Product"),
        ("service", "Service"),
    ]

    CONDITION_CHOICES = [
        ("New", "Brand New"),
        ("Like New", "Like New"),
        ("Good", "Good"),
        ("Fair", "Fair"),
    ]

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="products",
        help_text="The user who created this product."
    )
    university = models.ForeignKey(
        University,
        on_delete=models.PROTECT,
        related_name="products",
        help_text="University this product is associated with."
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
        help_text="Product category."
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    product_type = models.CharField(
        max_length=20,
        choices=PRODUCT_TYPE_CHOICES,
        default="physical"
    )
    condition = models.CharField(
        max_length=50,
        choices=CONDITION_CHOICES,
        default="Like New"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Product price in Ghana Cedis"
    )
    old_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Original price before discount"
    )
    image = models.CharField(
        max_length=500,
        blank=True,
        default="https://images.unsplash.com/photo-1650094983020-89c3dfa9ce0d",
        help_text="Primary image URL"
    )

    is_available = models.BooleanField(
        default=True,
        help_text="Whether the product is currently available"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['seller'], name='product_seller_idx'),
            models.Index(fields=['university'], name='product_university_idx'),
            models.Index(fields=['category'], name='product_category_idx'),
            models.Index(fields=['price'], name='product_price_idx'),
            models.Index(fields=['created_at'], name='product_created_idx'),
            models.Index(fields=['is_available'], name='product_available_idx'),
        ]

    def __str__(self):
        return f"{self.title} - {self.seller.email}"

    @property
    def average_rating(self):
        avg_rating = self.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg_rating, 1) if avg_rating else 5.0


class WishlistItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="wishlisted_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} -> {self.product.title}"

