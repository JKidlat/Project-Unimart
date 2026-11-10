from django.contrib import admin
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Profile, KYCSubmission

User = get_user_model()


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'is_active', 'is_staff', 'is_email_verified', 'is_verified_student', 'firebase_uid')
    search_fields = ('email', 'full_name', 'firebase_uid')
    list_filter = ('is_active', 'is_staff', 'is_email_verified', 'is_verified_student')
    ordering = ('email',)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'university', 'is_vendor', 'business_name', 'referral_code', 'referrals_count')
    search_fields = ('user__email', 'business_name', 'referral_code')
    list_filter = ('is_vendor', 'university')


@admin.register(KYCSubmission)
class KYCSubmissionAdmin(admin.ModelAdmin):
    list_display = ('user', 'email', 'mode', 'status', 'submitted_at', 'reviewed_at')
    search_fields = ('email', 'user__email', 'institution_email', 'business_name')
    list_filter = ('status', 'mode', 'submitted_at')
    actions = ['approve_submissions', 'reject_submissions']

    @admin.action(description="Approve selected KYC submissions (Upgrade to Seller)")
    def approve_submissions(self, request, queryset):
        for sub in queryset:
            sub.status = 'approved'
            sub.reviewed_at = timezone.now()
            sub.save(update_fields=['status', 'reviewed_at'])
            if hasattr(sub.user, 'profile'):
                sub.user.profile.is_vendor = True
                sub.user.profile.save(update_fields=['is_vendor'])

    @admin.action(description="Reject selected KYC submissions")
    def reject_submissions(self, request, queryset):
        queryset.update(status='rejected', reviewed_at=timezone.now(), rejection_reason='Rejected by administrator.')

