"""
Marketplace views for products, inventory stock management, categories, wishlist, and cart.
"""

from django.db import transaction
from django.db.models import Q, Sum
from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotAuthenticated, PermissionDenied, ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsEmailVerifiedForWrite, IsOwnerOrReadOnly
from .models import CartItem, Category, Product, WishlistItem
from .serializers import (
    CartItemSerializer,
    CategorySerializer,
    ProductSerializer,
    WishlistItemSerializer,
)


class ProductPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = 'page_size'
    max_page_size = 100


class CategoryListView(generics.ListAPIView):
    """List all categories with active product counts."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class IsVendorOrAdminForProductCreate(permissions.BasePermission):
    message = "Only verified student sellers can list products. Please complete seller verification first."

    def has_permission(self, request, view):
        user = request.user
        is_vendor = bool(getattr(getattr(user, 'profile', None), 'is_vendor', False))
        return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser or is_vendor))


class ProductListCreateView(generics.ListCreateAPIView):
    """
    List approved products (public), seller's own listings across all statuses (`?mine=true`),
    or create a new listing (`POST`) requiring verified seller privileges and `stock >= 1`.
    """

    serializer_class = ProductSerializer
    pagination_class = ProductPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'description', 'category__name', 'university__name']
    ordering_fields = ['price', 'created_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [
                permissions.IsAuthenticated(),
                IsEmailVerifiedForWrite(),
                IsVendorOrAdminForProductCreate(),
            ]
        return [permissions.AllowAny()]

    def get_queryset(self):
        mine = (self.request.query_params.get('mine') or '').strip().lower() in ('1', 'true', 'yes')
        status_param = self.request.query_params.get('status')
        user = self.request.user
        is_admin = bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))

        if mine:
            if not user or not user.is_authenticated:
                raise NotAuthenticated("Authentication required to view your listings.")
            queryset = Product.objects.filter(seller=user)
            if status_param and status_param != 'all':
                queryset = queryset.filter(status=status_param)
        elif status_param and status_param != 'live':
            if not user or not user.is_authenticated:
                raise NotAuthenticated("Authentication required to query non-public product queues.")
            if not is_admin:
                raise PermissionDenied("Administrator privileges required to query non-public product queues.")
            if status_param == 'all':
                queryset = Product.objects.all()
            else:
                queryset = Product.objects.filter(status=status_param)
        elif status_param and is_admin:
            queryset = Product.objects.filter(status=status_param)
        else:
            # Public shop displays all approved live listings (including stock == 0 as "Out of stock")
            queryset = Product.objects.filter(status='live', is_available=True)

        queryset = queryset.select_related(
            'seller', 'seller__profile', 'seller__profile__university', 'university', 'category'
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
        is_vendor = getattr(user, 'profile', None) and user.profile.is_vendor
        if not (user.is_staff or user.is_superuser or is_vendor):
            raise PermissionDenied(
                "Only verified student sellers can list products. Please complete seller verification first."
            )

        university = serializer.validated_data.get('university')
        if not university and hasattr(user, 'profile') and user.profile.university:
            university = user.profile.university

        initial_status = "live" if (user.is_staff or user.is_superuser) else "pending_approval"
        is_avail = initial_status == "live"
        serializer.save(
            seller=user,
            university=university,
            status=initial_status,
            is_available=is_avail,
            is_resubmitted=False,
        )


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a product.
    Regular sellers editing their listing trigger automatic re-moderation (`pending_approval`)
    so edited ads cannot bypass admin approval.
    """

    serializer_class = ProductSerializer

    def get_queryset(self):
        user = self.request.user
        base_qs = Product.objects.select_related(
            'seller', 'seller__profile', 'seller__profile__university', 'university', 'category'
        ).prefetch_related('reviews')
        if user.is_authenticated and (user.is_staff or user.is_superuser):
            return base_qs
        if user.is_authenticated:
            return base_qs.filter(Q(status='live', is_available=True) | Q(seller=user))
        return base_qs.filter(status='live', is_available=True)

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        return [permissions.AllowAny()]

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.is_staff or user.is_superuser:
            status_val = self.request.data.get('status')
            is_avail_val = self.request.data.get('is_available')
            rejection_reason_val = self.request.data.get('rejection_reason') or self.request.data.get('rejectionReason')
            kwargs = {}
            if status_val in ['pending_approval', 'live', 'flagged', 'hidden', 'rejected']:
                kwargs['status'] = status_val
                if is_avail_val is None:
                    kwargs['is_available'] = status_val == 'live'
                if status_val == 'live':
                    kwargs['is_resubmitted'] = False
            if is_avail_val is not None:
                kwargs['is_available'] = bool(is_avail_val)
            if rejection_reason_val is not None:
                kwargs['rejection_reason'] = rejection_reason_val
            flag_reason_val = self.request.data.get('flag_reason') or self.request.data.get('flagReason')
            if flag_reason_val is not None:
                kwargs['flag_reason'] = flag_reason_val
            serializer.save(**kwargs)
        else:
            was_reviewed = instance.status in ('live', 'rejected', 'flagged', 'hidden') or instance.is_resubmitted
            serializer.save(
                status='pending_approval',
                is_available=False,
                is_resubmitted=bool(was_reviewed),
                rejection_reason='',
            )


