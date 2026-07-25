from django.contrib import admin
from .models import University


# Register your models here.
@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = ('name', 'short_name', 'created_at')
    search_fields = ('name', 'short_name')
    ordering = ('name',)