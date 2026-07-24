import os
from rest_framework import authentication
from rest_framework import exceptions
from django.contrib.auth import get_user_model
import firebase_admin
from firebase_admin import credentials, auth

User = get_user_model()

# Note: The firebase_admin needs to be initialized. We can do that in apps.py or here.
# For now, we will initialize it here safely.
if not firebase_admin._apps:
    try:
        firebase_admin.initialize_app(options={'projectId': 'unimart-c4308'})
    except Exception as e:
        print("Warning: Firebase Admin SDK not properly initialized. Error:", e)

class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class that verifies Firebase ID tokens.
    """
    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None
        
        parts = auth_header.split()
        if parts[0].lower() != "bearer":
            return None
            
        if len(parts) == 1:
            raise exceptions.AuthenticationFailed("Invalid token header. No credentials provided.")
        elif len(parts) > 2:
            raise exceptions.AuthenticationFailed("Invalid token header. Token string should not contain spaces.")
            
        id_token = parts[1]
        
        try:
            # Verify the token with clock skew tolerance
            decoded_token = auth.verify_id_token(id_token, clock_skew_seconds=60)
            uid = decoded_token.get("uid")
            email = decoded_token.get("email")
        except Exception as e:
            raise exceptions.AuthenticationFailed(f"Firebase auth error: {str(e)}")
            
        if not uid or not email:
            raise exceptions.AuthenticationFailed("Firebase token missing UID or email.")
            
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed("User not found in our database. Please register first.")
            
        return (user, None)
