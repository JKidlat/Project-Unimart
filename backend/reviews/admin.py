from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'product', 'rating', 'created_at')
    search_fields = ('user__email', 'product__title')
    list_filter = ('rating', 'created_at')
    ordering = ('-created_at',)
