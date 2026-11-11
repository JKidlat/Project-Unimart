"""
Serializers for Order and OrderItem models.
Supports creating multi-item orders from shopping carts (validating available stock without
deducting inventory prematurely) and advancing fulfillment with vendor completion checks.
"""

from collections import defaultdict
from decimal import Decimal
from django.db import transaction
from rest_framework import serializers

from core.media import normalize_public_image_url
from marketplace.models import CartItem, Product
from .models import Order, OrderItem
from .services import complete_order_and_deduct_inventory


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_image = serializers.SerializerMethodField()
    product_stock = serializers.IntegerField(source='product.stock', read_only=True)
    seller_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product_id',
            'product_title',
            'product_image',
            'product_stock',
            'seller_name',
            'quantity',
            'price_at_purchase',
            'total_price',
        ]
        read_only_fields = fields

    def get_product_image(self, obj):
        request = self.context.get('request')
        return normalize_public_image_url(obj.product.image, request=request) if obj.product else ''

    def get_seller_name(self, obj):
        s = obj.seller
        profile = getattr(s, 'profile', None)
        return (profile.business_name if profile and profile.business_name else None) or s.full_name or s.email


class OrderCreateItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(min_value=1, default=1)


class OrderSerializer(serializers.ModelSerializer):
    buyer_email = serializers.EmailField(source='buyer.email', read_only=True)
    buyer_name = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    cart_items = OrderCreateItemInputSerializer(many=True, write_only=True, required=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'buyer_email',
            'buyer_name',
            'full_name',
            'phone_number',
            'university',
            'hostel_room',
            'delivery_fee',
            'total_amount',
            'payment_method',
            'payment_reference',
            'status',
            'refund_status',
            'inventory_deducted',
            'vendor_confirmed_at',
            'items',
            'cart_items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'buyer_email', 'buyer_name', 'total_amount', 'status', 'refund_status',
            'inventory_deducted', 'vendor_confirmed_at', 'created_at', 'updated_at', 'items'
        ]

    def get_buyer_name(self, obj):
        return obj.full_name or (obj.buyer.full_name if obj.buyer else '') or 'Student Buyer'

    @transaction.atomic
    def create(self, validated_data):
        cart_items_data = validated_data.pop('cart_items', [])
        user = self.context['request'].user

        if not cart_items_data:
            raise serializers.ValidationError({'cart_items': 'Please include at least one item in your order.'})

        qty_by_product = defaultdict(int)
        for item_data in cart_items_data:
            qty_by_product[int(item_data['product_id'])] += int(item_data.get('quantity', 1))

        sorted_pids = sorted(qty_by_product.keys())
        locked_products = {
            p.id: p
            for p in Product.objects.select_for_update().filter(id__in=sorted_pids).order_by('id')
        }

        validated_lines = []
        subtotal = Decimal('0.00')
        for pid in sorted_pids:
            qty = qty_by_product[pid]
            product = locked_products.get(pid)
            if not product or product.status != 'live' or not product.is_available:
                raise serializers.ValidationError({
                    'cart_items': f'Product #{pid} is no longer available for purchase.'
                })
            if product.stock <= 0:
                raise serializers.ValidationError({
                    'cart_items': f'"{product.title}" is currently out of stock.'
                })
            if qty > product.stock:
                raise serializers.ValidationError({
                    'cart_items': f'Only {product.stock} unit(s) of "{product.title}" currently available (requested {qty}).'
                })
            line_total = Decimal(str(product.price)) * qty
            subtotal += line_total
            validated_lines.append((product, qty, line_total))

        validated_data.pop('status', None)
        order = Order.objects.create(
            buyer=user,
            status='pending',
            inventory_deducted=False,
            **validated_data,
        )

        for product, qty, line_total in validated_lines:
            OrderItem.objects.create(
                order=order,
                product=product,
                seller=product.seller,
                quantity=qty,
                price_at_purchase=product.price,
                total_price=line_total,
            )

        order.total_amount = subtotal + Decimal(str(order.delivery_fee or 0))
        order.save(update_fields=['total_amount'])

        # Clear purchased items from buyer's persistent DB cart
        CartItem.objects.filter(user=user, product_id__in=sorted_pids).delete()

        return order


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'status', 'inventory_deducted', 'vendor_confirmed_at', 'updated_at']
        read_only_fields = ['id', 'inventory_deducted', 'vendor_confirmed_at', 'updated_at']

    def validate_status(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        order = self.instance

        if not user or not order:
            return value

        if order.status in ('completed', 'cancelled') and not (user.is_staff or user.is_superuser):
            raise serializers.ValidationError(
                f"Order #{order.id} is already {order.status} and cannot be modified."
            )

        if user.is_staff or user.is_superuser:
            return value

        is_seller = order.items.filter(seller=user).exists()
        is_buyer = order.buyer == user

        if is_seller:
            allowed_seller_transitions = ['processing', 'ready_for_pickup', 'shipped', 'completed', 'cancelled']
            if value not in allowed_seller_transitions:
                raise serializers.ValidationError(
                    f"Sellers can only set status to: {', '.join(allowed_seller_transitions)}."
                )
            return value

        if is_buyer:
            if value == 'cancelled' and order.status == 'pending':
                return value
            raise serializers.ValidationError(
                "Buyers cannot modify fulfillment status. You may only cancel an order while it is still pending."
            )

        raise serializers.ValidationError("You do not have permission to update this order's status.")

    def update(self, instance, validated_data):
        next_status = validated_data.get('status', instance.status)
        if next_status == 'completed':
            return complete_order_and_deduct_inventory(instance)
        instance.status = next_status
        instance.save(update_fields=['status', 'updated_at'])
        return instance
