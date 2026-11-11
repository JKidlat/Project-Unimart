from django.urls import path
from .views import (
    CartItemDetailView,
    CartView,
    CategoryListView,
    ProductDetailView,
    ProductListCreateView,
    ProductStockUpdateView,
    WishlistDetailView,
    WishlistView,
)

urlpatterns = [
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("products/", ProductListCreateView.as_view(), name="product-list-create"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("products/<int:pk>/stock/", ProductStockUpdateView.as_view(), name="product-stock-update"),
    path("wishlist/", WishlistView.as_view(), name="wishlist-list-create"),
    path("wishlist/<int:product_id>/", WishlistDetailView.as_view(), name="wishlist-detail"),
    path("cart/", CartView.as_view(), name="cart-list-create-clear"),
    path("cart/<int:product_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
]
