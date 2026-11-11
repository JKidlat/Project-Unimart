from django.db import transaction
from django.db.models import Q, Sum
from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.media import normalize_public_image_url
from .models import Profile, KYCSubmission, RoleChangeRequest
from universities.models import University
from universities.catalog import resolve_university_by_text

User = get_user_model()


def _resolve_university(university_id=None, university_name=''):
    """Look up an existing University by ID, exact name/short_name, '(CODE)', or canonical alias."""
    return resolve_university_by_text(University, university_id=university_id, university_name=university_name)


class UserProfileSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source='profile.university.name', read_only=True, default='')
    university_short_name = serializers.CharField(source='profile.university.short_name', read_only=True, default='')
    university_id = serializers.IntegerField(source='profile.university.id', read_only=True, default=None)
    is_vendor = serializers.BooleanField(source='profile.is_vendor', read_only=True, default=False)
    business_name = serializers.CharField(source='profile.business_name', read_only=True, default='')
    profile_pic = serializers.SerializerMethodField()
    referral_code = serializers.CharField(source='profile.referral_code', read_only=True, default='')
    referrals_count = serializers.IntegerField(source='profile.referrals_count', read_only=True, default=0)
    role = serializers.SerializerMethodField()
    orders_count = serializers.SerializerMethodField()
    wishlist_count = serializers.SerializerMethodField()
    cart_count = serializers.SerializerMethodField()
    unread_messages_count = serializers.SerializerMethodField()
    support_tickets_count = serializers.SerializerMethodField()
    kyc_status = serializers.SerializerMethodField()
    has_firebase_linked = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'phone_number', 'is_active', 'is_staff', 'is_superuser',
            'is_email_verified', 'is_verified_student', 'date_joined', 'last_login',
            'university_id', 'university_name', 'university_short_name',
            'is_vendor', 'business_name', 'role', 'profile_pic', 'referral_code',
            'referrals_count', 'orders_count', 'wishlist_count', 'cart_count',
            'unread_messages_count', 'support_tickets_count', 'kyc_status',
            'has_firebase_linked',
        ]

    def get_profile_pic(self, obj):
        request = self.context.get('request') if hasattr(self, 'context') else None
        raw = getattr(getattr(obj, 'profile', None), 'profile_pic', None)
        return normalize_public_image_url(raw, request=request)

    def get_has_firebase_linked(self, obj):
        return bool(getattr(obj, 'firebase_uid', None))

    def get_role(self, obj):
        if obj.is_staff or obj.is_superuser:
            return 'Admin'
        try:
            return 'Seller' if obj.profile.is_vendor else 'Buyer'
        except Exception:
            return 'Buyer'

    def get_orders_count(self, obj):
        try:
            return obj.orders_made.count()
        except Exception:
            return 0

    def get_wishlist_count(self, obj):
        try:
            return obj.wishlist_items.count()
        except Exception:
            return 0

    def get_cart_count(self, obj):
        try:
            total = obj.cart_items.aggregate(total=Sum('quantity'))['total']
            return int(total or 0)
        except Exception:
            return 0

    def get_unread_messages_count(self, obj):
        try:
            from messaging.models import Message
            return (
                Message.objects.filter(
                    Q(conversation__buyer=obj) | Q(conversation__seller=obj),
                    is_read=False,
                )
                .exclude(sender=obj)
                .count()
            )
        except Exception:
            return 0

    def get_support_tickets_count(self, obj):
        try:
            return obj.support_tickets.count()
        except Exception:
            return 0

    def get_kyc_status(self, obj):
        try:
            sub = obj.kyc_submissions.first()
            return sub.status if sub else 'none'
        except Exception:
            return 'none'



