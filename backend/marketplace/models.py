"""
Product and Category models for marketplace items.
"""

from decimal import Decimal
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

    STATUS_CHOICES = [
        ("pending_approval", "Pending Review"),
        ("live", "Live / Approved"),
        ("flagged", "Flagged"),
        ("hidden", "Hidden"),
        ("rejected", "Rejected"),
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
        max_length=1000,
        blank=True,
        default="https://images.unsplash.com/photo-1650094983020-89c3dfa9ce0d",
        help_text="Primary image URL"
    )
    images = models.JSONField(
        default=list,
        blank=True,
        help_text="Ordered list of uploaded image URLs for this listing"
    )
    stock = models.PositiveIntegerField(
        default=1,
        help_text="Number of available items/units remaining in inventory"
    )
    is_resubmitted = models.BooleanField(
        default=False,
        help_text="True when a previously approved/rejected listing was edited and resubmitted for moderation"
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending_approval",
        help_text="Administrative approval status"
    )
    rejection_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Feedback provided by administrator if rejected"
    )
    flag_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Reason provided by moderator if listing is flagged"
    )

    is_available = models.BooleanField(
        default=False,
        help_text="Whether the product is currently available in the shop"
    )

    # Product-level delivery overrides
    override_delivery_settings = models.BooleanField(
        default=False,
        help_text="When True, custom product delivery settings override seller defaults."
    )
    delivery_methods = models.JSONField(
        default=list,
        blank=True,
        help_text="List of enabled methods, e.g. ['personal_delivery', 'collection', 'courier', 'custom']"
    )
    delivery_coverage = models.CharField(max_length=50, blank=True, default="")
    delivery_fee_type = models.CharField(max_length=50, blank=True, default="")
    base_delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    collection_location = models.CharField(max_length=255, blank=True, default="")
    preparation_time = models.CharField(max_length=50, blank=True, default="")
    delivery_instructions = models.TextField(blank=True, default="")

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

    def get_effective_delivery_settings(self):
        """
        Returns effective delivery and collection configuration for this product.
        Falls back to seller default settings or platform defaults.
        """
        defaults = {
            "offers_personal_delivery": True,
            "offers_courier": False,
            "offers_collection": True,
            "offers_custom": False,
            "delivery_coverage": "within_campus",
            "delivery_fee_type": "fixed",
            "base_delivery_fee": Decimal("10.00"),
            "collection_location": "",
            "collection_instructions": "",
            "available_days_times": "",
            "preparation_time": "same_day",
            "custom_prep_time": "",
            "delivery_notes": "",
            "is_overridden": False,
        }

        seller = self.seller
        seller_settings = getattr(seller, "delivery_settings", None)
        if seller_settings:
            defaults.update({
                "offers_personal_delivery": seller_settings.offers_personal_delivery,
                "offers_courier": seller_settings.offers_courier,
                "offers_collection": seller_settings.offers_collection,
                "offers_custom": seller_settings.offers_custom,
                "delivery_coverage": seller_settings.delivery_coverage,
                "delivery_fee_type": seller_settings.delivery_fee_type,
                "base_delivery_fee": seller_settings.base_delivery_fee,
                "collection_location": seller_settings.collection_location or "",
                "collection_instructions": seller_settings.collection_instructions or "",
                "available_days_times": seller_settings.available_days_times or "",
                "preparation_time": seller_settings.preparation_time or "same_day",
                "custom_prep_time": seller_settings.custom_prep_time or "",
                "delivery_notes": seller_settings.delivery_notes or "",
            })

        if self.override_delivery_settings:
            methods = self.delivery_methods or []
            if methods:
                defaults["offers_personal_delivery"] = "personal_delivery" in methods
                defaults["offers_courier"] = "courier" in methods
                defaults["offers_collection"] = "collection" in methods
                defaults["offers_custom"] = "custom" in methods
            if self.delivery_coverage:
                defaults["delivery_coverage"] = self.delivery_coverage
            if self.delivery_fee_type:
                defaults["delivery_fee_type"] = self.delivery_fee_type
            if self.base_delivery_fee is not None:
                defaults["base_delivery_fee"] = self.base_delivery_fee
            if self.collection_location:
                defaults["collection_location"] = self.collection_location
            if self.preparation_time:
                defaults["preparation_time"] = self.preparation_time
            if self.delivery_instructions:
                defaults["delivery_notes"] = self.delivery_instructions
            defaults["is_overridden"] = True

        return defaults


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


class CartItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart_items"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_entries"
    )
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', '-updated_at'], name='cart_user_idx'),
        ]

    def __str__(self):
        return f"Cart({self.user.email}: {self.quantity}x {self.product.title})"


