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
    user = serializers.StringRelatedField(read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'user',
            'user_email',
            'product',
            'product_title',
            'rating',
            'comment',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'user', 'user_email', 'product_title', 'created_at', 'updated_at']

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
                product=product,
                status__in=['paid', 'shipped', 'completed']
            ).exists()
            
            if not has_purchased:
                raise serializers.ValidationError({
                    'product': "You can only review products you have purchased."
                })
            
            # Check for duplicate review (additional check, though model enforces this)
            # This provides a better error message
            if self.instance is None:  # Only check on create, not update
                if Review.objects.filter(user=user, product=product).exists():
                    raise serializers.ValidationError({
                        'product': "You have already reviewed this product."
                    })
        
        return attrs


class ReviewListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing reviews with user details.
    
    Used in ReviewListView to provide user information
    without exposing sensitive data.
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'user_email',
            'product_id',
            'product_title',
            'rating',
            'comment',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields
