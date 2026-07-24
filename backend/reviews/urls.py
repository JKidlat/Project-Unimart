"""
URL configuration for reviews app.

RESTful URL patterns for review operations:
- GET, POST /reviews/ - List and create reviews
"""

from django.urls import path
from .views import ReviewCreateView, ReviewListView

urlpatterns = [
    path("", ReviewListView.as_view(), name="review-list"),
    path("create/", ReviewCreateView.as_view(), name="review-create"),
]
