"""
Serializers for Order and OrderItem models.
Supports creating multi-item orders from shopping carts and listing user order history.
"""

from rest_framework import serializers
from django.db import transaction
from .models import Order, OrderItem
from marketplace.models import Product


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_available=True),
        source='product'
    )
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_image = serializers.CharField(source='product.image', read_only=True)
    seller_name = serializers.CharField(source='seller.full_name', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product_id',
            'product_title',
            'product_image',
            'seller_name',
            'quantity',
            'price_at_purchase',
            'total_price',
        ]
        read_only_fields = ['id', 'price_at_purchase', 'total_price', 'product_title', 'product_image', 'seller_name']


class OrderCreateItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(min_value=1, default=1)


class OrderSerializer(serializers.ModelSerializer):
    buyer_email = serializers.EmailField(source='buyer.email', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    cart_items = OrderCreateItemInputSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Order
        fields = [
            'id',
            'buyer_email',
            'full_name',
            'phone_number',
            'university',
            'hostel_room',
            'delivery_fee',
            'total_amount',
            'payment_method',
            'payment_reference',
            'status',
            'items',
            'cart_items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'buyer_email', 'total_amount', 'status', 'created_at', 'updated_at', 'items']

    @transaction.atomic
    def create(self, validated_data):
        cart_items_data = validated_data.pop('cart_items', [])
        user = self.context['request'].user

        # Prevent manipulation of initial status - orders always start as pending
        validated_data.pop('status', None)

        order = Order.objects.create(
            buyer=user,
            status='pending',
            **validated_data
        )

        subtotal = 0
        for item_data in cart_items_data:
            p_id = item_data['product_id']
            qty = item_data.get('quantity', 1)
            product = Product.objects.filter(id=p_id, is_available=True).first()
            if not product:
                continue

            item_total = product.price * qty
            subtotal += item_total

            OrderItem.objects.create(
                order=order,
                product=product,
                seller=product.seller,
                quantity=qty,
                price_at_purchase=product.price,
                total_price=item_total
            )

        order.total_amount = subtotal + order.delivery_fee
        order.save()
        return order


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'status', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def validate_status(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        order = self.instance

        if not user or not order:
            return value

        # Admins can set any valid order status
        if user.is_staff or user.is_superuser:
            return value

        # Check user relationship to this order
        is_seller = order.items.filter(seller=user).exists()
        is_buyer = (order.buyer == user)

        if is_seller:
            # Sellers can advance fulfillment
            allowed_seller_transitions = ['shipped', 'completed', 'cancelled']
            if value not in allowed_seller_transitions:
                raise serializers.ValidationError(f"Sellers can only set status to: {', '.join(allowed_seller_transitions)}.")
            return value

        if is_buyer:
            # Buyers can only cancel a pending order
            if value == 'cancelled' and order.status == 'pending':
                return value
            raise serializers.ValidationError("Buyers cannot modify fulfillment status. You may only cancel an order while it is still pending.")

        raise serializers.ValidationError("You do not have permission to update this order's status.")
