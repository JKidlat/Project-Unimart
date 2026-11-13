from django.contrib import admin
from .models import (
    Order,
    OrderItem,
    SellerOrder,
    SellerDeliverySettings,
    BuyerDeliveryPreferences,
    DeliveryAgreement,
    OrderEvent,
    OrderIssueReport,
)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = (
        'product',
        'product_title_snapshot',
        'seller',
        'quantity',
        'unit_price_snapshot',
        'total_price',
    )
    readonly_fields = ('product_title_snapshot', 'unit_price_snapshot', 'total_price')


class SellerOrderInline(admin.StackedInline):
    model = SellerOrder
    extra = 0
    fields = (
        'suborder_number',
        'seller',
        'status',
        'subtotal',
        'confirmed_delivery_fee',
        'fulfilment_method',
        'inventory_deducted',
    )
    readonly_fields = ('suborder_number', 'subtotal')
    show_change_link = True


class OrderEventInline(admin.TabularInline):
    model = OrderEvent
    extra = 0
    fields = ('event_type', 'from_status', 'to_status', 'actor', 'description', 'created_at')
    readonly_fields = ('event_type', 'from_status', 'to_status', 'actor', 'description', 'created_at')


class OrderIssueReportInline(admin.StackedInline):
    model = OrderIssueReport
    extra = 0
    fields = ('reported_by', 'issue_type', 'description', 'status', 'admin_notes', 'created_at')
    readonly_fields = ('reported_by', 'issue_type', 'description', 'created_at')


class DeliveryAgreementInline(admin.TabularInline):
    model = DeliveryAgreement
    extra = 0
    fields = (
        'proposed_by',
        'fulfilment_method',
        'proposed_fee',
        'delivery_location',
        'status',
        'created_at',
    )
    readonly_fields = ('proposed_by', 'created_at')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'order_number',
        'buyer',
        'full_name',
        'university',
        'total_amount',
        'status',
        'overall_status',
        'created_at',
    )
    search_fields = (
        'order_number',
        'buyer__email',
        'full_name',
        'university',
        'payment_reference',
    )
    list_filter = ('status', 'overall_status', 'payment_method', 'created_at')
    ordering = ('-created_at',)
    inlines = [SellerOrderInline, OrderItemInline]


@admin.register(SellerOrder)
class SellerOrderAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'suborder_number',
        'master_order',
        'seller',
        'buyer',
        'status',
        'subtotal',
        'confirmed_delivery_fee',
        'fulfilment_method',
        'inventory_deducted',
        'seller_response_deadline',
        'created_at',
    )
    search_fields = (
        'suborder_number',
        'master_order__order_number',
        'seller__email',
        'buyer__email',
    )
    list_filter = (
        'status',
        'fulfilment_method',
        'inventory_deducted',
        'created_at',
    )
    ordering = ('-created_at',)
    inlines = [OrderItemInline, DeliveryAgreementInline, OrderEventInline, OrderIssueReportInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'order',
        'seller_order',
        'product',
        'product_title_snapshot',
        'seller',
        'quantity',
        'unit_price_snapshot',
        'total_price',
    )
    search_fields = (
        'product__title',
        'product_title_snapshot',
        'seller__email',
        'order__order_number',
        'seller_order__suborder_number',
    )


@admin.register(SellerDeliverySettings)
class SellerDeliverySettingsAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'seller',
        'delivery_coverage',
        'delivery_fee_type',
        'base_delivery_fee',
        'preparation_time',
        'updated_at',
    )
    search_fields = ('seller__email', 'seller__full_name', 'collection_location')
    list_filter = ('delivery_coverage', 'delivery_fee_type', 'preparation_time')


@admin.register(BuyerDeliveryPreferences)
class BuyerDeliveryPreferencesAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'buyer',
        'preferred_university',
        'campus_location',
        'hostel_room',
        'preferred_contact_method',
        'updated_at',
    )
    search_fields = ('buyer__email', 'buyer__full_name', 'hostel_room', 'campus_location')
    list_filter = ('preferred_contact_method',)


@admin.register(DeliveryAgreement)
class DeliveryAgreementAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'seller_order',
        'proposed_by',
        'fulfilment_method',
        'proposed_fee',
        'status',
        'created_at',
    )
    search_fields = (
        'seller_order__suborder_number',
        'proposed_by__email',
    )
    list_filter = ('status', 'fulfilment_method', 'created_at')


@admin.register(OrderEvent)
class OrderEventAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'seller_order',
        'event_type',
        'from_status',
        'to_status',
        'actor',
        'created_at',
    )
    search_fields = (
        'seller_order__suborder_number',
        'actor__email',
        'event_type',
        'description',
    )
    list_filter = ('event_type', 'created_at')


@admin.register(OrderIssueReport)
class OrderIssueReportAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'seller_order',
        'reported_by',
        'issue_type',
        'status',
        'created_at',
    )
    search_fields = (
        'seller_order__suborder_number',
        'reported_by__email',
        'description',
        'admin_notes',
    )
    list_filter = ('status', 'issue_type', 'created_at')
