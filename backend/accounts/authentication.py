import base64
import json
import logging
import os

from django.conf import settings
from django.contrib.auth import get_user_model
import firebase_admin
from firebase_admin import auth, credentials
import google.auth.exceptions
from google.auth import jwt as google_jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
import requests
from rest_framework import authentication, exceptions

logger = logging.getLogger(__name__)
User = get_user_model()

_HAS_SERVICE_ACCOUNT = False
_CERT_REQUEST = None


def _get_firebase_project_id() -> str:
    configured = getattr(settings, 'FIREBASE_PROJECT_ID', '') or os.environ.get('FIREBASE_PROJECT_ID', '')
    return configured.strip() or 'unimart-c4308'


def _get_cert_request():
    """Return a cached HTTP transport request for fetching Google Firebase x509 certs."""
    global _CERT_REQUEST
    if _CERT_REQUEST is None:
        session = requests.Session()
        try:
            import cachecontrol
            session = cachecontrol.CacheControl(session)
        except ImportError:
            pass
        _CERT_REQUEST = google_requests.Request(session=session)
    return _CERT_REQUEST


def _parse_json_credentials(raw_value: str):
    """Parse raw JSON, control-character JSON, or base64-encoded service account JSON."""
    text = raw_value.strip()
    if not text:
        return None
    if not text.startswith('{'):
        try:
            text = base64.b64decode(text).decode('utf-8').strip()
        except Exception:
            return None
    try:
        info = json.loads(text, strict=False)
    except Exception:
        return None
    if isinstance(info, dict) and info.get('type') == 'service_account' and info.get('private_key'):
        info['private_key'] = str(info['private_key']).replace('\\n', '\n')
        return info
    return None


def _load_service_account_credential():
    """Attempt to load Firebase service account credentials from supported env vars or file paths."""
    for env_name in (
        'FIREBASE_CREDENTIALS_JSON',
        'FIREBASE_SERVICE_ACCOUNT_JSON',
        'FIREBASE_SERVICE_ACCOUNT',
        'FIREBASE_CREDENTIALS',
        'GOOGLE_APPLICATION_CREDENTIALS_JSON',
    ):
        raw = os.environ.get(env_name, '')
        parsed = _parse_json_credentials(raw)
        if parsed:
            return credentials.Certificate(parsed), parsed.get('project_id')

    client_email = os.environ.get('FIREBASE_CLIENT_EMAIL', '').strip()
    private_key = os.environ.get('FIREBASE_PRIVATE_KEY', '').strip()
    if client_email and private_key:
        project_id = _get_firebase_project_id()
        return credentials.Certificate({
            'type': 'service_account',
            'project_id': project_id,
            'client_email': client_email,
            'private_key': private_key.replace('\\n', '\n'),
            'token_uri': 'https://oauth2.googleapis.com/token',
        }), project_id

    for path_candidate in (
        os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', '').strip(),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'firebase-credentials.json'),
    ):
        if path_candidate and os.path.isfile(path_candidate):
            try:
                with open(path_candidate, 'r', encoding='utf-8') as fh:
                    parsed = _parse_json_credentials(fh.read())
                if parsed:
                    return credentials.Certificate(parsed), parsed.get('project_id')
            except Exception as exc:
                logger.warning("Could not read Firebase credential file %s: %s", path_candidate, exc)

    return None, None


def ensure_firebase_initialized():
    """Initialize Firebase Admin SDK safely using credentials when present or project ID fallback."""
    global _HAS_SERVICE_ACCOUNT
    if firebase_admin._apps:
        return

    project_id = _get_firebase_project_id()
    try:
        cred, cred_project_id = _load_service_account_credential()
        effective_project_id = project_id or cred_project_id or 'unimart-c4308'
        if cred is not None:
            firebase_admin.initialize_app(cred, options={'projectId': effective_project_id})
            _HAS_SERVICE_ACCOUNT = True
        else:
            firebase_admin.initialize_app(options={'projectId': effective_project_id})
            _HAS_SERVICE_ACCOUNT = False
            logger.info(
                "Firebase initialized with projectId=%s (public x509 certificate verification active).",
                effective_project_id,
            )
    except Exception as exc:
        _HAS_SERVICE_ACCOUNT = False
        logger.warning("Firebase Admin initialization fallback warning: %s", exc)


