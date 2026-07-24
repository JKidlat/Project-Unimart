"""
Product views for marketplace operations.

These views handle CRUD operations for products with proper permissions:
- Create: Authenticated users only (seller auto-set from request.user)
- List: Anyone can view (AllowAny)
- Detail: Anyone can view (AllowAny)
- Update: Only seller can update (IsOwnerOrReadOnly)
- Delete: Only seller can delete (IsOwnerOrReadOnly)
"""

from rest_framework import generics, permissions
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from .models import Product
from .serializers import ProductSerializer
from core.permissions import IsOwnerOrReadOnly


class ProductPagination(PageNumberPagination):
    """
    Pagination configuration for product listings.
    
    Limits the number of products per page to improve performance
    and user experience.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductCreateView(generics.CreateAPIView):
    """
    Create a new product.
    
    Requires authentication. The seller field is automatically set from
    request.user in perform_create() to ensure users can only create
    products under their own account.
    
    Permission: IsAuthenticated
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        """
        Set the seller to the current authenticated user.
        
        This ensures that products are always created with the correct seller,
        preventing users from creating products under someone else's name.
        request.user is provided by JWT authentication middleware.
        """
        serializer.save(seller=self.request.user)


class ProductListView(generics.ListAPIView):
    """
    List all available products with filtering, search, and ordering.
    
    Allows unauthenticated access for public product browsing.
    Supports query parameters:
    - search: Search in title and description
    - ordering: Order by price, created_at, etc.
    - page: Pagination page number
    - page_size: Items per page
    
    Permission: AllowAny (public access)
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = ProductPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['price', 'created_at', 'updated_at']
    ordering = ['-created_at']  # Default ordering: newest first

    def get_queryset(self):
        """
        Get queryset with query optimizations.
        
        Uses select_related for ForeignKey relationships (seller, university)
        and prefetch_related for reverse ForeignKey (reviews) to reduce
        database queries.
        
        Filters by is_available=True by default to show only active products.
        """
        queryset = Product.objects.filter(is_available=True).select_related(
            'seller',
            'university'
        ).prefetch_related('reviews')
        
        # Additional filtering by query parameters
        university_id = self.request.query_params.get('university', None)
        if university_id:
            queryset = queryset.filter(university_id=university_id)
        
        product_type = self.request.query_params.get('product_type', None)
        if product_type:
            queryset = queryset.filter(product_type=product_type)
        
        min_price = self.request.query_params.get('min_price', None)
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except ValueError:
                pass
        
        max_price = self.request.query_params.get('max_price', None)
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass
        
        return queryset


class ProductDetailView(generics.RetrieveAPIView):
    """
    Retrieve a single product by ID.
    
    Allows unauthenticated access for public product viewing.
    Uses query optimizations to reduce database queries.
    
    Permission: AllowAny (public access)
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Product.objects.all().select_related(
        'seller',
        'university'
    ).prefetch_related('reviews')


class ProductUpdateView(generics.UpdateAPIView):
    """
    Update an existing product.
    
    Only the seller (owner) can update their own products.
    Uses IsOwnerOrReadOnly permission to enforce this rule.
    
    Permission: IsAuthenticated + IsOwnerOrReadOnly
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    queryset = Product.objects.all()

    def get_queryset(self):
        """
        Optimize queryset with select_related.
        
        Even though only the seller can update, we still optimize
        the query for better performance.
        """
        return Product.objects.all().select_related('seller', 'university')


class ProductDeleteView(generics.DestroyAPIView):
    """
    Delete a product.
    
    Only the seller (owner) can delete their own products.
    Uses IsOwnerOrReadOnly permission to enforce this rule.
    
    Note: This performs a hard delete. Consider soft delete (is_available=False)
    if you want to preserve order history.
    
    Permission: IsAuthenticated + IsOwnerOrReadOnly
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    queryset = Product.objects.all()

    def get_queryset(self):
        """Optimize queryset with select_related."""
        return Product.objects.all().select_related('seller', 'university')