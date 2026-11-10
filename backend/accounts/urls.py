"""
URL configuration for accounts app.

Authentication endpoints:
- POST /login/ - Obtain JWT tokens (access + refresh)
- POST /token/refresh/ - Refresh access token using refresh token
- POST /register/ - Register new user account
- POST /logout/ - Invalidate refresh token
"""

from django.urls import path
from .views import (
    GoogleAccountLinkView,
    GoogleAuthView,
    LoginView,
    RegisterView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ResendVerificationEmailView,
    UserProfileView,
    UserListView,
    VerifyEmailView,
    KYCSubmissionView,
    KYCDetailView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("google/", GoogleAuthView.as_view(), name="google_auth"),
    path("google/link/", GoogleAccountLinkView.as_view(), name="google_link"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("resend-verification/", ResendVerificationEmailView.as_view(), name="resend_verification"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("me/", UserProfileView.as_view(), name="user_profile"),
    path("users/", UserListView.as_view(), name="user_list"),
    path("kyc/", KYCSubmissionView.as_view(), name="kyc-list-create"),
    path("kyc/<str:lookup>/", KYCDetailView.as_view(), name="kyc-detail"),
]
