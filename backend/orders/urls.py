"""
URL configuration for orders app.

RESTful URL patterns for order operations:
- GET /orders/ - List orders
- POST /orders/create/ - Create new order
- PATCH /orders/<id>/update/ - Update order status (seller only)
"""

from django.urls import path
from .views import OrderCreateView, OrderListView, OrderUpdateView

urlpatterns = [
    path("", OrderListView.as_view(), name="order-list"),
    path("create/", OrderCreateView.as_view(), name="order-create"),
    path("<int:pk>/update/", OrderUpdateView.as_view(), name="order-update"),
]
