"""
University views for listing available universities.

Provides a public read-only endpoint for listing active universities.
Used by frontends to populate university selection dropdowns.
"""

from django.db.models import Q
from rest_framework import generics, permissions
from .models import University
from .serializers import UniversitySerializer


class UniversityListView(generics.ListAPIView):
    """
    List active universities.

    Public endpoint (no auth required) for listing universities.
    Supports optional ?category= and ?search= filters.
    Used during registration, profiles, and shop filters.
    """
    serializer_class = UniversitySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # Return all active universities without pagination

    def get_queryset(self):
        qs = University.objects.filter(is_active=True)

        category = (self.request.query_params.get('category') or '').strip()
        if category and category.lower() != 'all':
            qs = qs.filter(category__iexact=category)

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(short_name__icontains=search))

        return qs.order_by('name')
