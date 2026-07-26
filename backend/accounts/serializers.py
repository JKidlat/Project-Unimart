from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Profile
from universities.models import University
import firebase_admin.auth as auth

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source='profile.university.name', read_only=True)
    is_vendor = serializers.BooleanField(source='profile.is_vendor', read_only=True)
    referral_code = serializers.CharField(source='profile.referral_code', read_only=True)
    referrals_count = serializers.IntegerField(source='profile.referrals_count', read_only=True)
    orders_count = serializers.SerializerMethodField()
    wishlist_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'phone_number', 'is_active', 'is_staff', 'is_verified_student', 
            'university_name', 'is_vendor', 'referral_code', 'referrals_count', 'orders_count', 'wishlist_count'
        ]

    def get_orders_count(self, obj):
        return obj.orders_made.count()

    def get_wishlist_count(self, obj):
        return 0  # Default to 0 until wishlist backend is implemented

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    
    Handles user creation with email-based authentication.
    Automatically creates a Profile linked to the specified university.
    """
    firebase_token = serializers.CharField(write_only=True, required=True)
    university_id = serializers.IntegerField(write_only=True, required=True)
    is_vendor = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = User
        fields = ["firebase_token", "university_id", "is_vendor"]

    def validate_university_id(self, value):
        """Ensure the university exists before attempting profile creation."""
        if not University.objects.filter(id=value).exists():
            raise serializers.ValidationError("University with this ID does not exist.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        """
        Create a new user and associated profile atomically using Firebase Token.
        """
        university_id = validated_data.pop("university_id")
        firebase_token = validated_data.pop("firebase_token")
        is_vendor = validated_data.pop("is_vendor", False)

        try:
            decoded_token = auth.verify_id_token(firebase_token, clock_skew_seconds=60)
            email = decoded_token.get("email")
            if not email:
                raise serializers.ValidationError("Firebase token missing email.")
        except Exception as e:
            raise serializers.ValidationError(f"Invalid Firebase token: {str(e)}")
            
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("User with this email already exists.")

        # Create user with a dummy password since Firebase handles auth
        user = User.objects.create_user(
            email=email,
            password=User.objects.make_random_password(length=24)
        )

        # Create profile linked to university
        Profile.objects.create(
            user=user,
            university_id=university_id,
            is_vendor=is_vendor
        )

        return user