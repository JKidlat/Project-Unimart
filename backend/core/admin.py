from django.contrib import admin
from .models import AccountDeletionAudit, MediaAsset, SupportMessage, SupportTicket

admin.site.register(MediaAsset)
admin.site.register(SupportTicket)
admin.site.register(SupportMessage)
admin.site.register(AccountDeletionAudit)
