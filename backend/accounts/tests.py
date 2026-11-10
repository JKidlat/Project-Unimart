import json
import re
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIClient

from accounts.emails import make_email_verification_token
from accounts.models import Profile
from universities.models import University

User = get_user_model()


class FakeHTTPResponse:
    def __init__(self, status_code=200):
        self.status = status_code

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        return False


@override_settings(
    RESEND_API_KEY="re_test_key",
    DEFAULT_FROM_EMAIL="Unimart <noreply@unimart.gh>",
    FRONTEND_URL="https://project-unimart.vercel.app",
    SECURE_SSL_REDIRECT=False,
)
class AuthFlowsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.university = University.objects.create(name="University of Ghana", short_name="UG")

    @patch("accounts.emails.urllib.request.urlopen", return_value=FakeHTTPResponse(200))
    def test_signup_requires_verification_and_verify_unlocks_actions(self, mock_urlopen):
        res = self.client.post(
            "/api/auth/register/",
            {
                "email": "student1@st.ug.edu.gh",
                "password": "StrongPass123!",
                "full_name": "Ama Serwaa",
                "phone_number": "0240001111",
                "university_id": self.university.id,
                "role": "Seller",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(res.data["user"]["is_email_verified"])
        self.assertTrue(res.data["verification_email_sent"])
        self.assertEqual(mock_urlopen.call_count, 1)

        # Extract token from outbound Resend email JSON payload
        req_obj = mock_urlopen.call_args[0][0]
        sent_payload = json.loads(req_obj.data.decode("utf-8"))
        match = re.search(r"token=([^\s&\"<]+)", sent_payload["text"])
        self.assertIsNotNone(match)
        from urllib.parse import unquote
        token = unquote(match.group(1))

        # Unverified user is blocked from creating products, orders, or submitting KYC
        access = res.data["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        kyc_res = self.client.post(
            "/api/kyc/",
            {"businessName": "Ama Books", "mode": "seller_first"},
            format="json",
        )
        self.assertEqual(kyc_res.status_code, status.HTTP_403_FORBIDDEN)

        # Tampered token fails
        bad_verify = self.client.post("/api/auth/verify-email/", {"token": token + "tampered"}, format="json")
        self.assertEqual(bad_verify.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid token verifies user and unlocks KYC submission
        verify_res = self.client.post("/api/auth/verify-email/", {"token": token}, format="json")
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_res.data["user"]["is_email_verified"])

        kyc_ok = self.client.post(
            "/api/kyc/",
            {"businessName": "Ama Books", "mode": "seller_first"},
            format="json",
        )
        self.assertEqual(kyc_ok.status_code, status.HTTP_201_CREATED)

        # Resend says already verified
        resend_res = self.client.post("/api/auth/resend-verification/", {}, format="json")
        self.assertEqual(resend_res.status_code, status.HTTP_200_OK)
        self.assertTrue(resend_res.data["already_verified"])

    @patch("accounts.emails.urllib.request.urlopen", return_value=FakeHTTPResponse(200))
    def test_password_reset_flow_and_token_single_use(self, mock_urlopen):
        user = User.objects.create_user(email="resetme@ug.edu.gh", password="OldPassword123!")
        Profile.objects.create(user=user, university=self.university)

        # Unknown email still returns 200 to prevent enumeration
        anon_res = self.client.post("/api/auth/password-reset/", {"email": "nobody@ug.edu.gh"}, format="json")
        self.assertEqual(anon_res.status_code, status.HTTP_200_OK)
        self.assertEqual(mock_urlopen.call_count, 0)

        # Registered email triggers reset email
        req_res = self.client.post("/api/auth/password-reset/", {"email": "resetme@ug.edu.gh"}, format="json")
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        self.assertEqual(mock_urlopen.call_count, 1)

        sent_payload = json.loads(mock_urlopen.call_args[0][0].data.decode("utf-8"))
        match = re.search(r"uid=([^&\s]+)&token=([^\s\"<]+)", sent_payload["text"])
        self.assertIsNotNone(match)
        from urllib.parse import unquote
        uid = unquote(match.group(1))
        token = unquote(match.group(2))

        # Rejects weak password
        weak_res = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": uid, "token": token, "new_password": "123"},
            format="json",
        )
        self.assertEqual(weak_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid reset updates password & verifies email
        ok_res = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": uid, "token": token, "new_password": "NewStrongPassword99!"},
            format="json",
        )
        self.assertEqual(ok_res.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_email_verified)

        # Single-use token cannot be reused
        reuse_res = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": uid, "token": token, "new_password": "AnotherPassword99!"},
            format="json",
        )
        self.assertEqual(reuse_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Can log in with new password
        login_res = self.client.post(
            "/api/auth/login/",
            {"email": "resetme@ug.edu.gh", "password": "NewStrongPassword99!"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

    @patch("accounts.views.verify_firebase_token")
    def test_google_auth_token_exchange_and_privilege_safety(self, mock_verify):
        # Reject unverified Google email
        mock_verify.return_value = {"email": "spoof@gmail.com", "email_verified": False, "uid": "u1"}
        bad_res = self.client.post("/api/auth/google/", {"id_token": "fake"}, format="json")
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Reject invalid token
        mock_verify.side_effect = AuthenticationFailed("Invalid token")
        err_res = self.client.post("/api/auth/google/", {"id_token": "expired"}, format="json")
        self.assertEqual(err_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Valid Google login creates verified user and prevents Admin escalation
        mock_verify.side_effect = None
        mock_verify.return_value = {
            "uid": "google-uid-123",
            "email": "kofi.google@gmail.com",
            "email_verified": True,
            "name": "Kofi Google",
            "picture": "https://example.com/avatar.png",
        }
        res = self.client.post(
            "/api/auth/google/",
            {"id_token": "valid-google-token", "role": "Admin", "university_id": self.university.id},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["is_new_user"])
        self.assertEqual(res.data["user"]["role"], "Buyer")
        self.assertFalse(res.data["user"]["is_staff"])
        self.assertTrue(res.data["user"]["is_email_verified"])
        self.assertIn("access", res.data["tokens"])

        # Subsequent Google login preserves account and skips re-creation
        res2 = self.client.post("/api/auth/google/", {"id_token": "valid-google-token"}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertFalse(res2.data["is_new_user"])
