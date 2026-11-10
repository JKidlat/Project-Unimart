"""
Authentication views for user registration, profile retrieval/update, and logout.
"""

from rest_framework import generics, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from core.permissions import IsEmailVerifiedForWrite
from universities.models import University
from .authentication import verify_firebase_token
from .emails import (
    send_password_reset_email,
    send_verification_email,
    verify_email_verification_token,
)
from .models import KYCSubmission, Profile
from .serializers import RegisterSerializer, UserProfileSerializer, ProfileUpdateSerializer, KYCSubmissionSerializer


User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer returning tokens wrapped with full user profile payload.
    Supports both standard DRF JWT clients and the Unimart frontend format.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        user_data = UserProfileSerializer(self.user).data
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
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = 'auth'


def _issue_jwt_response(user, message, status_code=status.HTTP_200_OK, **extra):
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
        'user': UserProfileSerializer(user).data,
    }
    payload.update(extra)
    return Response(payload, status=status_code)


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account and return JWT tokens + profile data.
    Sends an email verification link asynchronously/best-effort without blocking signup.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        verification_sent = send_verification_email(user)
        return _issue_jwt_response(
            user,
            'Account created successfully. Please verify your email address.',
            status_code=status.HTTP_201_CREATED,
            verification_email_sent=verification_sent,
        )


class GoogleAuthView(generics.GenericAPIView):
    """
    Exchange a verified Firebase Google ID token for Unimart SimpleJWT tokens.
    """
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        id_token = request.data.get('id_token') or request.data.get('token')
        if not id_token:
            return Response({'error': 'Google ID token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_token = verify_firebase_token(id_token)
        except AuthenticationFailed as exc:
            return Response({'error': str(exc.detail)}, status=status.HTTP_401_UNAUTHORIZED)

        email = (decoded_token.get('email') or '').strip().lower()
        email_verified = bool(decoded_token.get('email_verified', False))
        full_name = (decoded_token.get('name') or '').strip()
        picture = (decoded_token.get('picture') or '').strip()

        if not email or not email_verified:
            return Response(
                {'error': 'A verified Google email address is required to sign in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        university_id = request.data.get('university_id')
        requested_role = str(request.data.get('role') or 'Buyer').strip().lower()
        referral_code = str(request.data.get('referral_code') or '').strip()

        with transaction.atomic():
            user = User.objects.filter(email__iexact=email).first()
            is_new_user = user is None

            if is_new_user:
                user = User.objects.create(
                    email=email,
                    full_name=full_name,
                    is_email_verified=True,
                )
                user.set_unusable_password()
                user.save()

                uni_instance = University.objects.filter(id=university_id).first() if university_id else None
                profile = Profile.objects.create(
                    user=user,
                    university=uni_instance,
                    is_vendor=(requested_role == 'seller'),
                    profile_pic=picture or None,
                )
                if referral_code:
                    referrer = Profile.objects.filter(referral_code__iexact=referral_code).first()
                    if referrer and referrer.user != user:
                        referrer.referrals_count += 1
                        referrer.save(update_fields=['referrals_count'])
            else:
                if not user.is_active:
                    return Response(
                        {'error': 'This account has been deactivated.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                update_fields = []
                if not user.is_email_verified:
                    user.is_email_verified = True
                    update_fields.append('is_email_verified')
                if full_name and not user.full_name:
                    user.full_name = full_name
                    update_fields.append('full_name')
                if update_fields:
                    user.save(update_fields=update_fields)

                profile, _ = Profile.objects.get_or_create(user=user)
                if picture and not profile.profile_pic:
                    profile.profile_pic = picture
                    profile.save(update_fields=['profile_pic'])

        return _issue_jwt_response(
            user,
            'Signed in with Google successfully.',
            is_new_user=is_new_user,
        )


class VerifyEmailView(generics.GenericAPIView):
    """
    Verify a user's email address using a signed verification token.
    """
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
            'user': UserProfileSerializer(user).data,
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

        sent = send_verification_email(user)
        return Response({
            'message': 'Verification email sent. Please check your inbox.' if sent else 'Verification email queued; please verify email configuration.',
            'sent': sent,
        })


class PasswordResetRequestView(generics.GenericAPIView):
    """
    Initiate a password reset by emailing a time-limited single-use reset link.
    Always returns HTTP 200 to prevent account enumeration.
    """
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
        return Response(UserProfileSerializer(instance).data)


class UserListView(generics.ListAPIView):
    """
    Admin user listing endpoint.
    Restricted to staff and admin users to protect student privacy.
    """
    queryset = User.objects.all().select_related('profile', 'profile__university')
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdminUser]


class KYCSubmissionView(generics.ListCreateAPIView):
    """
    List user KYC submissions or submit new verification documents.
    Admin gets all submissions (with optional ?email= filter); normal users see their own.
    """
    serializer_class = KYCSubmissionSerializer

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
    serializer_class = KYCSubmissionSerializer
    permission_classes = [IsAdminUser]

    def get_object(self):
        lookup = self.kwargs.get('lookup')
        if str(lookup).isdigit():
            return generics.get_object_or_404(KYCSubmission, id=int(lookup))
        return generics.get_object_or_404(KYCSubmission, email=lookup)

    def perform_update(self, serializer):
        instance = serializer.save(reviewed_at=timezone.now())
        if instance.status == 'approved':
            profile = getattr(instance.user, 'profile', None)
            if profile:
                profile.is_vendor = True
                profile.save(update_fields=['is_vendor'])


