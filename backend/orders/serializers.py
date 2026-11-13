"""
Serializers for Order, SellerOrder, DeliverySettings, and DeliveryAgreements.
Supports multi-vendor checkout: atomic creation of Master Order and Seller Suborders,
data snapshots, deadline tracking, and status transitions.
"""

from collections import defaultdict
from datetime import timedelta
from decimal import Decimal
import uuid
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from core.media import normalize_public_image_url
from marketplace.models import CartItem, Product
from messaging.models import Conversation, Message
from .models import (
    Order,
    SellerOrder,
    OrderItem,
    SellerDeliverySettings,
    BuyerDeliveryPreferences,
    DeliveryAgreement,
    OrderEvent,
    OrderIssueReport,
)
from .services import complete_seller_order_and_deduct_inventory, complete_order_and_deduct_inventory


# ============================================================================
# DELIVERY SETTINGS & PREFERENCES
# ============================================================================

class SellerDeliverySettingsSerializer(serializers.ModelSerializer):
    seller_name = serializers.SerializerMethodField()
    seller_email = serializers.EmailField(source='seller.email', read_only=True)

    class Meta:
        model = SellerDeliverySettings
        fields = [
            'id',
            'seller',
            'seller_email',
            'seller_name',
            'offers_personal_delivery',
            'offers_courier',
            'offers_collection',
            'offers_custom',
            'delivery_coverage',
            'delivery_fee_type',
            'base_delivery_fee',
            'collection_location',
            'collection_instructions',
            'available_days_times',
            'preparation_time',
            'custom_prep_time',
            'delivery_notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'seller', 'seller_email', 'seller_name', 'created_at', 'updated_at']

    def get_seller_name(self, obj):
        profile = getattr(obj.seller, 'profile', None)
        return (profile.business_name if profile and profile.business_name else None) or obj.seller.full_name or obj.seller.email


class BuyerDeliveryPreferencesSerializer(serializers.ModelSerializer):
    buyer_email = serializers.EmailField(source='buyer.email', read_only=True)

    class Meta:
        model = BuyerDeliveryPreferences
        fields = [
            'id',
            'buyer',
            'buyer_email',
            'preferred_university',
            'campus_location',
            'hostel_room',
            'preferred_delivery_time',
            'special_instructions',
            'preferred_contact_method',
            'contact_phone',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'buyer', 'buyer_email', 'created_at', 'updated_at']


# ============================================================================
# DELIVERY AGREEMENTS & EVENTS
# ============================================================================

class DeliveryAgreementSerializer(serializers.ModelSerializer):
    proposed_by_name = serializers.SerializerMethodField()
    proposed_by_role = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryAgreement
        fields = [
            'id',
            'seller_order',
            'proposed_by',
            'proposed_by_name',
            'proposed_by_role',
            'fulfilment_method',
            'proposed_fee',
            'delivery_location',
            'estimated_delivery',
            'notes',
            'status',
            'rejection_reason',
            'created_at',
            'responded_at',
        ]
        read_only_fields = [
            'id', 'seller_order', 'proposed_by', 'proposed_by_name', 'proposed_by_role',
            'status', 'rejection_reason', 'created_at', 'responded_at'
        ]

    def get_proposed_by_name(self, obj):
        u = obj.proposed_by
        if not u:
            return "Participant"
        profile = getattr(u, 'profile', None)
        if obj.seller_order and u.id == obj.seller_order.seller_id:
            return (profile.business_name if profile and profile.business_name else None) or u.full_name or u.email
        return u.full_name or u.email

    def get_proposed_by_role(self, obj):
        if obj.seller_order and obj.proposed_by_id == obj.seller_order.seller_id:
            return "seller"
        return "buyer"


class OrderEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderEvent
        fields = [
            'id',
            'seller_order',
            'actor',
            'actor_name',
            'event_type',
            'from_status',
            'to_status',
            'description',
            'created_at',
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if not obj.actor:
            return "System"
        profile = getattr(obj.actor, 'profile', None)
        return (profile.business_name if profile and profile.business_name else None) or obj.actor.full_name or obj.actor.email


class OrderIssueReportSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.SerializerMethodField()
    suborder_number = serializers.CharField(source='seller_order.suborder_number', read_only=True)

    class Meta:
        model = OrderIssueReport
        fields = [
            'id',
            'seller_order',
            'suborder_number',
            'reported_by',
            'reported_by_name',
            'issue_type',
            'description',
            'status',
            'admin_notes',
            'resolved_by',
            'created_at',
            'resolved_at',
        ]
        read_only_fields = [
            'id', 'reported_by', 'reported_by_name', 'suborder_number',
            'status', 'admin_notes', 'resolved_by', 'created_at', 'resolved_at'
        ]

    def get_reported_by_name(self, obj):
        u = obj.reported_by
        return u.full_name or u.email if u else "User"


# ============================================================================
# ORDER ITEMS
# ============================================================================

class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    product_title = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    unit_price = serializers.SerializerMethodField()
    product_stock = serializers.IntegerField(source='product.stock', read_only=True)
    seller_id = serializers.IntegerField(source='seller.id', read_only=True)
    seller_name = serializers.SerializerMethodField()
    seller_university = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product_id',
            'product_title',
            'product_image',
            'unit_price',
            'product_stock',
            'seller_id',
            'seller_name',
            'seller_university',
            'quantity',
            'price_at_purchase',
            'total_price',
        ]
        read_only_fields = fields

    def get_product_title(self, obj):
        return obj.product_title_snapshot or (obj.product.title if obj.product else "Item")

    def get_product_image(self, obj):
        request = self.context.get('request')
        img = obj.product_image_snapshot or (obj.product.image if obj.product else '')
        return normalize_public_image_url(img, request=request) if img else ''

    def get_unit_price(self, obj):
        return float(obj.unit_price_snapshot or obj.price_at_purchase or 0.0)

    def get_seller_name(self, obj):
        s = obj.seller
        profile = getattr(s, 'profile', None)
        return (profile.business_name if profile and profile.business_name else None) or s.full_name or s.email

    def get_seller_university(self, obj):
        s = obj.seller
        profile = getattr(s, 'profile', None)
        if profile and profile.university:
            return profile.university.short_name or profile.university.name
        return "Campus"


# ============================================================================
# SELLER ORDER (SUBORDER) SERIALIZER
# ============================================================================

class SellerOrderSerializer(serializers.ModelSerializer):
    master_order_id = serializers.IntegerField(source='master_order.id', read_only=True)
    master_order_number = serializers.CharField(source='master_order.order_number', read_only=True)
    seller_name = serializers.SerializerMethodField()
    seller_email = serializers.EmailField(source='seller.email', read_only=True)
    seller_phone = serializers.SerializerMethodField()
    seller_university = serializers.SerializerMethodField()
    buyer_name = serializers.SerializerMethodField()
    buyer_email = serializers.EmailField(source='buyer.email', read_only=True)
    buyer_phone = serializers.SerializerMethodField()
    buyer_university = serializers.CharField(source='master_order.university', read_only=True)
    hostel_room = serializers.CharField(source='master_order.hostel_room', read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_deadline_passed = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    latest_agreement = serializers.SerializerMethodField()
    events = OrderEventSerializer(many=True, read_only=True)
    conversation_id = serializers.SerializerMethodField()

    class Meta:
        model = SellerOrder
        fields = [
            'id',
            'suborder_number',
            'master_order_id',
            'master_order_number',
            'seller',
            'seller_name',
            'seller_email',
            'seller_phone',
            'seller_university',
            'buyer',
            'buyer_name',
            'buyer_email',
            'buyer_phone',
            'buyer_university',
            'hostel_room',
            'status',
            'subtotal',
            'advertised_delivery_fee',
            'confirmed_delivery_fee',
            'total_amount',
            'fulfilment_method',
            'delivery_location',
            'estimated_delivery',
            'seller_response_deadline',
            'is_deadline_passed',
            'rejection_reason',
            'cancellation_reason',
            'inventory_deducted',
            'vendor_confirmed_at',
            'items',
            'latest_agreement',
            'events',
            'conversation_id',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_seller_name(self, obj):
        profile = getattr(obj.seller, 'profile', None)
        return (profile.business_name if profile and profile.business_name else None) or obj.seller.full_name or obj.seller.email

    def get_seller_phone(self, obj):
        return getattr(obj.seller, 'phone_number', '') or ''

    def get_seller_university(self, obj):
        profile = getattr(obj.seller, 'profile', None)
        if profile and profile.university:
            return profile.university.short_name or profile.university.name
        return "Campus"

    def get_buyer_name(self, obj):
        return obj.master_order.full_name or obj.buyer.full_name or obj.buyer.email

    def get_buyer_phone(self, obj):
        return obj.master_order.phone_number or getattr(obj.buyer, 'phone_number', '')

    def get_is_deadline_passed(self, obj):
        if obj.seller_response_deadline and obj.status == 'pending_response':
            return timezone.now() > obj.seller_response_deadline
        return False

    def get_latest_agreement(self, obj):
        agr = obj.delivery_agreements.first()
        if agr:
            return DeliveryAgreementSerializer(agr, context=self.context).data
        return None

    def get_conversation_id(self, obj):
        conv = obj.conversations.first()
        return conv.id if conv else None


# ============================================================================
# MASTER ORDER SERIALIZERS
# ============================================================================

class OrderCreateItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(min_value=1, default=1)
    fulfilment_method = serializers.CharField(required=False, default='personal_delivery')


class OrderSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source='order_number', read_only=True)
    buyer_email = serializers.EmailField(source='buyer.email', read_only=True)
    buyer_name = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, read_only=True)
    seller_orders = SellerOrderSerializer(many=True, read_only=True)
    cart_items = OrderCreateItemInputSerializer(many=True, write_only=True, required=True)
    save_delivery_preferences = serializers.BooleanField(write_only=True, required=False, default=False)
    delivery_instructions = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'order_number',
            'order_code',
            'buyer_email',
            'buyer_name',
            'full_name',
            'phone_number',
            'university',
            'hostel_room',
            'total_product_amount',
            'total_delivery_fee',
            'delivery_fee',
            'total_amount',
            'payment_method',
            'payment_reference',
            'status',
            'overall_status',
            'refund_status',
            'inventory_deducted',
            'vendor_confirmed_at',
            'items',
            'seller_orders',
            'cart_items',
            'save_delivery_preferences',
            'delivery_instructions',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'order_number', 'order_code', 'buyer_email', 'buyer_name',
            'total_product_amount', 'total_delivery_fee', 'delivery_fee', 'total_amount',
            'status', 'overall_status', 'refund_status', 'inventory_deducted',
            'vendor_confirmed_at', 'created_at', 'updated_at', 'items', 'seller_orders'
        ]

    def get_buyer_name(self, obj):
        return obj.full_name or (obj.buyer.full_name if obj.buyer else '') or 'Student Buyer'

    @transaction.atomic
    def create(self, validated_data):
        cart_items_data = validated_data.pop('cart_items', [])
        save_prefs = validated_data.pop('save_delivery_preferences', False)
        delivery_instructions = validated_data.pop('delivery_instructions', '')
        user = self.context['request'].user

        if not cart_items_data:
            raise serializers.ValidationError({'cart_items': 'Please include at least one item in your order.'})

        # Save or update buyer delivery preferences if requested
        if save_prefs or not hasattr(user, 'delivery_preferences'):
            BuyerDeliveryPreferences.objects.update_or_create(
                buyer=user,
                defaults={
                    'preferred_university': validated_data.get('university', ''),
                    'hostel_room': validated_data.get('hostel_room', ''),
                    'contact_phone': validated_data.get('phone_number', ''),
                    'special_instructions': delivery_instructions,
                }
            )

        # Collate quantities and preferred fulfilment per product
        qty_by_product = defaultdict(int)
        method_by_product = {}
        for item_data in cart_items_data:
            pid = int(item_data['product_id'])
            qty_by_product[pid] += int(item_data.get('quantity', 1))
            method_by_product[pid] = item_data.get('fulfilment_method', 'personal_delivery')

        sorted_pids = sorted(qty_by_product.keys())
        locked_products = {
            p.id: p
            for p in Product.objects.select_for_update().filter(id__in=sorted_pids).order_by('id')
        }

        # Validate product catalog availability and group by seller
        items_by_seller = defaultdict(list)
        total_products_sum = Decimal('0.00')

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
            total_products_sum += line_total
            method = method_by_product.get(pid, 'personal_delivery')
            items_by_seller[product.seller].append((product, qty, line_total, method))

        # Generate unique Master Order Number
        today_str = timezone.now().strftime("%Y%m%d")
        random_suffix = uuid.uuid4().hex[:6].upper()
        order_number = f"UM-{today_str}-{random_suffix}"

        validated_data.pop('status', None)
        validated_data.pop('overall_status', None)

        order = Order.objects.create(
            buyer=user,
            order_number=order_number,
            status='pending',
            overall_status='pending',
            inventory_deducted=False,
            **validated_data,
        )

        suborder_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        total_delivery_sum = Decimal('0.00')
        deadline = timezone.now() + timedelta(hours=12)

        # Create independent SellerOrder (suborder) per seller
        for idx, (seller, seller_items) in enumerate(items_by_seller.items()):
            letter = suborder_letters[idx] if idx < len(suborder_letters) else str(idx + 1)
            suborder_number = f"{order_number}-{letter}"

            seller_subtotal = sum(line_total for _, _, line_total, _ in seller_items)
            chosen_method = seller_items[0][3] if seller_items else 'personal_delivery'

            # Determine advertised delivery fee from seller settings or product override
            first_product = seller_items[0][0]
            settings_effective = first_product.get_effective_delivery_settings()

            if chosen_method == 'collection':
                est_fee = Decimal('0.00')
                deliv_location = settings_effective.get('collection_location') or f"{order.university} Campus"
            elif settings_effective.get('delivery_fee_type') == 'free':
                est_fee = Decimal('0.00')
                deliv_location = order.hostel_room or f"{order.university} Campus"
            else:
                est_fee = Decimal(str(settings_effective.get('base_delivery_fee') or 10.00))
                deliv_location = order.hostel_room or f"{order.university} Campus"

            total_delivery_sum += est_fee

            seller_order = SellerOrder.objects.create(
                master_order=order,
                suborder_number=suborder_number,
                seller=seller,
                buyer=user,
                status='pending_response',
                subtotal=seller_subtotal,
                advertised_delivery_fee=est_fee,
                confirmed_delivery_fee=est_fee,
                fulfilment_method=chosen_method,
                delivery_location=deliv_location,
                estimated_delivery=settings_effective.get('available_days_times') or "To be coordinated via chat",
                seller_response_deadline=deadline,
            )

            # Audit event log
            seller_order.log_event(
                actor=user,
                event_type="order_created",
                from_status="",
                to_status="pending_response",
                description=f"Suborder {suborder_number} created with {len(seller_items)} item(s)."
            )

            # Create OrderItems linked to both Master Order and SellerOrder with snapshots
            for product, qty, line_total, _ in seller_items:
                OrderItem.objects.create(
                    order=order,
                    seller_order=seller_order,
                    product=product,
                    seller=seller,
                    quantity=qty,
                    price_at_purchase=product.price,
                    total_price=line_total,
                    product_title_snapshot=product.title,
                    product_image_snapshot=product.image or "",
                    unit_price_snapshot=product.price,
                )

            # Link or create Conversation for this Suborder
            conv = Conversation.objects.filter(
                buyer=user,
                seller=seller,
                seller_order=seller_order
            ).first()

            if not conv:
                conv = Conversation.objects.create(
                    buyer=user,
                    seller=seller,
                    product=first_product,
                    seller_order=seller_order,
                )

            # Automated system event message
            item_summary = ", ".join(f"{qty}x {prod.title}" for prod, qty, _, _ in seller_items)
            Message.objects.create(
                conversation=conv,
                sender=user,
                message_type="system",
                body=(
                    f"📦 Order #{suborder_number} has been placed!\n"
                    f"Items: {item_summary}\n"
                    f"Method: {seller_order.get_fulfilment_method_display()}\n"
                    f"Location: {seller_order.delivery_location or 'Campus'}\n"
                    f"Please review and accept within 12 hours."
                ),
                metadata={
                    "event": "suborder_placed",
                    "suborder_number": suborder_number,
                    "subtotal": float(seller_subtotal),
                    "delivery_fee": float(est_fee),
                }
            )

        # Update Master Order financial totals and status
        order.total_product_amount = total_products_sum
        order.total_delivery_fee = total_delivery_sum
        order.delivery_fee = total_delivery_sum
        order.total_amount = total_products_sum + total_delivery_sum
        order.status = 'pending'
        order.overall_status = 'pending'
        order.save(update_fields=[
            'total_product_amount',
            'total_delivery_fee',
            'delivery_fee',
            'total_amount',
            'status',
            'overall_status',
            'updated_at',
        ])

        # Clear purchased items from buyer DB cart
        CartItem.objects.filter(user=user, product_id__in=sorted_pids).delete()

        return order


# ============================================================================
# STATUS UPDATE & PROPOSAL INPUT SERIALIZERS
# ============================================================================

class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """
    Maintained for backward compatibility with existing PUT/PATCH /api/orders/<id>/
    Delegates to suborders if master order is targeted.
    """
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

        is_seller = order.seller_orders.filter(seller=user).exists() or order.items.filter(seller=user).exists()
        is_buyer = order.buyer_id == user.id

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
            return complete_order_and_deduct_inventory(instance, actor=self.context.get('request').user)
        instance.status = next_status
        instance.save(update_fields=['status', 'updated_at'])
        return instance


class SellerOrderActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['accept', 'reject', 'advance_status', 'cancel'])
    reason = serializers.CharField(required=False, allow_blank=True, default='')
    next_status = serializers.ChoiceField(
        choices=SellerOrder.STATUS_CHOICES,
        required=False,
    )


class ProposeDeliverySerializer(serializers.Serializer):
    fulfilment_method = serializers.ChoiceField(choices=SellerOrder.FULFILMENT_METHOD_CHOICES)
    proposed_fee = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'))
    delivery_location = serializers.CharField(max_length=255)
    estimated_delivery = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
