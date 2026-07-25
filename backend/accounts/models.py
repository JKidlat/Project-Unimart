"""
User and Profile models for UNIMART.

Custom User model uses email-based authentication instead of username.
Each user has an associated Profile linked to a university.
"""

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from universities.models import University


class UserManager(BaseUserManager):
    """
    Custom user manager for email-based authentication.
    
    Handles user creation with email as the primary identifier
    instead of the default username.
    """
    def create_user(self, email, password=None):
        """
        Create and return a regular user with the given email and password.
        
        Email is normalized (lowercased) before saving.
        Password is hashed automatically via set_password().
        """
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email)
        user.set_password(password)  # hashes password
        user.save()
        return user

    def create_superuser(self, email, password):
        """
        Create and return a superuser with the given email and password.
        
        Superusers have is_staff=True and is_superuser=True permissions.
        """
        user = self.create_user(email, password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        return user


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model using email as the username field.
    
    This replaces Django's default User model to use email-based authentication.
    The USERNAME_FIELD is set to 'email', so users log in with their email address.
    """
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified_student = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        """String representation of the user."""
        return self.email


class Profile(models.Model):
    """
    Profile model extending User with additional information.
    
    Each user has one profile linked to a university.
    The is_vendor flag indicates if the user can sell products.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        help_text="One-to-one relationship with User model."
    )
    university = models.ForeignKey(
        University,
        on_delete=models.SET_NULL,
        null=True,
        related_name="users",
        help_text="University the user is associated with. Can be null."
    )
    is_vendor = models.BooleanField(
        default=False,
        help_text="Whether the user can sell products in the marketplace."
    )

    def __str__(self):
        """String representation of the profile."""
        return self.user.email
