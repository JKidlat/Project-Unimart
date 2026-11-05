"""
Marketplace views for products and categories.
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
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
        queryset = Product.objects.filter(is_available=True).select_related(
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
        university = serializer.validated_data.get('university')
        if not university and hasattr(user, 'profile') and user.profile.university:
            university = user.profile.university
        serializer.save(seller=user, university=university)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a product.
    """
    queryset = Product.objects.all().select_related('seller', 'university', 'category').prefetch_related('reviews')
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        return [permissions.AllowAny()]