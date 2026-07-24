"""
Serializers for Order model.

Handles order creation and listing with proper validation:
- Prevents users from buying their own products
- Validates quantity and product availability
- Auto-sets buyer, seller, and price_at_purchase
"""

from rest_framework import serializers
from .models import Order
from marketplace.models import Product


class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer for Order model.
    
    Most fields are read-only because they're automatically set:
    - buyer: Set from request.user in the view
    - seller: Set from product.seller
    - price_at_purchase: Set from product.price at time of order
    - total_price: Calculated from quantity * price_at_purchase
    
    Only quantity, product, and status can be set by the user.
    """
    buyer = serializers.StringRelatedField(read_only=True)
    seller = serializers.StringRelatedField(read_only=True)
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(is_available=True))
    product_title = serializers.CharField(source='product.title', read_only=True)
    price_at_purchase = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'buyer',
            'seller',
            'product',
            'product_title',
            'quantity',
            'price_at_purchase',
            'total_price',
            'status',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'buyer',
            'seller',
            'price_at_purchase',
            'total_price',
            'created_at',
            'updated_at'
        ]

    def validate_quantity(self, value):
        """
        Ensure quantity is greater than zero.
        
        This validation prevents invalid orders with zero or negative quantities.
        """
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_product(self, value):
        """
        Validate product before order creation.
        
        Ensures:
        1. Product is available for purchase
        2. User is not buying their own product (checked in validate method)
        """
        if not value.is_available:
            raise serializers.ValidationError("This product is not available for purchase.")
        return value

    def validate(self, attrs):
        """
        Cross-field validation.
        
        Prevents users from buying their own products.
        This is a business rule: sellers cannot purchase their own products.
        """
        product = attrs.get('product')
        user = self.context['request'].user
        
        # Prevent users from buying their own products
        if product and product.seller == user:
            raise serializers.ValidationError({
                'product': "You cannot purchase your own product."
            })
        
        return attrs


class OrderListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing orders with nested product details.
    
    Used in OrderListView to provide more detailed information
    about the product being ordered.
    """
    buyer_email = serializers.EmailField(source='buyer.email', read_only=True)
    seller_email = serializers.EmailField(source='seller.email', read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'buyer_email',
            'seller_email',
            'product_id',
            'product_title',
            'quantity',
            'price_at_purchase',
            'total_price',
            'status',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields


class OrderUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating order status.
    
    Only the status field can be updated. Validates that status transitions
    are logical (e.g., can't go from cancelled back to pending).
    """
    VALID_TRANSITIONS = {
        'pending': ['paid', 'cancelled'],
        'paid': ['shipped', 'cancelled'],
        'shipped': ['completed', 'cancelled'],
        'completed': [],   # Final state
        'cancelled': [],   # Final state
    }

    class Meta:
        model = Order
        fields = ['id', 'status', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def validate_status(self, value):
        """Validate the status transition is allowed."""
        if self.instance:
            current_status = self.instance.status
            allowed = self.VALID_TRANSITIONS.get(current_status, [])
            if value not in allowed:
                raise serializers.ValidationError(
                    f"Cannot transition from '{current_status}' to '{value}'. "
                    f"Allowed transitions: {allowed or 'none (final state)'}."
                )
        return value

