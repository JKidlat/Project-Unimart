"""
URL configuration for universities app.

RESTful URL patterns for university operations:
- GET /universities/ - List all universities (public)
"""

from django.urls import path
from .views import UniversityListView

urlpatterns = [
    path("", UniversityListView.as_view(), name="university-list"),
]
