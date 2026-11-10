"""
Custom permission classes for UNIMART backend.

These permissions enforce business rules around who can modify resources.
"""

from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object (or administrators) to edit or delete it.
    
    Read permissions are allowed to any safe request.
    Write permissions are only allowed to the owner or platform staff/superusers.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Staff and superusers have administrative rights to moderate/modify/delete
        if request.user and (request.user.is_staff or request.user.is_superuser):
            return True

        # For Product model, owner is the seller field; for others, user field
        owner = getattr(obj, 'seller', getattr(obj, 'user', None))
        return owner == request.user


class IsPlatformAdmin(permissions.BasePermission):
    """
    Strictly restricts access to active platform administrators (`is_staff` or `is_superuser`).
    Unauthenticated callers trigger 401 Unauthorized; authenticated Buyers/Vendors trigger 403 Forbidden.
    """

    message = "Access denied. Administrator credentials are required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, 'is_active', False)
            and (user.is_staff or user.is_superuser)
        )


class IsEmailVerifiedForWrite(permissions.BasePermission):
    """
    Requires verified email ownership before allowing state-mutating marketplace actions
    such as creating product listings, placing orders, or submitting seller KYC.
    """

    message = "Please verify your email address before completing this action. Check your inbox or click Resend Verification."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            return True
        return bool(getattr(user, 'is_email_verified', False))
