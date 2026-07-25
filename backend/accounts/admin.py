from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import Profile

User = get_user_model()


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'is_active', 'is_staff', 'is_verified_student')
    search_fields = ('email',)
    list_filter = ('is_active', 'is_staff', 'is_verified_student')
    ordering = ('email',)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'university', 'is_vendor')
    search_fields = ('user__email',)
    list_filter = ('is_vendor', 'university')
