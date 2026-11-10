import json
import re
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
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
        cache.clear()
        self.client = APIClient()
        self.university, _ = University.objects.get_or_create(
            short_name="UG",
            defaults={"name": "University of Ghana"},
        )

    def tearDown(self):
        cache.clear()

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

    def test_resend_surfaces_provider_error_instead_of_silent_success(self):
        import io
        import urllib.error
        err_stream = io.BytesIO(b'{"message": "Domain is not verified on Resend"}')
        http_err = urllib.error.HTTPError("https://api.resend.com/emails", 403, "Forbidden", {}, err_stream)
        with patch("accounts.emails.urllib.request.urlopen", side_effect=http_err):
            reg_res = self.client.post(
                "/api/auth/register/",
                {"email": "failmail@st.ug.edu.gh", "password": "StrongPassword123!"},
                format="json",
            )
            self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)
            self.assertFalse(reg_res.data["verification_email_sent"])
            self.assertIn("Domain is not verified", reg_res.data["verification_email_error"])

            err_stream2 = io.BytesIO(b'{"message": "Domain is not verified on Resend"}')
            http_err2 = urllib.error.HTTPError("https://api.resend.com/emails", 403, "Forbidden", {}, err_stream2)
            with patch("accounts.emails.urllib.request.urlopen", side_effect=http_err2):
                self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {reg_res.data['tokens']['access']}")
                resend_fail = self.client.post("/api/auth/resend-verification/", {}, format="json")
                self.assertEqual(resend_fail.status_code, status.HTTP_502_BAD_GATEWAY)
                self.assertFalse(resend_fail.data["sent"])
                self.assertIn("Domain is not verified", resend_fail.data["error"])

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
    def test_unregistered_google_rejected_and_existing_buyer_vendor_linking(self, mock_verify):
        initial_count = User.objects.count()

        # 1. Reject unverified Google email
        mock_verify.return_value = {"email": "spoof@gmail.com", "email_verified": False, "uid": "u1"}
        bad_res = self.client.post("/api/auth/google/", {"id_token": "fake"}, format="json")
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Reject invalid token
        mock_verify.side_effect = AuthenticationFailed("Invalid token")
        err_res = self.client.post("/api/auth/google/", {"id_token": "expired"}, format="json")
        self.assertEqual(err_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 3. Unregistered user clicking Google Sign-In MUST NOT auto-create User or Profile
        mock_verify.side_effect = None
        mock_verify.return_value = {
            "uid": "unregistered-uid-1",
            "email": "brandnew.student@gmail.com",
            "email_verified": True,
            "name": "Brand New",
        }
        new_res = self.client.post("/api/auth/google/", {"id_token": "valid-token", "role": "Seller"}, format="json")
        self.assertEqual(new_res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(new_res.data["code"], "ACCOUNT_NOT_FOUND")
        self.assertEqual(User.objects.count(), initial_count)
        self.assertFalse(User.objects.filter(email="brandnew.student@gmail.com").exists())

        # 4. Existing unverified email/password Buyer cannot blindly auto-link; requires password confirmation
        buyer = User.objects.create_user(email="buyer.link@gmail.com", password="BuyerPassword123!")
        buyer.is_email_verified = False
        buyer.save()
        Profile.objects.create(user=buyer, university=self.university, is_vendor=False)

        mock_verify.return_value = {
            "uid": "buyer-uid-1",
            "email": "buyer.link@gmail.com",
            "email_verified": True,
            "name": "Buyer Linked",
        }
        unverified_res = self.client.post("/api/auth/google/", {"id_token": "valid-token"}, format="json")
        self.assertEqual(unverified_res.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(unverified_res.data["code"], "ACCOUNT_LINK_VERIFICATION_REQUIRED")

        # Wrong password rejects link
        wrong_pw = self.client.post(
            "/api/auth/google/link/",
            {"id_token": "valid-token", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(wrong_pw.status_code, status.HTTP_401_UNAUTHORIZED)

        # Correct password safely links firebase_uid & logs Buyer in preserving PK & role='Buyer'
        link_res = self.client.post(
            "/api/auth/google/link/",
            {"id_token": "valid-token", "password": "BuyerPassword123!"},
            format="json",
        )
        self.assertEqual(link_res.status_code, status.HTTP_200_OK)
        self.assertTrue(link_res.data["linked_now"])
        self.assertEqual(link_res.data["user"]["id"], buyer.id)
        self.assertEqual(link_res.data["user"]["role"], "Buyer")
        buyer.refresh_from_db()
        self.assertEqual(buyer.firebase_uid, "buyer-uid-1")

        # Subsequent Google Sign-In with linked firebase_uid works directly
        relogin = self.client.post("/api/auth/google/", {"id_token": "valid-token"}, format="json")
        self.assertEqual(relogin.status_code, status.HTTP_200_OK)
        self.assertFalse(relogin.data["linked_now"])

    @patch("accounts.emails.urllib.request.urlopen", return_value=FakeHTTPResponse(200))
    @patch("accounts.views.verify_firebase_token")
    def test_existing_vendor_linking_uid_mismatch_and_suspended_account_blocked(self, mock_verify, _mock_urlopen):
        # Register Seller with business_name & university name (preserving signup workflow)
        reg_res = self.client.post(
            "/api/auth/register/",
            {
                "email": "vendor.kofi@gmail.com",
                "password": "VendorPassword123!",
                "full_name": "Kofi Vendor",
                "phone_number": "0241234567",
                "university": "University of Ghana (UG)",
                "role": "Seller",
                "business_name": "Kofi's Campus Tech",
            },
            format="json",
        )
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)
        vendor = User.objects.get(email="vendor.kofi@gmail.com")
        self.assertEqual(vendor.profile.university, self.university)
        self.assertEqual(vendor.profile.business_name, "Kofi's Campus Tech")
        self.assertTrue(vendor.profile.is_vendor)

        # Verify vendor email, then sign in with Google -> links existing Vendor and returns Seller role
        verify_token = make_email_verification_token(vendor)
        self.assertEqual(
            self.client.post("/api/auth/verify-email/", {"token": verify_token}, format="json").status_code,
            status.HTTP_200_OK,
        )

        mock_verify.return_value = {
            "uid": "vendor-uid-abc",
            "email": "vendor.kofi@gmail.com",
            "email_verified": True,
            "name": "Kofi Vendor",
        }
        v_res = self.client.post("/api/auth/google/", {"id_token": "vendor-token"}, format="json")
        self.assertEqual(v_res.status_code, status.HTTP_200_OK)
        self.assertEqual(v_res.data["user"]["id"], vendor.id)
        self.assertEqual(v_res.data["user"]["role"], "Seller")
        self.assertEqual(v_res.data["user"]["business_name"], "Kofi's Campus Tech")

        # Different Firebase UID attempting to bind same email is strictly rejected
        mock_verify.return_value = {
            "uid": "attacker-different-uid",
            "email": "vendor.kofi@gmail.com",
            "email_verified": True,
        }
        mismatch_res = self.client.post("/api/auth/google/", {"id_token": "other-token"}, format="json")
        self.assertEqual(mismatch_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(mismatch_res.data["code"], "FIREBASE_UID_MISMATCH")

        # Suspended / inactive user cannot use Google Sign-In
        vendor.is_active = False
        vendor.save(update_fields=["is_active"])
        mock_verify.return_value = {
            "uid": "vendor-uid-abc",
            "email": "vendor.kofi@gmail.com",
            "email_verified": True,
        }
        suspended_res = self.client.post("/api/auth/google/", {"id_token": "vendor-token"}, format="json")
        self.assertEqual(suspended_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(suspended_res.data["code"], "ACCOUNT_INACTIVE")

    def test_role_enforcement_buyer_cannot_promote_self_or_post_product_and_seller_blocked_from_admin(self):
        buyer = User.objects.create_user(email="only.buyer@ug.edu.gh", password="StrongPassword123!")
        buyer.is_email_verified = True
        buyer.save()
        Profile.objects.create(user=buyer, university=self.university, is_vendor=False)

        vendor = User.objects.create_user(email="real.seller@ug.edu.gh", password="StrongPassword123!")
        vendor.is_email_verified = True
        vendor.save()
        Profile.objects.create(user=vendor, university=self.university, is_vendor=True, business_name="Campus Books")

        # Buyer tries to self-escalate to Seller via PATCH /api/auth/me/ -> rejected 400
        self.client.force_authenticate(user=buyer)
        esc_res = self.client.patch("/api/auth/me/", {"role": "Seller", "is_vendor": True}, format="json")
        self.assertEqual(esc_res.status_code, status.HTTP_400_BAD_REQUEST)
        buyer.refresh_from_db()
        self.assertFalse(buyer.profile.is_vendor)

        # Buyer tries vendor endpoint POST /api/products/ -> 403 Forbidden
        prod_res = self.client.post(
            "/api/products/",
            {"title": "Illegal Item", "price": "50.00", "description": "test"},
            format="json",
        )
        self.assertEqual(prod_res.status_code, status.HTTP_403_FORBIDDEN)

        # Vendor tries Admin endpoint GET /api/auth/users/ -> 403 Forbidden
        self.client.force_authenticate(user=vendor)
        adm_res = self.client.get("/api/auth/users/")
        self.assertEqual(adm_res.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(FIREBASE_PROJECT_ID="unimart-c4308", SECURE_SSL_REDIRECT=False)
class RealFirebasePublicCertVerificationTests(TestCase):
    """Verify real RS256 Firebase ID tokens without any service account JSON (production Render mode)."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        import datetime
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.x509.oid import NameOID
        import jwt as pyjwt

        cls.pyjwt = pyjwt
        cls.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        now = datetime.datetime.now(datetime.timezone.utc)
        subject = issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "securetoken.system.gserviceaccount.com")])
        cert = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(cls.private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(minutes=5))
            .not_valid_after(now + datetime.timedelta(days=1))
            .sign(cls.private_key, hashes.SHA256())
        )
        cls.kid = "test-kid-1"
        cls.cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode("utf-8")

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.university, _ = University.objects.get_or_create(
            short_name="KNUST",
            defaults={"name": "Kwame Nkrumah University of Science and Technology"},
        )

    def tearDown(self):
        cache.clear()

    def _sign_firebase_jwt(self, overrides=None, alg="RS256", kid=None):
        import time
        now = int(time.time())
        payload = {
            "iss": "https://securetoken.google.com/unimart-c4308",
            "aud": "unimart-c4308",
            "auth_time": now - 10,
            "user_id": "firebase-uid-99",
            "sub": "firebase-uid-99",
            "iat": now - 10,
            "exp": now + 3600,
            "email": "student.google@gmail.com",
            "email_verified": True,
            "name": "Kwame Google",
        }
        if overrides:
            payload.update(overrides)
        headers = {"kid": self.kid if kid is None else kid}
        return self.pyjwt.encode(payload, self.private_key, algorithm=alg, headers=headers)

    @patch("accounts.authentication._HAS_SERVICE_ACCOUNT", False)
    @patch("google.oauth2.id_token._fetch_certs")
    def test_verify_real_rs256_token_without_service_account_and_admin_preserve(self, mock_fetch_certs):
        mock_fetch_certs.return_value = {self.kid: self.cert_pem}

        # Existing administrator logs in with Google -> preserves PK, role=Admin, is_staff=True
        admin_user = User.objects.create_superuser(email="admin.google@gmail.com", password="AdminPass123!")
        admin_user.is_email_verified = True
        admin_user.save(update_fields=["is_email_verified"])
        admin_pk = admin_user.pk
        admin_token = self._sign_firebase_jwt({"email": "admin.google@gmail.com", "sub": "adm-uid-1"})

        # Even with a stale invalid Bearer token in header, /api/auth/google/ succeeds cleanly
        self.client.credentials(HTTP_AUTHORIZATION="Bearer stale-invalid-jwt-token")
        admin_res = self.client.post("/api/auth/google/", {"id_token": admin_token}, format="json")
        self.assertEqual(admin_res.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_res.data["user"]["id"], admin_pk)
        self.assertEqual(admin_res.data["user"]["role"], "Admin")
        self.assertTrue(admin_res.data["user"]["is_staff"])

        # Admin can access protected admin endpoint and profile using issued SimpleJWT
        admin_access = admin_res.data["tokens"]["access"]
        admin_refresh = admin_res.data["tokens"]["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_access}")
        self.assertEqual(self.client.get("/api/auth/users/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_200_OK)

        # Logout invalidates refresh token, then fresh Google sign-in succeeds again
        logout_res = self.client.post("/api/auth/logout/", {"refresh": admin_refresh}, format="json")
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)
        refresh_replay = self.client.post("/api/auth/token/refresh/", {"refresh": admin_refresh}, format="json")
        self.assertEqual(refresh_replay.status_code, status.HTTP_401_UNAUTHORIZED)

        # Unregistered Google user is rejected 404 (not auto-created)
        self.client.credentials()
        unreg_token = self._sign_firebase_jwt({"email": "unregistered.google@gmail.com", "sub": "unreg-uid-99"})
        unreg_res = self.client.post("/api/auth/google/", {"id_token": unreg_token}, format="json")
        self.assertEqual(unreg_res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(unreg_res.data["code"], "ACCOUNT_NOT_FOUND")
        self.assertFalse(User.objects.filter(email="unregistered.google@gmail.com").exists())

        # Direct Bearer Firebase token for unregistered user also rejected cleanly by FirebaseAuthentication
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {unreg_token}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)

        # Reject Google OAuth access token format (ya29....), expired JWT, wrong audience, wrong issuer
        self.client.credentials()
        self.assertEqual(
            self.client.post("/api/auth/google/", {"id_token": "ya29.a0AfH6SMFakeAccessToken"}, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        import time
        from accounts.authentication import verify_firebase_token
        expired_token = self._sign_firebase_jwt({"exp": int(time.time()) - 300, "iat": int(time.time()) - 600})
        with self.assertRaises(AuthenticationFailed):
            verify_firebase_token(expired_token)
        wrong_aud = self._sign_firebase_jwt({"aud": "wrong-project"})
        with self.assertRaises(AuthenticationFailed):
            verify_firebase_token(wrong_aud)
        wrong_iss = self._sign_firebase_jwt({"iss": "https://accounts.google.com"})
        with self.assertRaises(AuthenticationFailed):
            verify_firebase_token(wrong_iss)
