"""URL routing for administrator-only REST endpoints under `/api/admin/`."""

from django.urls import path
from core.admin_views import (
    AdminActivityView,
    AdminDashboardView,
    AdminOrderDetailView,
    AdminOrderListView,
    AdminProductDetailView,
    AdminProductListView,
    AdminReviewDetailView,
    AdminReviewListView,
    AdminRoleRequestDetailView,
    AdminRoleRequestListView,
    AdminSecurityAdminDetailView,
    AdminSecurityAdminsView,
    AdminSupportDetailView,
    AdminSupportListView,
    AdminUniversityDetailView,
    AdminUniversityListCreateView,
    AdminUserDetailView,
    AdminUserListView,
)

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("activity/", AdminActivityView.as_view(), name="admin-activity"),
    path("users/", AdminUserListView.as_view(), name="admin-users"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("products/", AdminProductListView.as_view(), name="admin-products"),
    path("products/<int:pk>/", AdminProductDetailView.as_view(), name="admin-product-detail"),
    path("orders/", AdminOrderListView.as_view(), name="admin-orders"),
    path("orders/<int:pk>/", AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path("reviews/", AdminReviewListView.as_view(), name="admin-reviews"),
    path("reviews/<int:pk>/", AdminReviewDetailView.as_view(), name="admin-review-detail"),
    path("role-requests/", AdminRoleRequestListView.as_view(), name="admin-role-requests"),
    path("role-requests/<int:pk>/", AdminRoleRequestDetailView.as_view(), name="admin-role-request-detail"),
    path("support/", AdminSupportListView.as_view(), name="admin-support"),
    path("support/<int:pk>/", AdminSupportDetailView.as_view(), name="admin-support-detail"),
    path("universities/", AdminUniversityListCreateView.as_view(), name="admin-universities"),
    path("universities/<int:pk>/", AdminUniversityDetailView.as_view(), name="admin-university-detail"),
    path("security/admins/", AdminSecurityAdminsView.as_view(), name="admin-security-admins"),
    path("security/admins/<int:pk>/", AdminSecurityAdminDetailView.as_view(), name="admin-security-admin-detail"),
]
