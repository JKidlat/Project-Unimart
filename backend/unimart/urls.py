"""
URL configuration for unimart project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from accounts import views as accounts_views
from core.media import MediaServeView, MediaUploadView



@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for Render uptime monitoring.
    Verifies that the WSGI worker and Supabase database connection are operational.
    """
    from django.db import connection
    db_status = "connected"
    try:
        connection.ensure_connection()
    except Exception as e:
        return Response({
            "status": "degraded",
            "service": "unimart-backend",
            "database": f"error: {str(e)}"
        }, status=503)

    return Response({
        "status": "healthy",
        "service": "unimart-backend",
        "database": db_status
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """
    Root API view providing a directory of all available UNIMART endpoints.
    """
    return Response({
        "message": "Welcome to UNIMART REST API",
        "version": "1.0",
        "endpoints": {
            "health": request.build_absolute_uri('/api/health/'),
            "admin": request.build_absolute_uri('/admin/'),
            "auth": {
                "register": request.build_absolute_uri('/api/auth/register/'),
                "login": request.build_absolute_uri('/api/auth/login/'),
                "google": request.build_absolute_uri('/api/auth/google/'),
                "google_link": request.build_absolute_uri('/api/auth/google/link/'),
                "verify_email": request.build_absolute_uri('/api/auth/verify-email/'),
                "resend_verification": request.build_absolute_uri('/api/auth/resend-verification/'),
                "password_reset": request.build_absolute_uri('/api/auth/password-reset/'),
                "password_reset_confirm": request.build_absolute_uri('/api/auth/password-reset/confirm/'),
                "token_refresh": request.build_absolute_uri('/api/auth/token/refresh/'),
                "profile": request.build_absolute_uri('/api/auth/me/'),
                "logout": request.build_absolute_uri('/api/auth/logout/'),
            },
            "marketplace": {
                "categories": request.build_absolute_uri('/api/categories/'),
                "products": request.build_absolute_uri('/api/products/'),
                "wishlist": request.build_absolute_uri('/api/wishlist/'),
            },
            "universities": request.build_absolute_uri('/api/universities/'),
            "orders": request.build_absolute_uri('/api/orders/'),
            "payments": {
                "verify": request.build_absolute_uri('/api/payments/verify/'),
            },
            "kyc": request.build_absolute_uri('/api/kyc/'),
            "reviews": request.build_absolute_uri('/api/reviews/'),
        }
    })


urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('api/health/', health_check, name='api_health_check'),
    path('', api_root, name='root'),
    path('api/', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/admin/', include('core.admin_urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/media/upload/', MediaUploadView.as_view(), name='media-upload'),
    path('api/media/<uuid:pk>/', MediaServeView.as_view(), name='media-serve'),
    path('api/support/', include('core.support_urls')),
    path('api/messages/', include('messaging.urls')),
    path("api/", include("marketplace.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/reviews/", include("reviews.urls")),
    path("api/universities/", include("universities.urls")),
    path("api/kyc/", include([
        path("", accounts_views.KYCSubmissionView.as_view(), name="kyc-list-create-direct"),
        path("<str:lookup>/", accounts_views.KYCDetailView.as_view(), name="kyc-detail-direct"),
    ])),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

