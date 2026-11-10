import json
import os
from django.conf import settings
from django.contrib.auth import get_user_model
import firebase_admin
from firebase_admin import auth, credentials
from rest_framework import authentication, exceptions

User = get_user_model()


def ensure_firebase_initialized():
    """Initialize Firebase Admin SDK once using JSON env var, file path, or project ID."""
    if firebase_admin._apps:
        return
    project_id = getattr(settings, 'FIREBASE_PROJECT_ID', None) or os.environ.get('FIREBASE_PROJECT_ID', 'unimart-c4308')
    try:
        creds_json = os.environ.get('FIREBASE_CREDENTIALS_JSON', '').strip()
        cred_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'firebase-credentials.json')
        if creds_json:
            cred = credentials.Certificate(json.loads(creds_json))
            firebase_admin.initialize_app(cred, options={'projectId': project_id})
        elif os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, options={'projectId': project_id})
        else:
            firebase_admin.initialize_app(options={'projectId': project_id})
    except Exception as exc:
        print("Warning: Firebase Admin SDK not properly initialized. Error:", exc)


def verify_firebase_token(id_token: str) -> dict:
    """Verify a Firebase ID token and return its decoded claims."""
    if not id_token:
        raise exceptions.AuthenticationFailed("Firebase ID token is required.")
    ensure_firebase_initialized()
    try:
        return auth.verify_id_token(id_token, clock_skew_seconds=60)
    except Exception:
        raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")


ensure_firebase_initialized()


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
        if len(parts) > 2:
            raise exceptions.AuthenticationFailed("Invalid token header. Token string should not contain spaces.")

        decoded_token = verify_firebase_token(parts[1])
        uid = decoded_token.get("uid")
        email = (decoded_token.get("email") or "").strip().lower()
        email_verified = bool(decoded_token.get("email_verified", False))

        if not uid or not email:
            raise exceptions.AuthenticationFailed("Firebase token missing identifier claims.")
        if not email_verified:
            raise exceptions.AuthenticationFailed("Firebase account email is not verified.")

        from accounts.models import Profile

        user, created = User.objects.get_or_create(email=email)
        if created:
            user.set_unusable_password()
            user.is_email_verified = True
            user.save()
            Profile.objects.get_or_create(user=user)
        elif not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=['is_email_verified'])

        return (user, None)