class ProductStockUpdateView(APIView):
    """
    Allow listing owner (seller) or admin to update remaining stock quantity without
    sending an unchanged approved ad back through moderation.
    """

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        product = generics.get_object_or_404(Product, pk=pk)
        if product.seller_id != request.user.id and not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied("You do not have permission to update this listing's inventory.")

        raw_stock = request.data.get('stock')
        try:
            stock_val = int(raw_stock)
        except (TypeError, ValueError):
            return Response({"stock": "Please enter a valid whole number for stock."}, status=status.HTTP_400_BAD_REQUEST)

        if stock_val < 0:
            return Response({"stock": "Stock quantity cannot be negative."}, status=status.HTTP_400_BAD_REQUEST)

        product.stock = stock_val
        product.save(update_fields=['stock', 'updated_at'])
        return Response(ProductSerializer(product, context={'request': request}).data)


class WishlistView(generics.ListCreateAPIView):
    """List user wishlist items or add a live item to the user's wishlist."""

    serializer_class = WishlistItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return WishlistItem.objects.filter(user=self.request.user).select_related(
            'product', 'product__seller', 'product__seller__profile', 'product__category', 'product__university'
        )

    def perform_create(self, serializer):
        product = serializer.validated_data['product']
        WishlistItem.objects.get_or_create(user=self.request.user, product=product)


class WishlistDetailView(generics.DestroyAPIView):
    """Remove an item from the user's wishlist by product ID."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        product_id = kwargs.get('product_id')
        deleted, _ = WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
        if deleted:
            return Response({'message': 'Removed from wishlist'}, status=status.HTTP_200_OK)
        return Response({'message': 'Item was not in wishlist'}, status=status.HTTP_404_NOT_FOUND)


class CartView(APIView):
    """Persistent user-specific shopping cart backed by PostgreSQL with stock checks."""

    permission_classes = [permissions.IsAuthenticated]

    def _cart_payload(self, user, request):
        entries = (
            CartItem.objects.filter(user=user)
            .select_related('product', 'product__seller', 'product__seller__profile', 'product__category', 'product__university')
            .order_by('-updated_at')
        )
        serialized = CartItemSerializer(entries, many=True, context={'request': request}).data
        total_qty = sum(item['quantity'] for item in serialized)
        return {'item_count': total_qty, 'results': serialized}

    def get(self, request):
        return Response(self._cart_payload(request.user, request))

    @transaction.atomic
    def post(self, request):
        product_id = request.data.get('product_id') or request.data.get('id')
        try:
            quantity = int(request.data.get('quantity', 1))
        except (TypeError, ValueError):
            return Response({'quantity': 'Invalid quantity specified.'}, status=status.HTTP_400_BAD_REQUEST)

        if quantity < 1:
            return Response({'quantity': 'Quantity must be at least 1.'}, status=status.HTTP_400_BAD_REQUEST)

        product = Product.objects.select_for_update().filter(id=product_id, status='live', is_available=True).first()
        if not product:
            return Response({'error': 'Product not found or not available for purchase.'}, status=status.HTTP_404_NOT_FOUND)

        if product.stock <= 0:
            return Response({'error': f'"{product.title}" is currently out of stock.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = CartItem.objects.filter(user=request.user, product=product).first()
        new_qty = (existing.quantity if existing else 0) + quantity
        if new_qty > product.stock:
            return Response(
                {'error': f'Only {product.stock} unit(s) of "{product.title}" available in stock.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if existing:
            existing.quantity = new_qty
            existing.save(update_fields=['quantity', 'updated_at'])
        else:
            CartItem.objects.create(user=request.user, product=product, quantity=new_qty)

        return Response(self._cart_payload(request.user, request), status=status.HTTP_200_OK)

    def delete(self, request):
        CartItem.objects.filter(user=request.user).delete()
        return Response({'item_count': 0, 'results': []})


class CartItemDetailView(APIView):
    """Update quantity or remove a specific product from authenticated user's cart."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, product_id):
        entry = CartItem.objects.select_related('product').filter(user=request.user, product_id=product_id).first()
        if not entry:
            return Response({'error': 'Item not found in cart.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            quantity = int(request.data.get('quantity'))
        except (TypeError, ValueError):
            return Response({'quantity': 'Valid quantity is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            entry.delete()
        else:
            if entry.product.stock <= 0:
                return Response({'error': f'"{entry.product.title}" is currently out of stock.'}, status=status.HTTP_400_BAD_REQUEST)
            if quantity > entry.product.stock:
                return Response(
                    {'error': f'Only {entry.product.stock} unit(s) of "{entry.product.title}" remaining.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            entry.quantity = quantity
            entry.save(update_fields=['quantity', 'updated_at'])

        entries = CartItem.objects.filter(user=request.user).select_related(
            'product', 'product__seller', 'product__seller__profile', 'product__category', 'product__university'
        )
        serialized = CartItemSerializer(entries, many=True, context={'request': request}).data
        total_qty = sum(item['quantity'] for item in serialized)
        return Response({'item_count': total_qty, 'results': serialized})

    def delete(self, request, product_id):
        CartItem.objects.filter(user=request.user, product_id=product_id).delete()
        entries = CartItem.objects.filter(user=request.user).select_related(
            'product', 'product__seller', 'product__seller__profile', 'product__category', 'product__university'
        )
        serialized = CartItemSerializer(entries, many=True, context={'request': request}).data
        total_qty = sum(item['quantity'] for item in serialized)
        return Response({'item_count': total_qty, 'results': serialized})