def _verify_firebase_token_with_public_certs(id_token: str, project_id: str) -> dict:
    """
    Cryptographically verify a Firebase ID token against Google's official public x509
    certificates without requiring private service-account credentials.
    """
    if not isinstance(id_token, str) or len(id_token.split('.')) != 3:
        raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")

    try:
        header = google_jwt.decode_header(id_token)
        unverified_payload = google_jwt.decode(id_token, verify=False)
    except Exception as exc:
        logger.warning("Malformed Firebase JWT (%s): %s", type(exc).__name__, exc)
        raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")

    alg = header.get('alg')
    kid = header.get('kid')
    aud = unverified_payload.get('aud')
    iss = unverified_payload.get('iss')
    sub = unverified_payload.get('sub')
    expected_issuer = f"https://securetoken.google.com/{project_id}"

    if alg != 'RS256' or not kid:
        logger.warning("Firebase token rejected: invalid alg=%s or missing kid", alg)
        raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")
    if aud != project_id:
        logger.warning("Firebase token audience mismatch: expected=%s got=%s", project_id, aud)
        raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")
    if iss != expected_issuer:
        logger.warning("Firebase token issuer mismatch: expected=%s got=%s", expected_issuer, iss)
        raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")
    if not isinstance(sub, str) or not sub or len(sub) > 128:
        logger.warning("Firebase token rejected: invalid subject claim")
        raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")

    try:
        claims = google_id_token.verify_firebase_token(
            id_token,
            _get_cert_request(),
            audience=project_id,
            clock_skew_in_seconds=60,
        )
    except google.auth.exceptions.TransportError as exc:
        logger.error("Failed to fetch Google Firebase public certificates: %s", exc)
        raise exceptions.AuthenticationFailed(
            "Unable to contact Google authentication servers. Please try again."
        )
    except ValueError as exc:
        logger.warning("Firebase public cert verification failed: %s", exc)
        if 'expired' in str(exc).lower():
            raise exceptions.AuthenticationFailed("Authentication token expired. Please sign in again.")
        raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")
    except Exception as exc:
        logger.warning("Unexpected Firebase public cert verification error (%s): %s", type(exc).__name__, exc)
        raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")

    claims = dict(claims)
    claims['uid'] = claims.get('uid') or claims['sub']
    return claims


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return its decoded claims.
    Uses Firebase Admin SDK when a service account is configured, and falls back
    seamlessly to strict Google public x509 certificate verification when no
    service-account private key is present.
    """
    if not id_token or not isinstance(id_token, str):
        raise exceptions.AuthenticationFailed("Firebase ID token is required.")

    ensure_firebase_initialized()
    project_id = _get_firebase_project_id()

    if _HAS_SERVICE_ACCOUNT:
        try:
            return auth.verify_id_token(id_token, clock_skew_seconds=60)
        except google.auth.exceptions.DefaultCredentialsError:
            logger.warning("Firebase ADC missing during verify_id_token; falling back to public x509 verification.")
        except ValueError as exc:
            logger.warning("Firebase Admin token validation rejected input: %s", exc)
            raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")
        except Exception as exc:
            exc_name = type(exc).__name__
            if 'Expired' in exc_name:
                logger.warning("Firebase token expired: %s", exc)
                raise exceptions.AuthenticationFailed("Authentication token expired. Please sign in again.")
            if 'CertificateFetch' in exc_name:
                logger.error("Firebase Admin certificate fetch failed: %s", exc)
                raise exceptions.AuthenticationFailed(
                    "Unable to contact Google authentication servers. Please try again."
                )
            logger.warning("Firebase Admin token verification failed (%s): %s", exc_name, exc)
            raise exceptions.AuthenticationFailed("Invalid authentication token or token expired.")

    return _verify_firebase_token_with_public_certs(id_token, project_id)


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
