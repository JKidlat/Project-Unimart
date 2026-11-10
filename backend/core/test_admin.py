from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import KYCSubmission, Profile, RoleChangeRequest
from marketplace.models import Category, Product
from orders.models import Order, OrderItem
from payments.models import Payment
from reviews.models import Review
from universities.models import University

User = get_user_model()


class AdminPanelAccessAndDatabaseTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.uni, _ = University.objects.get_or_create(
            short_name="UG", defaults={"name": "University of Ghana"}
        )
        self.category = Category.objects.create(name="Electronics", slug="electronics")

        self.buyer = User.objects.create_user(email="admtest.buyer@st.ug.edu.gh", password="StrongPassword123!")
        self.buyer.full_name = "Kwesi Buyer"
        self.buyer.is_email_verified = True
        self.buyer.save()
        self.buyer_profile = Profile.objects.create(user=self.buyer, university=self.uni, is_vendor=False)

        self.seller = User.objects.create_user(email="admtest.seller@st.ug.edu.gh", password="StrongPassword123!")
        self.seller.full_name = "Akua Seller"
        self.seller.is_email_verified = True
        self.seller.save()
        self.seller_profile = Profile.objects.create(
            user=self.seller, university=self.uni, is_vendor=True, business_name="Akua Gadgets"
        )

        self.staff_admin = User.objects.create_user(email="admtest.staff@unimart.gh", password="StrongPassword123!")
        self.staff_admin.full_name = "Staff Moderator"
        self.staff_admin.is_staff = True
        self.staff_admin.is_email_verified = True
        self.staff_admin.save()
        Profile.objects.create(user=self.staff_admin, university=self.uni, is_vendor=False)

        self.superuser = User.objects.create_superuser(email="admtest.super@unimart.gh", password="SuperPassword123!")
        self.superuser.full_name = "Super Admin"
        self.superuser.is_email_verified = True
        self.superuser.save()
        Profile.objects.create(user=self.superuser, university=self.uni, is_vendor=False)

    def _auth_as(self, user):
        if user is None:
            self.client.credentials()
            return
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_all_admin_endpoints_enforce_401_and_403(self):
        admin_endpoints = [
            "/api/admin/dashboard/",
            "/api/admin/activity/",
            "/api/admin/users/",
            "/api/admin/products/",
            "/api/admin/orders/",
            "/api/admin/reviews/",
            "/api/admin/role-requests/",
            "/api/admin/universities/",
            "/api/admin/security/admins/",
            "/api/auth/users/",
            "/api/products/?status=all",
        ]

        # Unauthenticated -> 401
        self._auth_as(None)
        for url in admin_endpoints:
            res = self.client.get(url)
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED, f"{url} did not return 401")

        # Buyer -> 403
        self._auth_as(self.buyer)
        for url in admin_endpoints:
            res = self.client.get(url)
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, f"{url} allowed Buyer!")

        # Vendor/Seller -> 403
        self._auth_as(self.seller)
        for url in admin_endpoints:
            res = self.client.get(url)
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, f"{url} allowed Seller!")

        # Authorized Admin -> 200
        self._auth_as(self.staff_admin)
        for url in admin_endpoints:
            res = self.client.get(url)
            self.assertEqual(res.status_code, status.HTTP_200_OK, f"{url} blocked Admin!")

    def test_empty_database_dashboard_returns_exact_real_counts_no_fakes(self):
        self._auth_as(self.staff_admin)
        res = self.client.get("/api/admin/dashboard/?range=7d")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        stats = res.data["stats"]

        self.assertEqual(stats["total_users"], 4)
        self.assertEqual(stats["total_buyers"], 1)
        self.assertEqual(stats["total_sellers"], 1)
        self.assertEqual(stats["total_admins"], 2)
        self.assertEqual(stats["suspended_users"], 0)
        self.assertEqual(stats["total_products"], 0)
        self.assertEqual(stats["total_orders"], 0)
        self.assertEqual(stats["total_revenue"], 0.0)
        self.assertEqual(stats["pending_kyc"], 0)
        self.assertEqual(stats["total_universities"], 67)
        self.assertEqual(len(res.data["revenue_series"]), 7)
        self.assertTrue(all(pt["revenue"] == 0.0 and pt["orders"] == 0 for pt in res.data["revenue_series"]))

    def test_dashboard_and_workflows_reflect_real_db_mutations(self):
        product = Product.objects.create(
            seller=self.seller,
            university=self.uni,
            category=self.category,
            title="MacBook Pro",
            description="Good laptop",
            price=4000,
            status="pending_approval",
            is_available=False,
        )
        kyc = KYCSubmission.objects.create(
            user=self.buyer,
            email=self.buyer.email,
            institution_email=self.buyer.email,
            business_name="Kwesi Hub",
            mode="buyer_upgrade",
            status="pending",
        )
        order = Order.objects.create(
            buyer=self.buyer,
            full_name="Kwesi Buyer",
            phone_number="0240000000",
            university=self.uni.name,
            total_amount=4020,
            payment_method="paystack",
            payment_reference="pstk_real_001",
            status="paid",
            refund_status="requested",
        )
        OrderItem.objects.create(
            order=order,
            product=product,
            seller=self.seller,
            quantity=1,
            price_at_purchase=4000,
            total_price=4000,
        )
        Payment.objects.create(
            order=order, user=self.buyer, reference="pstk_real_001", amount=4020, status="success"
        )
        review = Review.objects.create(
            user=self.buyer, product=product, rating=5, comment="Great laptop!", moderation_status="approved"
        )
        role_req = RoleChangeRequest.objects.create(
            user=self.seller,
            current_role="Seller",
            requested_role="Buyer",
            reason="Graduated",
            status="pending",
        )

        # Dashboard counts match DB
        self._auth_as(self.staff_admin)
        dash = self.client.get("/api/admin/dashboard/")
        self.assertEqual(dash.status_code, status.HTTP_200_OK)
        self.assertEqual(dash.data["stats"]["total_products"], 1)
        self.assertEqual(dash.data["stats"]["pending_ads"], 1)
        self.assertEqual(dash.data["stats"]["pending_kyc"], 1)
        self.assertEqual(dash.data["stats"]["pending_role_requests"], 1)
        self.assertEqual(dash.data["stats"]["total_orders"], 1)
        self.assertEqual(dash.data["stats"]["total_revenue"], 4020.0)
        self.assertEqual(dash.data["stats"]["refund_requests"], 1)

        # Admin approves product -> goes live
        prod_patch = self.client.patch(f"/api/admin/products/{product.id}/", {"status": "live"}, format="json")
        self.assertEqual(prod_patch.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.status, "live")
        self.assertTrue(product.is_available)

        # Deleting product that has OrderItem safely archives as hidden rather than raising ProtectedError
        prod_del = self.client.delete(f"/api/admin/products/{product.id}/")
        self.assertEqual(prod_del.status_code, status.HTTP_200_OK)
        self.assertTrue(prod_del.data["archived"])
        product.refresh_from_db()
        self.assertEqual(product.status, "hidden")
        self.assertFalse(product.is_available)

        # Admin approves KYC -> updates DB status + upgrades buyer to Seller
        kyc_res = self.client.patch(f"/api/kyc/{kyc.id}/", {"status": "approved"}, format="json")
        self.assertEqual(kyc_res.status_code, status.HTTP_200_OK)
        kyc.refresh_from_db()
        self.buyer_profile.refresh_from_db()
        self.buyer.refresh_from_db()
        self.assertEqual(kyc.status, "approved")
        self.assertTrue(self.buyer_profile.is_vendor)
        self.assertTrue(self.buyer.is_verified_student)

        # Admin processes refund on order
        ord_res = self.client.patch(
            f"/api/admin/orders/{order.id}/", {"action": "process_refund"}, format="json"
        )
        self.assertEqual(ord_res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.refund_status, "refunded")
        self.assertEqual(order.status, "cancelled")

        # Admin flags abusive review -> hidden from public /api/reviews/
        rev_res = self.client.patch(
            f"/api/admin/reviews/{review.id}/",
            {"status": "flagged", "flagReason": "Abusive"},
            format="json",
        )
        self.assertEqual(rev_res.status_code, status.HTTP_200_OK)
        pub_reviews = self.client.get("/api/reviews/")
        self.assertEqual(len(pub_reviews.data["results"]), 0)

        # Admin approves Seller -> Buyer role change request
        role_res = self.client.patch(
            f"/api/admin/role-requests/{role_req.id}/",
            {"status": "approved", "adminNote": "Verified graduation"},
            format="json",
        )
        self.assertEqual(role_res.status_code, status.HTTP_200_OK)
        self.seller_profile.refresh_from_db()
        self.assertFalse(self.seller_profile.is_vendor)

        # Real activity stream returns actual DB records
        act_res = self.client.get("/api/admin/activity/")
        self.assertEqual(act_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(act_res.data["results"]), 4)

    def test_admin_privileges_protected_against_escalation_and_tampering(self):
        # Buyer cannot promote self to Admin via /api/auth/me/
        self._auth_as(self.buyer)
        esc_res = self.client.patch("/api/auth/me/", {"role": "Admin"}, format="json")
        self.assertEqual(esc_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.buyer.refresh_from_db()
        self.assertFalse(self.buyer.is_staff)

        # Regular staff admin cannot suspend self or promote to Admin or manage admins
        self._auth_as(self.staff_admin)
        self_susp = self.client.patch(
            f"/api/admin/users/{self.staff_admin.id}/", {"is_active": False}, format="json"
        )
        self.assertEqual(self_susp.status_code, status.HTTP_400_BAD_REQUEST)

        prom_res = self.client.patch(
            f"/api/admin/users/{self.buyer.id}/", {"role": "Admin"}, format="json"
        )
        self.assertEqual(prom_res.status_code, status.HTTP_403_FORBIDDEN)

        non_super_add = self.client.post(
            "/api/admin/security/admins/",
            {"email": self.buyer.email},
            format="json",
        )
        self.assertEqual(non_super_add.status_code, status.HTTP_403_FORBIDDEN)

        # Superuser CAN provision/remove staff admin, but cannot remove self
        self._auth_as(self.superuser)
        super_del_self = self.client.delete(f"/api/admin/security/admins/{self.superuser.id}/")
        self.assertEqual(super_del_self.status_code, status.HTTP_400_BAD_REQUEST)

        super_add = self.client.post(
            "/api/admin/security/admins/",
            {"email": "new.co.admin@unimart.gh", "full_name": "New Co Admin", "password": "VeryStrongPassword99!"},
            format="json",
        )
        self.assertEqual(super_add.status_code, status.HTTP_201_CREATED)
        new_admin_id = super_add.data["admin"]["id"]

        super_rev = self.client.delete(f"/api/admin/security/admins/{new_admin_id}/")
        self.assertEqual(super_rev.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.get(id=new_admin_id).is_staff)

        # Admin password change + deactivated admin blocked from admin endpoints
        self._auth_as(self.staff_admin)
        bad_pw = self.client.post(
            "/api/auth/change-password/",
            {"current_password": "WrongPassword!", "new_password": "EvenStrongerPassword99!"},
            format="json",
        )
        self.assertEqual(bad_pw.status_code, status.HTTP_400_BAD_REQUEST)

        ok_pw = self.client.post(
            "/api/auth/change-password/",
            {"current_password": "StrongPassword123!", "new_password": "EvenStrongerPassword99!"},
            format="json",
        )
        self.assertEqual(ok_pw.status_code, status.HTTP_200_OK)
        self._auth_as(None)
        relogin = self.client.post(
            "/api/auth/login/",
            {"email": self.staff_admin.email, "password": "EvenStrongerPassword99!"},
            format="json",
        )
        self.assertEqual(relogin.status_code, status.HTTP_200_OK)

        # Deactivated staff user is rejected at both JWT auth (401) and IsPlatformAdmin permission layer (403)
        self.staff_admin.is_active = False
        self.staff_admin.save(update_fields=["is_active"])
        self._auth_as(self.staff_admin)
        self.assertEqual(self.client.get("/api/admin/dashboard/").status_code, status.HTTP_401_UNAUTHORIZED)
        self._auth_as(None)
        self.client.force_authenticate(user=self.staff_admin)
        self.assertEqual(self.client.get("/api/admin/dashboard/").status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=None)

    def test_newly_added_university_works_for_signup(self):
        self._auth_as(self.staff_admin)
        res = self.client.post(
            "/api/admin/universities/",
            {
                "name": "Ghana Institute of Public Health Studies",
                "short_name": "GIPHS",
                "category": "Private Universities and University Colleges",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        uni_id = res.data["id"]

        self._auth_as(None)
        public_unis = self.client.get("/api/universities/")
        self.assertTrue(any(u["id"] == uni_id for u in public_unis.data))

        reg = self.client.post(
            "/api/auth/register/",
            {
                "email": "fresh.student@giphs.edu.gh",
                "password": "FreshStudentPass123!",
                "full_name": "Fresh Student",
                "university_id": uni_id,
                "role": "Buyer",
            },
            format="json",
        )
        self.assertEqual(reg.status_code, status.HTTP_201_CREATED)
        self.assertEqual(reg.data["user"]["university_id"], uni_id)
        self.assertEqual(reg.data["user"]["university_name"], "Ghana Institute of Public Health Studies")
