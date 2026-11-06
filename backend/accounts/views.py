"""
Authentication views for user registration, profile retrieval/update, and logout.
"""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
from .models import KYCSubmission
from .serializers import RegisterSerializer, UserProfileSerializer, ProfileUpdateSerializer, KYCSubmissionSerializer
from django.contrib.auth import get_user_model


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
    """
    serializer_class = CustomTokenObtainPairSerializer



class RegisterView(generics.CreateAPIView):
    """
    Register a new user account and return JWT tokens + profile data.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Issue JWT tokens directly upon signup
        refresh = RefreshToken.for_user(user)
        user_data = UserProfileSerializer(user).data

        return Response(
            {
                'message': 'Account created successfully.',
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                },
                'user': user_data
            },
            status=status.HTTP_201_CREATED
        )


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
    permission_classes = [IsAuthenticated]

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
        email = serializer.validated_data.get('email') or user.email
        serializer.save(user=user, email=email, status='pending')


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


