"""
User and Profile models for UNIMART.

Custom User model uses email-based authentication instead of username.
Each user has an associated Profile linked to a university.
"""

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from universities.models import University
import uuid

def generate_referral_code():
    """Generates a random 8-character referral code."""
    return str(uuid.uuid4())[:8].upper()


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
    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified_student = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    firebase_uid = models.CharField(
        max_length=128,
        unique=True,
        null=True,
        blank=True,
        help_text="Verified Firebase UID linked to this existing Unimart account."
    )

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
    business_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Business or store name provided during seller registration."
    )
    profile_pic = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL or path to user's profile avatar."
    )
    referral_code = models.CharField(
        max_length=20,
        unique=True,
        default=generate_referral_code,
        help_text="Unique referral code for the user."
    )
    referrals_count = models.IntegerField(
        default=0,
        help_text="Number of successful referrals made by the user."
    )

    def __str__(self):
        """String representation of the profile."""
        return self.user.email


class KYCSubmission(models.Model):
    """
    KYC (Know Your Customer) Seller Verification Submission.
    Holds proof of identity, selfie, institutional email, and review state.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    MODE_CHOICES = [
        ('seller_first', 'Seller Registration'),
        ('buyer_upgrade', 'Buyer Upgrade'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="kyc_submissions"
    )
    email = models.EmailField()
    institution_email = models.EmailField(blank=True)
    business_name = models.CharField(max_length=255, blank=True)
    selfie_url = models.TextField(blank=True, help_text="Base64 or URL of student selfie")
    id_doc_url = models.TextField(blank=True, help_text="Base64 or URL of Student ID or Ghana Card")
    mode = models.CharField(max_length=30, choices=MODE_CHOICES, default='buyer_upgrade')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"KYC: {self.email} ({self.status})"


class RoleChangeRequest(models.Model):
    """
    Requests by registered students to change account role between Buyer and Seller.
    Never permits requesting or granting Administrator privileges.
    """
    ROLE_CHOICES = [
        ('Buyer', 'Buyer'),
        ('Seller', 'Seller'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='role_change_requests',
    )
    current_role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    requested_role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_note = models.TextField(blank=True, default='')
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_role_requests',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"RoleChange: {self.user.email} ({self.current_role} -> {self.requested_role}: {self.status})"