class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    university_id = serializers.IntegerField(required=False, allow_null=True)
    university = serializers.CharField(required=False, allow_blank=True)
    business_name = serializers.CharField(required=False, allow_blank=True)
    is_vendor = serializers.BooleanField(required=False)
    role = serializers.CharField(required=False)
    profile_pic = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=1000)

    def validate_profile_pic(self, value):
        if value and str(value).strip().lower().startswith('blob:'):
            raise serializers.ValidationError("Please upload the image file instead of a temporary browser URL.")
        return value

    def update(self, instance, validated_data):
        user = instance
        if 'full_name' in validated_data:
            user.full_name = validated_data['full_name']
        if 'phone_number' in validated_data:
            user.phone_number = validated_data['phone_number']
        user.save()

        profile, _ = Profile.objects.get_or_create(user=user)
        if 'university_id' in validated_data:
            uni_id = validated_data['university_id']
            profile.university = University.objects.filter(id=uni_id).first() if uni_id else None
        elif 'university' in validated_data and validated_data['university']:
            resolved = _resolve_university(university_name=validated_data['university'])
            if resolved:
                profile.university = resolved

        # Prevent unauthorized role elevation (Buyer -> Seller or -> Admin) via profile updates.
        # Only existing sellers, KYC-approved users, or staff may hold vendor status.
        requested_vendor = None
        if 'role' in validated_data:
            role_lower = str(validated_data['role']).strip().lower()
            if role_lower in ('admin', 'super admin', 'superadmin', 'staff'):
                if not (user.is_staff or user.is_superuser):
                    raise serializers.ValidationError({'role': 'Administrator privileges cannot be self-assigned.'})
            elif role_lower == 'seller':
                requested_vendor = True
            elif role_lower == 'buyer':
                requested_vendor = False
            else:
                raise serializers.ValidationError({'role': 'Invalid role specified.'})
        elif 'is_vendor' in validated_data:
            requested_vendor = bool(validated_data['is_vendor'])

        if requested_vendor is not None:
            if not requested_vendor:
                profile.is_vendor = False
            elif user.is_staff or user.is_superuser or profile.is_vendor or user.kyc_submissions.filter(status='approved').exists():
                profile.is_vendor = True
            else:
                raise serializers.ValidationError(
                    {'role': 'Seller privileges require Seller registration or approved KYC verification.'}
                )

        if 'business_name' in validated_data and (profile.is_vendor or user.is_staff):
            profile.business_name = validated_data['business_name'].strip()
        if 'profile_pic' in validated_data:
            profile.profile_pic = validated_data['profile_pic']
        profile.save()

        return user


class RegisterSerializer(serializers.Serializer):
    """
    Serializer for user registration.
    Enforces strong password validation, email normalization, descriptive validation errors,
    and strict role constraints.
    """
    email = serializers.EmailField(
        required=True,
        error_messages={
            "required": "Please enter your email address.",
            "blank": "Please enter your email address.",
            "invalid": "Please enter a valid email address.",
        },
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        error_messages={
            "required": "Please enter a password.",
            "blank": "Please enter a password.",
            "min_length": "Password must contain at least 8 characters.",
        },
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
    )
    full_name = serializers.CharField(required=False, allow_blank=True, default='')
    phone_number = serializers.CharField(required=False, allow_blank=True, default='')
    university_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    university = serializers.CharField(required=False, allow_blank=True, default='')
    is_vendor = serializers.BooleanField(required=False, default=False)
    role = serializers.CharField(required=False, default='Buyer')
    business_name = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    referral_code = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_role(self, value):
        clean = str(value).strip().title()
        # Prevent privilege escalation during registration
        if clean not in ['Buyer', 'Seller']:
            return 'Buyer'
        return clean

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return normalized

    def validate_university_id(self, value):
        if value is not None and not University.objects.filter(id=value).exists():
            raise serializers.ValidationError("Selected university does not exist.")
        return value

    def validate(self, attrs):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        raw_email = attrs.get("email", "")
        raw_name = (attrs.get("full_name") or "").strip()
        password = attrs.get("password") or ""
        confirm_password = self.initial_data.get("confirm_password")

        if confirm_password is not None and password != str(confirm_password):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # If client supplied full_name/phone_number/university keys explicitly, reject blanks clearly
        if "full_name" in self.initial_data and not raw_name:
            raise serializers.ValidationError({"full_name": "Full name is required."})
        if "phone_number" in self.initial_data and not (attrs.get("phone_number") or "").strip():
            raise serializers.ValidationError({"phone_number": "Phone number is required."})
        if (
            ("university_id" in self.initial_data or "university" in self.initial_data)
            and not attrs.get("university_id")
            and not (attrs.get("university") or "").strip()
        ):
            raise serializers.ValidationError({"university": "Please select your university."})

        role_val = attrs.get("role", "Buyer")
        is_vendor = bool(attrs.get("is_vendor")) or role_val.lower() == "seller"
        if is_vendor and "business_name" in self.initial_data and not (attrs.get("business_name") or "").strip():
            raise serializers.ValidationError({"business_name": "Business or store name is required for seller accounts."})

        temp_user = User(email=raw_email)
        temp_user.full_name = raw_name
        try:
            validate_password(password, user=temp_user)
        except DjangoValidationError as exc:
            friendly_msgs = []
            for msg in exc.messages:
                lower = msg.lower()
                if "too short" in lower:
                    friendly_msgs.append("Password must contain at least 8 characters.")
                elif "too common" in lower:
                    friendly_msgs.append("Password is too common. Choose a stronger mix of letters, numbers, and symbols.")
                elif "entirely numeric" in lower:
                    friendly_msgs.append("Password cannot be all numbers. Include letters or symbols.")
                elif "too similar" in lower:
                    friendly_msgs.append("Password is too similar to your name or email address. Choose a more distinct password.")
                else:
                    friendly_msgs.append(msg)
            raise serializers.ValidationError({"password": friendly_msgs})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data["email"]
        password = validated_data["password"]
        full_name = validated_data.get("full_name", "")
        phone_number = validated_data.get("phone_number", "")
        university_id = validated_data.get("university_id")
        university_name = validated_data.get("university", "")
        business_name = (validated_data.get("business_name") or "").strip()

        is_vendor = validated_data.get("is_vendor", False)
        role = validated_data.get("role", "Buyer")
        if role.lower() == 'seller':
            is_vendor = True

        user = User.objects.create_user(
            email=email,
            password=password
        )
        user.full_name = full_name
        user.phone_number = phone_number
        user.save()

        uni_instance = _resolve_university(university_id=university_id, university_name=university_name)
        Profile.objects.create(
            user=user,
            university=uni_instance,
            is_vendor=is_vendor,
            business_name=business_name if is_vendor else '',
        )

        ref_code = validated_data.get("referral_code", "").strip()
        if ref_code:
            referrer_profile = Profile.objects.filter(referral_code__iexact=ref_code).first()
            if referrer_profile and referrer_profile.user != user:
                referrer_profile.referrals_count += 1
                referrer_profile.save(update_fields=['referrals_count'])

        return user


class KYCSubmissionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(required=False)
    selfieBase64 = serializers.CharField(source='selfie_url', required=False, allow_blank=True)

    idDocBase64 = serializers.CharField(source='id_doc_url', required=False, allow_blank=True)
    institutionEmail = serializers.EmailField(source='institution_email', required=False, allow_blank=True)
    businessName = serializers.CharField(source='business_name', required=False, allow_blank=True)
    rejectionReason = serializers.CharField(source='rejection_reason', required=False, allow_null=True)
    submittedAt = serializers.DateTimeField(source='submitted_at', read_only=True)
    reviewedAt = serializers.DateTimeField(source='reviewed_at', read_only=True)

    class Meta:
        model = KYCSubmission
        fields = [
            'id', 'user_email', 'user_name', 'email', 'institutionEmail', 'businessName',
            'selfieBase64', 'idDocBase64', 'mode', 'status', 'rejectionReason',
            'submittedAt', 'reviewedAt'
        ]
        read_only_fields = ['id', 'user_email', 'user_name', 'status', 'submittedAt', 'reviewedAt']


class KYCAdminReviewSerializer(KYCSubmissionSerializer):
    """Admin-only serializer allowing status and rejection feedback updates on KYC submissions."""
    status = serializers.ChoiceField(choices=KYCSubmission.STATUS_CHOICES, required=False)

    class Meta(KYCSubmissionSerializer.Meta):
        read_only_fields = ['id', 'user_email', 'user_name', 'submittedAt', 'reviewedAt']


class RoleChangeRequestSerializer(serializers.ModelSerializer):
    userEmail = serializers.EmailField(source='user.email', read_only=True)
    userName = serializers.CharField(source='user.full_name', read_only=True)
    currentRole = serializers.CharField(source='current_role', read_only=True)
    requestedRole = serializers.ChoiceField(source='requested_role', choices=[('Buyer', 'Buyer'), ('Seller', 'Seller')])
    adminNote = serializers.CharField(source='admin_note', required=False, allow_blank=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    reviewedAt = serializers.DateTimeField(source='reviewed_at', read_only=True)

    class Meta:
        model = RoleChangeRequest
        fields = [
            'id', 'userEmail', 'userName', 'currentRole', 'requestedRole',
            'reason', 'status', 'adminNote', 'createdAt', 'reviewedAt',
        ]
        read_only_fields = ['id', 'userEmail', 'userName', 'currentRole', 'status', 'createdAt', 'reviewedAt']
