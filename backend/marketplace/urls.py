"""
URL configuration for marketplace app.

RESTful URL patterns for product operations:
- GET, POST /products/ - List and create products
- GET, PUT, PATCH, DELETE /products/<id>/ - Detail, update, delete product
"""

from django.urls import path
from .views import (
    ProductCreateView,
    ProductListView,
    ProductDetailView,
    ProductUpdateView,
    ProductDeleteView
)

urlpatterns = [
    # List and create products
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/create/", ProductCreateView.as_view(), name="product-create"),
    
    # Detail, update, and delete product by ID
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("products/<int:pk>/update/", ProductUpdateView.as_view(), name="product-update"),
    path("products/<int:pk>/delete/", ProductDeleteView.as_view(), name="product-delete"),
]