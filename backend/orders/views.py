from rest_framework import generics, permissions
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from core.permissions import IsEmailVerifiedForWrite
from .models import Order
from .serializers import OrderSerializer, OrderStatusUpdateSerializer


class OrderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class OrderListCreateView(generics.ListCreateAPIView):
    """
    List user orders (`?role=buyer` | `?role=seller`, or both) or place a new order.
    """
    serializer_class = OrderSerializer
    pagination_class = OrderPagination

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsEmailVerifiedForWrite()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        role_filter = (self.request.query_params.get('role') or '').strip().lower()
        base = Order.objects.select_related('buyer').prefetch_related('items', 'items__product', 'items__seller', 'items__seller__profile').order_by('-created_at')

        if role_filter == 'seller':
            return base.filter(items__seller=user).distinct()
        if role_filter == 'buyer':
            return base.filter(buyer=user)

        if user.is_staff or user.is_superuser:
            return base

        return base.filter(Q(buyer=user) | Q(items__seller=user)).distinct()


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve order details or advance fulfillment status.
    Scoped strictly to the buyer, sellers involved in the order, or administrators.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base = Order.objects.select_related('buyer').prefetch_related('items', 'items__product', 'items__seller', 'items__seller__profile')
        if user.is_staff or user.is_superuser:
            return base
        return base.filter(Q(buyer=user) | Q(items__seller=user)).distinct()

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return OrderStatusUpdateSerializer
        return OrderSerializer
