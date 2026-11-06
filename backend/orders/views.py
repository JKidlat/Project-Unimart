from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import Order
from .serializers import OrderSerializer, OrderStatusUpdateSerializer


class OrderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class OrderListCreateView(generics.ListCreateAPIView):
    """
    List user orders (as buyer or seller) or create a new order with cart items.
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OrderPagination

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Order.objects.all().prefetch_related('items', 'items__product').order_by('-created_at')

        # Orders where user is buyer or seller of any item in the order
        return Order.objects.filter(
            Q(buyer=user) | Q(items__seller=user)
        ).distinct().prefetch_related('items', 'items__product').order_by('-created_at')


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve order details or update order status.
    Scoped strictly to the buyer, sellers involved in the order, or administrators.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Order.objects.all().prefetch_related('items', 'items__product')
        return Order.objects.filter(
            Q(buyer=user) | Q(items__seller=user)
        ).distinct().prefetch_related('items', 'items__product')

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return OrderStatusUpdateSerializer
        return OrderSerializer

