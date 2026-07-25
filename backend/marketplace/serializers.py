from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for Product model.
    
    The seller field is read-only because it's automatically set from request.user
    in the view's perform_create() method. This prevents users from creating products
    under someone else's name.
    """
    # Use StringRelatedField to display seller email, or ReadOnlyField with email source
    seller = serializers.StringRelatedField(read_only=True)
    # Alternative: seller = serializers.ReadOnlyField(source="seller.email")
    
    # Computed field for average rating from reviews
    average_rating = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ['seller', 'created_at']  # Seller is set from request.user, created_at is auto-set

    def get_average_rating(self, obj):
        """Calculate and return the average rating for this product."""
        return obj.average_rating

    def validate_price(self, value):
        """Ensure price is greater than zero."""
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_title(self, value):
        """Ensure title is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value.strip()