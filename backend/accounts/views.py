"""
Authentication views for user registration, profile retrieval/update, and logout.
"""

import hashlib
import uuid
from django.db import transaction
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import BlacklistedToken, OutstandingToken, RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from core.media import store_uploaded_image
from core.models import AccountDeletionAudit
from core.permissions import IsEmailVerifiedForWrite, IsPlatformAdmin
from .authentication import FirebaseAccountError, resolve_existing_firebase_user, verify_firebase_token
from .emails import (
    send_password_reset_email,
    send_verification_email,
    send_verification_email_detailed,
    verify_email_verification_token,
)
from .models import KYCSubmission, Profile, RoleChangeRequest
from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    ProfileUpdateSerializer,
    KYCSubmissionSerializer,
    KYCAdminReviewSerializer,
    RoleChangeRequestSerializer,
)


User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer returning tokens wrapped with full user profile payload.
    Supports both standard DRF JWT clients and the Unimart frontend format.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        user_data = UserProfileSerializer(self.user, context=self.context).data
        data['tokens'] = {
            'access': data['access'],
            'refresh': data['refresh'],
        }
        data['user'] = user_data
        data['message'] = 'Login successful.'
        return data


class LoginView(TokenObtainPairView):
    """
    Login endpoint that issues JWT tokens and returns the authenticated user profile.
    Protected by 'auth' rate limiting to mitigate brute-force attempts.
    """
    authentication_classes = []
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = 'auth'


def _issue_jwt_response(user, message, status_code=status.HTTP_200_OK, request=None, **extra):
    """Build a consistent SimpleJWT + UserProfileSerializer response payload."""
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    refresh_str = str(refresh)
    payload = {
        'message': message,
        'access': access,
        'refresh': refresh_str,
        'tokens': {
            'access': access,
            'refresh': refresh_str,
        },
        'user': UserProfileSerializer(user, context={'request': request} if request else {}).data,
    }
    payload.update(extra)
    return Response(payload, status=status_code)


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account and return JWT tokens + profile data.
    Sends an email verification link asynchronously/best-effort without blocking signup.
    """
    authentication_classes = []
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        verification_sent, verification_error = send_verification_email_detailed(user)
        extra = {'verification_email_sent': verification_sent}
        if not verification_sent and verification_error:
            extra['verification_email_error'] = verification_error
        return _issue_jwt_response(
            user,
            'Account created successfully. Please verify your email address.',
            status_code=status.HTTP_201_CREATED,
            request=request,
            **extra,
        )


def _authenticate_with_google(request, password=None):
    """Shared handler verifying a Firebase ID token strictly against existing Unimart users."""
    id_token = request.data.get('id_token') or request.data.get('token')
    if not id_token:
        return Response({'error': 'Google ID token is required.', 'code': 'MISSING_TOKEN'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        decoded_token = verify_firebase_token(id_token)
    except AuthenticationFailed as exc:
        return Response({'error': str(exc.detail), 'code': 'INVALID_TOKEN'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user, linked_now = resolve_existing_firebase_user(decoded_token, password=password)
    except FirebaseAccountError as exc:
        body = {'error': exc.message, 'code': exc.code}
        if exc.email:
            body['email'] = exc.email
        return Response(body, status=exc.status_code)

    return _issue_jwt_response(
        user,
        'Google account linked and signed in successfully.' if linked_now else 'Signed in with Google successfully.',
        request=request,
        linked_now=linked_now,
    )


class GoogleAuthView(generics.GenericAPIView):
    """
    Authenticate an EXISTING Unimart user via a verified Firebase Google ID token.
    Never creates accounts or bypasses registration; unregistered identities receive HTTP 404.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        return _authenticate_with_google(request)


