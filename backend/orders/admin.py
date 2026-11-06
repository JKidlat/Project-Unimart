from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'buyer',
        'full_name',
        'total_amount',
        'status',
        'created_at',
    )
    search_fields = (
        'buyer__email',
        'full_name',
        'payment_reference',
    )
    list_filter = ('status', 'created_at')
    ordering = ('-created_at',)
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'order',
        'product',
        'seller',
        'quantity',
        'total_price',
    )
    search_fields = ('product__title', 'seller__email')