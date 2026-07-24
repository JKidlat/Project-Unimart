from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'seller', 'university', 'price', 'product_type', 'is_available', 'created_at')
    search_fields = ('title', 'description', 'seller__email')
    list_filter = ('product_type', 'is_available', 'university')
    ordering = ('-created_at',)
