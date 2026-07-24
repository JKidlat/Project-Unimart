"""
Custom permission classes for UNIMART backend.

These permissions enforce business rules around who can modify resources.
"""

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit or delete it.
    
    Read permissions are allowed to any request (AllowAny),
    so users can view products without authentication.
    
    Write permissions are only allowed to the owner of the object.
    This is used for Product update/delete operations to ensure only
    the seller can modify their own products.
    
    Usage:
        permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        # This allows unauthenticated users to view products
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the object
        # For Product model, owner is the seller field
        # request.user is set by JWT authentication middleware
        return obj.seller == request.user
