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
    LoginView,
    RegisterView,
    LogoutView,
    UserProfileView,
    UserListView,
    KYCSubmissionView,
    KYCDetailView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", UserProfileView.as_view(), name="user_profile"),
    path("users/", UserListView.as_view(), name="user_list"),
    path("kyc/", KYCSubmissionView.as_view(), name="kyc-list-create"),
    path("kyc/<str:lookup>/", KYCDetailView.as_view(), name="kyc-detail"),
]
