"""
University views for listing available universities.

Provides a public read-only endpoint for listing all universities.
Used by frontends to populate university selection dropdowns.
"""

from rest_framework import generics, permissions
from .models import University
from .serializers import UniversitySerializer


class UniversityListView(generics.ListAPIView):
    """
    List all universities.
    
    Public endpoint (no auth required) for listing universities.
    Used during registration to allow users to select their university.
    
    Permission: AllowAny (public access)
    """
    queryset = University.objects.all().order_by('name')
    serializer_class = UniversitySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # Return all universities without pagination
