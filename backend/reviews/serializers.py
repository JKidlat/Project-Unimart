"""
Serializers for Review model.

Handles review creation and listing with proper validation:
- Ensures user has purchased the product before reviewing
- Prevents duplicate reviews (enforced by unique_together in model)
- Validates rating is between 1-5
"""

from rest_framework import serializers
from .models import Review
from orders.models import Order


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for Review model.
    
    The user field is read-only because it's automatically set from request.user
    in the view's perform_create() method.
    
    Validation ensures:
    1. User has purchased the product (check Order model)
    2. Rating is between 1-5
    3. No duplicate review exists (enforced by model unique_together)
    """
    reviewer_name = serializers.SerializerMethodField(read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'reviewer_name',
            'product',
            'product_title',
            'rating',
            'comment',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'reviewer_name', 'product_title', 'created_at', 'updated_at']

    def get_reviewer_name(self, obj):
        name = obj.user.full_name
        if name:
            parts = name.strip().split()
            if len(parts) > 1:
                return f"{parts[0]} {parts[1][0]}."
            return parts[0]
        return "Verified Student"

    def validate_rating(self, value):
        """
        Ensure rating is between 1 and 5.
        
        This validation prevents invalid ratings outside the allowed range.
        """
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, attrs):
        """
        Cross-field validation.
        
        Ensures:
        1. User has purchased the product (check Order model)
        2. No duplicate review exists (checked via unique_together, but we validate here too)
        """
        product = attrs.get('product')
        user = self.context['request'].user
        
        if product:
            # Check if user has purchased this product
            # Look for completed orders where user is buyer and product matches
            has_purchased = Order.objects.filter(
                buyer=user,
                items__product=product,
                status__in=['paid', 'shipped', 'completed']
            ).exists()
            
            if not has_purchased:
                raise serializers.ValidationError({
                    'product': "You can only review products you have purchased."
                })
            
            if self.instance is None:
                if Review.objects.filter(user=user, product=product).exists():
                    raise serializers.ValidationError({
                        'product': "You have already reviewed this product."
                    })
        
        return attrs


class ReviewListSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField(read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'user_name',
            'product_id',
            'product_title',
            'rating',
            'comment',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        name = obj.user.full_name
        if name:
            parts = name.strip().split()
            if len(parts) > 1:
                return f"{parts[0]} {parts[1][0]}."
            return parts[0]
        return "Verified Student"