class GoogleAccountLinkView(generics.GenericAPIView):
    """
    Explicitly link a verified Google Firebase identity to an existing Unimart password account
    after confirming the account's current password.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        password = request.data.get('password')
        if not password:
            return Response(
                {'error': 'Your Unimart password is required to link your Google account.', 'code': 'PASSWORD_REQUIRED'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return _authenticate_with_google(request, password=password)


class VerifyEmailView(generics.GenericAPIView):
    """
    Verify a user's email address using a signed verification token.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        token = (request.data.get('token') or '').strip()
        user = verify_email_verification_token(token)
        if not user:
            return Response(
                {'error': 'Verification link is invalid or has expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=['is_email_verified'])

        return Response({
            'message': 'Your email address has been verified successfully.',
            'user': UserProfileSerializer(user, context={'request': request}).data,
        })


class ResendVerificationEmailView(generics.GenericAPIView):
    """
    Re-send the email verification link to the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    throttle_scope = 'auth'

    def post(self, request):
        user = request.user
        if user.is_email_verified:
            return Response({
                'message': 'Your email address is already verified.',
                'already_verified': True,
            })

        sent, detail = send_verification_email_detailed(user)
        if not sent:
            return Response(
                {
                    'error': f'Failed to send verification email: {detail}',
                    'sent': False,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({
            'message': 'Verification email sent. Please check your inbox.',
            'sent': True,
        })


class PasswordResetRequestView(generics.GenericAPIView):
    """
    Initiate a password reset by emailing a time-limited single-use reset link.
    Always returns HTTP 200 to prevent account enumeration.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            send_password_reset_email(user)

        return Response({
            'message': 'If an account exists with that email, a password reset link has been sent.',
        })


class PasswordResetConfirmView(generics.GenericAPIView):
    """
    Validate uid + token from password reset email and set a new password.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        uid = (request.data.get('uid') or '').strip()
        token = (request.data.get('token') or '').strip()
        new_password = request.data.get('new_password') or ''

        if not uid or not token or not new_password:
            return Response(
                {'error': 'UID, reset token, and new password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk, is_active=True)
        except Exception:
            user = None

        if not user or not default_token_generator.check_token(user, token):
            return Response(
                {'error': 'Password reset link is invalid or has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({'error': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        # Clicking a valid email-delivered reset token also proves email ownership.
        user.is_email_verified = True
        user.save(update_fields=['password', 'is_email_verified'])

        return Response({'message': 'Password has been reset successfully. You can now sign in.'})


class LogoutView(generics.GenericAPIView):
    """
    Logout view to invalidate refresh tokens.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            token = RefreshToken(refresh_token)
            try:
                token.blacklist()
            except AttributeError:
                pass
            
            return Response(
                {'message': 'Successfully logged out.'},
                status=status.HTTP_200_OK
            )
        except TokenError:
            return Response(
                {'error': 'Invalid refresh token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception:
            return Response(
                {'error': 'An error occurred during logout.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update the logged-in user's profile.
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProfileUpdateSerializer
        return UserProfileSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Return refreshed full profile
        return Response(UserProfileSerializer(instance, context={'request': request}).data)


class UserListView(generics.ListAPIView):
    """
    Admin user listing endpoint.
    Restricted to staff and admin users to protect student privacy.
    """
    queryset = User.objects.all().select_related('profile', 'profile__university').order_by('-date_joined', '-id')
    serializer_class = UserProfileSerializer
    permission_classes = [IsPlatformAdmin]


class KYCSubmissionView(generics.ListCreateAPIView):
    """
    List user KYC submissions or submit new verification documents.
    Admin gets all submissions (with optional ?email= filter); normal users see their own.
    """
    serializer_class = KYCSubmissionSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsEmailVerifiedForWrite()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            email_filter = self.request.query_params.get('email')
            if email_filter:
                return KYCSubmission.objects.filter(email=email_filter)
            return KYCSubmission.objects.all()
        return KYCSubmission.objects.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        # Strict user-binding: always bind KYC to authenticated user's email
        serializer.save(user=user, email=user.email, status='pending')


class KYCDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update KYC verification status (Admin only).
    Supports lookup by integer primary key or by user email string.
    When status transitions to 'approved', automatically upgrades user to Seller (is_vendor=True).
    """
    queryset = KYCSubmission.objects.all()
    serializer_class = KYCAdminReviewSerializer
    permission_classes = [IsPlatformAdmin]

    def get_object(self):
        lookup = self.kwargs.get('lookup')
        if str(lookup).isdigit():
            return generics.get_object_or_404(KYCSubmission, id=int(lookup))
        return KYCSubmission.objects.filter(email=lookup).order_by('-submitted_at').first() or generics.get_object_or_404(KYCSubmission, email=lookup)

    def perform_update(self, serializer):
        instance = serializer.save(reviewed_at=timezone.now())
        if instance.status == 'approved':
            profile = getattr(instance.user, 'profile', None)
            if profile:
                update_fields = ['is_vendor']
                profile.is_vendor = True
                if instance.business_name and not profile.business_name:
                    profile.business_name = instance.business_name
                    update_fields.append('business_name')
                profile.save(update_fields=update_fields)
            if not instance.user.is_verified_student:
                instance.user.is_verified_student = True
                instance.user.save(update_fields=['is_verified_student'])


class ChangePasswordView(generics.GenericAPIView):
    """Allow an authenticated user (including administrators) to change their password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password') or ''
        new_password = request.data.get('new_password') or ''
        if not current_password or not new_password:
            return Response(
                {'error': 'Current password and new password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user
        if not user.check_password(current_password):
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({'error': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'message': 'Password updated successfully.'})


class UserRoleChangeRequestView(generics.ListCreateAPIView):
    """List current user's role change requests or submit a Buyer <-> Seller change request."""
    serializer_class = RoleChangeRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RoleChangeRequest.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'requestedRole': 'Administrator accounts cannot use student role switch requests.'})
        is_vendor = bool(getattr(getattr(user, 'profile', None), 'is_vendor', False))
        current_role = 'Seller' if is_vendor else 'Buyer'
        serializer.save(user=user, current_role=current_role, status='pending')


class AvatarUploadView(APIView):
    """Upload and permanently persist a profile picture for the authenticated user."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file') or request.FILES.get('avatar') or request.FILES.get('image')
        if not file_obj:
            return Response(
                {'error': 'Please choose an image file (JPG, PNG, WebP, or GIF) to upload.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stored = store_uploaded_image(file_obj, request, user=request.user, kind='avatar')
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.profile_pic = stored['url']
        profile.save(update_fields=['profile_pic'])

        return Response(
            {
                'message': 'Profile picture updated successfully.',
                'profile_pic': stored['url'],
                'user': UserProfileSerializer(request.user, context={'request': request}).data,
            },
            status=status.HTTP_200_OK,
        )


class DeleteAccountView(APIView):
    """
    Authorized self-service account deletion under Ghana Data Protection Act (Act 843).
    Requires verifying the authenticated user's password (or email confirmation for
    passwordless Google accounts), revokes all JWT tokens, removes personal records,
    and deletes the user or anonymizes/deactivates when financial ledger rows exist.
    """

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user
        reason = (request.data.get('reason') or '').strip()

        if user.is_superuser:
            other_active_superusers = User.objects.filter(is_superuser=True, is_active=True).exclude(pk=user.pk).exists()
            if not other_active_superusers:
                return Response(
                    {'error': 'Cannot delete the only remaining superuser account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if user.has_usable_password():
            password = request.data.get('password') or request.data.get('current_password') or ''
            if not password:
                return Response(
                    {'error': 'Please enter your current password to confirm account deletion.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not user.check_password(password):
                return Response(
                    {'error': 'Incorrect password. Account deletion could not be authorized.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            confirm_email = (request.data.get('confirm_email') or '').strip().lower()
            if confirm_email != user.email.lower():
                return Response(
                    {'error': 'Please enter your exact account email address to confirm account deletion.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Blacklist all active refresh tokens issued to this account
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)

        from marketplace.models import CartItem, Product, WishlistItem
        from orders.models import Order, OrderItem
        from payments.models import Payment

        has_orders = (
            Order.objects.filter(buyer=user).exists()
            or OrderItem.objects.filter(seller=user).exists()
            or Payment.objects.filter(user=user).exists()
        )

        # Remove private shopping & verification artifacts
        CartItem.objects.filter(user=user).delete()
        WishlistItem.objects.filter(user=user).delete()
        KYCSubmission.objects.filter(user=user).delete()
        RoleChangeRequest.objects.filter(user=user).delete()

        # Remove unpurchased listings; hide any listings referenced by OrderItem ledger rows
        user_products = Product.objects.filter(seller=user)
        for product in user_products:
            if OrderItem.objects.filter(product=product).exists():
                product.status = 'hidden'
                product.is_available = False
                product.stock = 0
                product.save(update_fields=['status', 'is_available', 'stock', 'updated_at'])
            else:
                product.delete()

        email_hash = hashlib.sha256(user.email.strip().lower().encode('utf-8')).hexdigest()
        AccountDeletionAudit.objects.create(
            deleted_user_id=user.id,
            email_sha256=email_hash,
            reason=reason,
            had_transactions=has_orders,
        )

        if has_orders:
            # Preserve financial/order ledger referential integrity while erasing all PII
            profile = getattr(user, 'profile', None)
            if profile:
                profile.profile_pic = None
                profile.business_name = ''
                profile.university = None
                profile.is_vendor = False
                profile.save()
            user.is_active = False
            user.is_staff = False
            user.is_superuser = False
            user.is_verified_student = False
            user.is_email_verified = False
            user.full_name = 'Deleted User'
            user.phone_number = ''
            user.firebase_uid = None
            user.email = f'deleted-{user.id}-{uuid.uuid4().hex[:8]}@anonymized.unimart.invalid'
            user.set_unusable_password()
            user.save()
            mode = 'anonymized'
        else:
            user.delete()
            mode = 'deleted'

        return Response(
            {
                'message': 'Your account has been permanently deleted and your personal information removed.',
                'mode': mode,
            },
            status=status.HTTP_200_OK,
        )


