from rest_framework import generics, permissions
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import Order
from .serializers import OrderSerializer, OrderListSerializer, OrderUpdateSerializer


class OrderPagination(PageNumberPagination):
    """
    Pagination configuration for order listings.
    
    Limits the number of orders per page to improve performance.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class OrderCreateView(generics.CreateAPIView):
    """
    Create a new order.
    
    Requires authentication. The buyer is automatically set from request.user.
    The seller and price_at_purchase are automatically set from the product.
    The total_price is auto-calculated in the model's save() method.
    
    Validation prevents users from buying their own products.
    
    Permission: IsAuthenticated
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        """
        Set order fields automatically from request and product.
        
        - buyer: Set from request.user (authenticated user making the purchase)
        - seller: Set from product.seller (user who owns the product)
        - price_at_purchase: Set from product.price (captures price at time of order)
        
        The total_price is calculated automatically in the model's save() method
        as quantity * price_at_purchase.
        """
        product = serializer.validated_data['product']
        
        serializer.save(
            buyer=self.request.user,  # Set buyer from authenticated user
            seller=product.seller,      # Set seller from product owner
            price_at_purchase=product.price  # Capture current product price
        )


class OrderListView(generics.ListAPIView):
    """
    List orders for the authenticated user.
    
    Users see:
    - Orders they made (as buyer)
    - Orders for their products (as seller)
    
    Supports filtering by status and product.
    Uses query optimizations with select_related.
    
    Permission: IsAuthenticated
    """
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OrderPagination

    def get_queryset(self):
        """
        Filter orders to show only relevant ones for the current user.
        
        Users see:
        1. Orders where they are the buyer (orders_made)
        2. Orders where they are the seller (orders_received)
        
        Uses select_related to optimize database queries by fetching
        related buyer, seller, and product in a single query.
        """
        user = self.request.user
        
        # Get orders where user is buyer OR seller
        queryset = Order.objects.filter(
            Q(buyer=user) | Q(seller=user)
        ).select_related(
            'buyer',
            'seller',
            'product'
        )
        
        # Filter by status if provided
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by product if provided
        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        
        return queryset.order_by('-created_at')


class OrderUpdateView(generics.UpdateAPIView):
    """
    Update an order's status.
    
    Only the seller of the order can update its status.
    Validates status transitions (e.g., can't go from cancelled to pending).
    
    Permission: IsAuthenticated
    """
    serializer_class = OrderUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Only allow sellers to update their orders."""
        return Order.objects.filter(
            seller=self.request.user
        ).select_related('buyer', 'seller', 'product')

