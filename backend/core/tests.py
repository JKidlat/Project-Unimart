"""
Comprehensive Security Test Suite for UNIMART Application.
Covers:
- Authentication, Token Expiry, and Blacklisting
- Object-Level Authorization (IDOR) on Products, Orders, Profiles
- Role-Based Access Control (RBAC) and Anti-Privilege Escalation
- Personal Identifiable Information (PII) Privacy in Public Endpoints
- Financial & Payment Gateway Amount Verification
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from universities.models import University
from accounts.models import Profile
from marketplace.models import Category, Product, WishlistItem
from orders.models import Order, OrderItem
from payments.models import Payment
from reviews.models import Review

User = get_user_model()


class SecurityTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create University
        self.uni = University.objects.create(name="University of Ghana", short_name="UG")

        # Create Category
        self.category = Category.objects.create(name="Electronics", slug="electronics")

        # User A (Buyer)
        self.user_a = User.objects.create_user(
            email="buyer.a@unimart.gh",
            password="SecurePassword123!"
        )
        self.user_a.full_name = "Buyer Alpha"
        self.user_a.save()
        self.profile_a = Profile.objects.create(user=self.user_a, university=self.uni, is_vendor=False)

        # User B (Seller)
        self.user_b = User.objects.create_user(
            email="seller.b@unimart.gh",
            password="SecurePassword123!"
        )
        self.user_b.full_name = "Seller Beta"
        self.user_b.save()
        self.profile_b = Profile.objects.create(user=self.user_b, university=self.uni, is_vendor=True)

        # User C (Another Seller)
        self.user_c = User.objects.create_user(
            email="seller.c@unimart.gh",
            password="SecurePassword123!"
        )
        self.user_c.full_name = "Seller Charlie"
        self.user_c.save()
        self.profile_c = Profile.objects.create(user=self.user_c, university=self.uni, is_vendor=True)

        # Staff Administrator
        self.admin_user = User.objects.create_superuser(
            email="admin@unimart.gh",
            password="AdminPassword123!"
        )
        self.admin_user.full_name = "System Administrator"
        self.admin_user.save()
        self.admin_profile = Profile.objects.create(user=self.admin_user, university=self.uni, is_vendor=False)

        # Create a sample live product owned by Seller B
        self.product_b = Product.objects.create(
            seller=self.user_b,
            university=self.uni,
            category=self.category,
            title="Scientific Calculator fx-991EX",
            description="Engineering calculator in great condition.",
            price=250.00,
            status="live",
            is_available=True
        )

    # =========================================================================
    # 1. AUTHENTICATION & TOKEN SECURITY
    # =========================================================================

    def test_unauthenticated_requests_blocked(self):
        """Unauthenticated requests to protected endpoints must return 401 Unauthorized."""
        protected_urls = [
            "/api/auth/me/",
            "/api/orders/",
            "/api/wishlist/",
            "/api/kyc/",
        ]
        for url in protected_urls:
            response = self.client.get(url)
            self.assertEqual(
                response.status_code, 
                status.HTTP_401_UNAUTHORIZED,
                f"URL {url} failed to block unauthenticated access."
            )

    def test_invalid_bearer_token_rejected(self):
        """Forged or malformed Bearer tokens must be rejected."""
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid.forged.jwttoken")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_revocation_on_logout(self):
        """Logging out must blacklist the refresh token, preventing replay attacks."""
        refresh = RefreshToken.for_user(self.user_a)
        access_token = str(refresh.access_token)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_resp = self.client.post("/api/auth/logout/", {"refresh": str(refresh)})
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)

        # Attempting to refresh access token using the blacklisted refresh token must fail
        refresh_resp = self.client.post("/api/auth/token/refresh/", {"refresh": str(refresh)})
        self.assertEqual(refresh_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # =========================================================================
    # 2. OBJECT-LEVEL AUTHORIZATION & IDOR DEFENSE
    # =========================================================================

    def test_seller_cannot_modify_another_sellers_product(self):
        """Seller C must not be able to update or modify Seller B's product."""
        refresh = RefreshToken.for_user(self.user_c)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        update_resp = self.client.patch(
            f"/api/products/{self.product_b.id}/",
            {"price": 10.00, "title": "Tampered Title"}
        )
        self.assertEqual(update_resp.status_code, status.HTTP_403_FORBIDDEN)
        
        self.product_b.refresh_from_db()
        self.assertEqual(float(self.product_b.price), 250.00)

    def test_seller_cannot_delete_another_sellers_product(self):
        """Seller C must not be able to delete Seller B's product."""
        refresh = RefreshToken.for_user(self.user_c)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        delete_resp = self.client.delete(f"/api/products/{self.product_b.id}/")
        self.assertEqual(delete_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Product.objects.filter(id=self.product_b.id).exists())

    def test_staff_admin_can_moderate_any_product(self):
        """Administrators must have authorized permission to moderate/update products."""
        refresh = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        mod_resp = self.client.patch(
            f"/api/products/{self.product_b.id}/",
            {"status": "rejected", "rejection_reason": "Policy violation"}
        )
        self.assertEqual(mod_resp.status_code, status.HTTP_200_OK)
        self.product_b.refresh_from_db()
        self.assertEqual(self.product_b.status, "rejected")

    def test_buyer_cannot_view_another_buyers_order(self):
        """User B must not be able to read or query User A's private order."""
        # Create an order placed by User A
        order = Order.objects.create(
            buyer=self.user_a,
            full_name="Buyer Alpha",
            phone_number="0240000000",
            total_amount=270.00,
            status="pending"
        )
        OrderItem.objects.create(
            order=order,
            product=self.product_b,
            seller=self.user_b,
            quantity=1,
            price_at_purchase=250.00,
            total_price=250.00
        )

        # Authenticate as Seller C (completely unrelated to the order)
        refresh = RefreshToken.for_user(self.user_c)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Direct access to User A's order must return 404
        resp = self.client.get(f"/api/orders/{order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        # Order listing must not include User A's order for Seller C
        list_resp = self.client.get("/api/orders/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        order_ids = [o["id"] for o in list_resp.data.get("results", list_resp.data)]
        self.assertNotIn(order.id, order_ids)

    def test_buyer_cannot_mark_own_order_completed(self):
        """Buyers must not be able to advance fulfillment or mark their own order as completed."""
        order = Order.objects.create(
            buyer=self.user_a,
            full_name="Buyer Alpha",
            total_amount=250.00,
            status="pending"
        )
        OrderItem.objects.create(
            order=order,
            product=self.product_b,
            seller=self.user_b,
            quantity=1,
            price_at_purchase=250.00,
            total_price=250.00
        )

        refresh = RefreshToken.for_user(self.user_a)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        tamper_resp = self.client.patch(
            f"/api/orders/{order.id}/",
            {"status": "completed"}
        )
        self.assertEqual(tamper_resp.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, "pending")

    # =========================================================================
    # 3. ROLE-BASED ACCESS CONTROL & ANTI-PRIVILEGE ESCALATION
    # =========================================================================

    def test_registration_prevents_admin_privilege_escalation(self):
        """Registering with role='Admin' or 'Super Admin' must not grant staff permissions."""
        resp = self.client.post("/api/auth/register/", {
            "email": "hacker@unimart.gh",
            "password": "StrongPassword123!",
            "full_name": "Bad Actor",
            "role": "Admin",
            "is_staff": True,
            "is_superuser": True
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email="hacker@unimart.gh")
        self.assertFalse(new_user.is_staff)
        self.assertFalse(new_user.is_superuser)

    def test_regular_user_cannot_access_admin_user_directory(self):
        """Non-admin users querying /api/auth/users/ must receive 403 Forbidden."""
        refresh = RefreshToken.for_user(self.user_a)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        resp = self.client.get("/api/auth/users/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can access
        admin_refresh = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_refresh.access_token}")
        admin_resp = self.client.get("/api/auth/users/")
        self.assertEqual(admin_resp.status_code, status.HTTP_200_OK)

    def test_seller_cannot_self_approve_ad_listing(self):
        """Updating a listing must not allow standard sellers to set status='live' or is_available=True."""
        refresh = RefreshToken.for_user(self.user_b)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Set product to pending review
        self.product_b.status = "pending_approval"
        self.product_b.is_available = False
        self.product_b.save()

        patch_resp = self.client.patch(
            f"/api/products/{self.product_b.id}/",
            {"status": "live", "is_available": True, "title": "Updated Title"}
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.product_b.refresh_from_db()
        # Must still be pending_approval and not live
        self.assertEqual(self.product_b.status, "pending_approval")
        self.assertFalse(self.product_b.is_available)

    # =========================================================================
    # 4. DATA PRIVACY (PII SANITIZATION)
    # =========================================================================

    def test_product_listing_does_not_expose_seller_email(self):
        """Public product endpoints must not leak seller personal email addresses."""
        resp = self.client.get("/api/products/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get("results", resp.data)
        self.assertGreater(len(results), 0)
        
        for item in results:
            seller_details = item.get("seller_details", {})
            self.assertNotIn("email", seller_details, "Private seller email was leaked in public product API!")

    def test_review_listing_does_not_expose_reviewer_email(self):
        """Public review endpoints must not expose student email addresses."""
        # Create completed order so User A can leave a review
        order = Order.objects.create(
            buyer=self.user_a,
            full_name="Buyer Alpha",
            total_amount=250.00,
            status="completed"
        )
        OrderItem.objects.create(
            order=order,
            product=self.product_b,
            seller=self.user_b,
            quantity=1,
            price_at_purchase=250.00,
            total_price=250.00
        )

        Review.objects.create(
            user=self.user_a,
            product=self.product_b,
            rating=5,
            comment="Excellent calculator for exams!"
        )

        resp = self.client.get("/api/reviews/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        reviews = resp.data.get("results", resp.data)
        self.assertGreater(len(reviews), 0)

        for rev in reviews:
            self.assertNotIn("user_email", rev, "Student email was leaked in public review API!")
            self.assertNotIn("@", str(rev.get("user_name", "")), "Email detected in reviewer name!")

    # =========================================================================
    # 5. FINANCIAL / PAYMENT GATEWAY INTEGRITY
    # =========================================================================

    def test_payment_amount_tampering_rejected(self):
        """Payment verification must reject references where the gateway amount is less than order total."""
        order = Order.objects.create(
            buyer=self.user_a,
            total_amount=500.00,
            status="pending"
        )

        refresh = RefreshToken.for_user(self.user_a)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Attempt payment verification with a tampered minor amount
        verify_resp = self.client.post("/api/payments/verify/", {
            "reference": "tampered_ref_123",
            "order_id": order.id,
            "amount": 1.00 # Attempting to pay GH₵1 for a GH₵500 order
        })
        # If in debug mode without secret, check that status was not silently converted to paid with underpayment
        order.refresh_from_db()
        self.assertNotEqual(order.status, "completed")
