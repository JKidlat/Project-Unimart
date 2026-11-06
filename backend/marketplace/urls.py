from django.urls import path
from .views import (
    ProductListCreateView,
    ProductDetailView,
    CategoryListView,
    WishlistView,
    WishlistDetailView,
)

urlpatterns = [
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("products/", ProductListCreateView.as_view(), name="product-list-create"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("wishlist/", WishlistView.as_view(), name="wishlist-list-create"),
    path("wishlist/<int:product_id>/", WishlistDetailView.as_view(), name="wishlist-detail"),
]
