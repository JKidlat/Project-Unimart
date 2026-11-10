from django.contrib import admin
from .models import University


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ('name', 'short_name', 'category', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'short_name')
    ordering = ('name',)
