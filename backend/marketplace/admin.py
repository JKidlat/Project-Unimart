from django.contrib import admin
from .models import Product, Category, WishlistItem


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'icon', 'color', 'created_at')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'seller', 'category', 'university', 'price', 'product_type', 'is_available', 'created_at')
    search_fields = ('title', 'description', 'seller__email')
    list_filter = ('category', 'product_type', 'is_available', 'university')
    ordering = ('-created_at',)


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'created_at')
    search_fields = ('user__email', 'product__title')
    ordering = ('-created_at',)


