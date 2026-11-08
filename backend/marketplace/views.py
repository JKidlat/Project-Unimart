"""
Marketplace views for products and categories.
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from .models import Product, Category, WishlistItem
from .serializers import ProductSerializer, CategorySerializer, WishlistItemSerializer

from core.permissions import IsOwnerOrReadOnly


class ProductPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = 'page_size'
    max_page_size = 100


class CategoryListView(generics.ListAPIView):
    """List all categories with active product counts."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ProductListCreateView(generics.ListCreateAPIView):
    """
    List all products (public) or create a new product (authenticated sellers/users).
    """
    serializer_class = ProductSerializer
    pagination_class = ProductPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description', 'category__name', 'university__name']
    ordering_fields = ['price', 'created_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        status_param = self.request.query_params.get('status')
        user = self.request.user

        if status_param and (getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)):
            if status_param == 'all':
                queryset = Product.objects.all()
            else:
                queryset = Product.objects.filter(status=status_param)
        else:
            # Public shop only shows approved live products
            queryset = Product.objects.filter(status='live', is_available=True)

        queryset = queryset.select_related(
            'seller', 'university', 'category'
        ).prefetch_related('reviews')

        category = self.request.query_params.get('category')
        if category and category != 'all':
            if category.isdigit():
                queryset = queryset.filter(category_id=category)
            else:
                queryset = queryset.filter(Q(category__slug=category) | Q(category__name__iexact=category))

        university = self.request.query_params.get('university')
        if university and university != 'all':
            if university.isdigit():
                queryset = queryset.filter(university_id=university)
            else:
                queryset = queryset.filter(
                    Q(university__name__icontains=university) | Q(university__short_name__icontains=university)
                )

        max_price = self.request.query_params.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        # Verify user has seller / vendor role or is admin
        is_vendor = getattr(user, 'profile', None) and user.profile.is_vendor
        if not (user.is_staff or user.is_superuser or is_vendor):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only verified student sellers can list products. Please complete seller verification first.")

        university = serializer.validated_data.get('university')
        if not university and hasattr(user, 'profile') and user.profile.university:
            university = user.profile.university

        initial_status = "live" if (user.is_staff or user.is_superuser) else "pending_approval"
        is_avail = (initial_status == "live")
        serializer.save(
            seller=user, 
            university=university,
            status=initial_status,
            is_available=is_avail
        )



class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a product.
    Only allows public access to approved live products; pending/rejected
    listings are strictly restricted to the listing seller or platform staff.
    """
    serializer_class = ProductSerializer

    def get_queryset(self):
        user = self.request.user
        base_qs = Product.objects.select_related('seller', 'university', 'category').prefetch_related('reviews')
        if user.is_authenticated and (user.is_staff or user.is_superuser):
            return base_qs
        elif user.is_authenticated:
            return base_qs.filter(Q(status='live', is_available=True) | Q(seller=user))
        return base_qs.filter(status='live', is_available=True)

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        return [permissions.AllowAny()]

    def perform_update(self, serializer):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            # Administrators can approve, reject, or toggle availability
            status_val = self.request.data.get('status')
            is_avail_val = self.request.data.get('is_available')
            rejection_reason_val = self.request.data.get('rejection_reason') or self.request.data.get('rejectionReason')
            kwargs = {}
            if status_val in ['pending_approval', 'live', 'rejected']:
                kwargs['status'] = status_val
            if is_avail_val is not None:
                kwargs['is_available'] = bool(is_avail_val)
            if rejection_reason_val is not None:
                kwargs['rejection_reason'] = rejection_reason_val
            serializer.save(**kwargs)
        else:
            # Regular sellers updating listing details:
            # Must not self-approve; listing is returned to pending review
            serializer.save(status='pending_approval', is_available=False)


class WishlistView(generics.ListCreateAPIView):
    """
    List user wishlist items or add an item to the wishlist.
    """
    serializer_class = WishlistItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WishlistItem.objects.filter(user=self.request.user).select_related(
            'product', 'product__seller', 'product__category', 'product__university'
        )

    def perform_create(self, serializer):
        product = serializer.validated_data['product']
        WishlistItem.objects.get_or_create(user=self.request.user, product=product)


class WishlistDetailView(generics.DestroyAPIView):
    """
    Remove an item from the wishlist by product ID.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        product_id = kwargs.get('product_id')
        deleted, _ = WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
        if deleted:
            return Response({'message': 'Removed from wishlist'}, status=status.HTTP_200_OK)
        return Response({'message': 'Item was not in wishlist'}, status=status.HTTP_404_NOT_FOUND)
