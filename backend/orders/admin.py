from django.contrib import admin
from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'buyer', 'seller', 'product', 'quantity', 'total_price', 'status', 'created_at')
    search_fields = ('buyer__email', 'seller__email', 'product__title')
    list_filter = ('status', 'created_at')
    ordering = ('-created_at',)
