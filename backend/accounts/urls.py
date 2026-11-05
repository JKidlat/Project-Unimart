"""
URL configuration for accounts app.

Authentication endpoints:
- POST /login/ - Obtain JWT tokens (access + refresh)
- POST /token/refresh/ - Refresh access token using refresh token
- POST /register/ - Register new user account
- POST /logout/ - Invalidate refresh token
"""

from django.urls import path
from .views import RegisterView, LogoutView, UserProfileView, UserListView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", UserProfileView.as_view(), name="user_profile"),
    path("users/", UserListView.as_view(), name="user_list"),
]
