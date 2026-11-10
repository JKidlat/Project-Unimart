"""
Review views for product ratings and comments.

These views handle review creation and listing with proper permissions:
- Create: Authenticated users only, must have purchased the product
- List: Public access (AllowAny) for viewing reviews
"""

from rest_framework import generics, permissions
from rest_framework.pagination import PageNumberPagination
from .models import Review
from .serializers import ReviewSerializer, ReviewListSerializer


class ReviewPagination(PageNumberPagination):
    """
    Pagination configuration for review listings.
    
    Limits the number of reviews per page to improve performance.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ReviewCreateView(generics.CreateAPIView):
    """
    Create a new review.
    
    Requires authentication. The user is automatically set from request.user.
    Validation ensures:
    1. User has purchased the product (checked in serializer)
    2. No duplicate review exists (enforced by model unique_together)
    
    Permission: IsAuthenticated
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        """
        Set the user to the current authenticated user.
        
        This ensures that reviews are always created with the correct user,
        preventing users from creating reviews under someone else's name.
        request.user is provided by JWT authentication middleware.
        
        Purchase validation is handled in the serializer's validate() method.
        """
        serializer.save(user=self.request.user)


class ReviewListView(generics.ListAPIView):
    """
    List reviews with optional filtering by product.
    
    Allows unauthenticated access for public review viewing.
    Supports filtering by product ID via query parameter.
    Uses query optimizations with select_related.
    
    Permission: AllowAny (public access)
    """
    serializer_class = ReviewListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = ReviewPagination

    def get_queryset(self):
        """
        Get queryset with query optimizations and optional filtering.
        
        Uses select_related for ForeignKey relationships (user, product)
        to reduce database queries.
        
        Supports filtering by product ID via query parameter.
        """
        queryset = Review.objects.filter(moderation_status='approved').select_related(
            'user',
            'product'
        )
        
        # Filter by product if provided
        product_id = self.request.query_params.get('product', None)
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        
        # Filter by rating if provided
        rating = self.request.query_params.get('rating', None)
        if rating:
            try:
                queryset = queryset.filter(rating=int(rating))
            except ValueError:
                pass
        
        return queryset.order_by('-created_at')

