from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('reference', 'user', 'order', 'amount', 'channel', 'status', 'created_at')
    search_fields = ('reference', 'user__email', 'order__id')
    list_filter = ('status', 'channel', 'created_at')
    ordering = ('-created_at',)

