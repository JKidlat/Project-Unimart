from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Profile
from marketplace.models import Category, Product
from universities.catalog import (
    CANONICAL_UNIVERSITIES,
    CATEGORY_PRIVATE,
    CATEGORY_PUBLIC,
    CATEGORY_TECHNICAL,
    sync_ghana_universities,
)
from universities.models import University

User = get_user_model()


class UniversityDirectoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ug = University.objects.get(short_name="UG")
        self.buyer = User.objects.create_user(email="uni.buyer@st.ug.edu.gh", password="StrongPassword123!")
        self.buyer_profile = Profile.objects.create(user=self.buyer, university=self.ug, is_vendor=False)

        self.admin = User.objects.create_superuser(email="uni.admin@unimart.gh", password="AdminPassword123!")
        Profile.objects.create(user=self.admin, university=self.ug, is_vendor=False)

    def test_migration_seeded_exact_67_categorized_institutions(self):
        self.assertEqual(University.objects.count(), 67)
        self.assertEqual(University.objects.filter(category=CATEGORY_PUBLIC).count(), 17)
        self.assertEqual(University.objects.filter(category=CATEGORY_TECHNICAL).count(), 10)
        self.assertEqual(University.objects.filter(category=CATEGORY_PRIVATE).count(), 40)

        db_pairs = set(University.objects.values_list("name", "category"))
        expected_pairs = {(item["name"], item["category"]) for item in CANONICAL_UNIVERSITIES}
        self.assertEqual(db_pairs, expected_pairs)

        res = self.client.get("/api/universities/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 67)

    def test_public_search_and_category_filtering(self):
        tech_res = self.client.get("/api/universities/", {"category": CATEGORY_TECHNICAL})
        self.assertEqual(tech_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(tech_res.data), 10)

        search_res = self.client.get("/api/universities/", {"search": "Klintaps"})
        self.assertEqual(search_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(search_res.data), 1)
        self.assertEqual(
            search_res.data[0]["name"],
            "Klintaps University College of Health and Allied Sciences",
        )

    def test_re_running_sync_is_idempotent_and_preserves_ids_and_user_links(self):
        ug_id_before = self.ug.id
        call_command("seed_universities")
        stats = sync_ghana_universities()
        self.assertEqual(stats["created"], 0)
        self.assertEqual(stats["updated"], 0)
        self.assertEqual(stats["merged"], 0)
        self.assertEqual(University.objects.count(), 67)

        self.buyer_profile.refresh_from_db()
        self.assertEqual(self.buyer_profile.university_id, ug_id_before)

    def test_legacy_spelling_and_duplicate_reconciliation_preserves_users_and_products(self):
        ashesi = University.objects.get(short_name="Ashesi")
        cat = Category.objects.create(name="Electronics", slug="electronics")

        # Create a legacy duplicate row for Ashesi and attach a seller + product to it
        dup_ashesi = University.objects.create(
            name="Ashesi University College",
            short_name="AUC-LEGACY",
            category=CATEGORY_PRIVATE,
        )
        seller = User.objects.create_user(email="legacy.seller@ashesi.edu.gh", password="StrongPassword123!")
        seller_profile = Profile.objects.create(user=seller, university=dup_ashesi, is_vendor=True)
        prod = Product.objects.create(
            seller=seller,
            university=dup_ashesi,
            category=cat,
            title="Desk Monitor",
            description="Used monitor",
            price=450,
            status="live",
            is_available=True,
        )

        # Also create an unrecognized institution attached to another user -> must deactivate, never delete
        custom_legacy = University.objects.create(
            name="Legacy Nursing College",
            short_name="LNC-OLD",
            category=CATEGORY_PRIVATE,
        )
        nurse = User.objects.create_user(email="nurse@lnc.gh", password="StrongPassword123!")
        nurse_profile = Profile.objects.create(user=nurse, university=custom_legacy, is_vendor=False)

        stats = sync_ghana_universities()
        self.assertEqual(stats["merged"], 1)
        self.assertEqual(stats["deactivated"], 1)

        seller_profile.refresh_from_db()
        prod.refresh_from_db()
        nurse_profile.refresh_from_db()
        custom_legacy.refresh_from_db()

        self.assertEqual(seller_profile.university_id, ashesi.id)
        self.assertEqual(prod.university_id, ashesi.id)
        self.assertFalse(University.objects.filter(id=dup_ashesi.id).exists())

        self.assertEqual(nurse_profile.university_id, custom_legacy.id)
        self.assertFalse(custom_legacy.is_active)

        # Public listing omits inactive legacy institution
        pub_res = self.client.get("/api/universities/")
        self.assertEqual(len(pub_res.data), 67)

    def test_admin_university_management_permissions_and_safeguards(self):
        # Unauthenticated blocked (401)
        self.assertEqual(self.client.get("/api/admin/universities/").status_code, status.HTTP_401_UNAUTHORIZED)

        # Buyer blocked (403)
        buyer_token = str(RefreshToken.for_user(self.buyer).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {buyer_token}")
        self.assertEqual(self.client.get("/api/admin/universities/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.post(
                "/api/admin/universities/",
                {"name": "Hack Uni", "short_name": "HACK", "category": CATEGORY_PRIVATE},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        # Admin authorized
        admin_token = str(RefreshToken.for_user(self.admin).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")

        list_res = self.client.get("/api/admin/universities/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(list_res.data["summary"]["total"], 67)
        ug_row = next(u for u in list_res.data["results"] if u["short_name"] == "UG")
        self.assertEqual(ug_row["user_count"], 2)  # buyer + admin

        # Create new institution -> immediately available on public registration endpoint
        create_res = self.client.post(
            "/api/admin/universities/",
            {
                "name": "Ghana Institute of Journalism Alumni Institute",
                "short_name": "GIJAI",
                "category": CATEGORY_PRIVATE,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        new_id = create_res.data["id"]

        pub_res = self.client.get("/api/universities/")
        self.assertTrue(any(u["id"] == new_id for u in pub_res.data))

        # Cannot delete university with existing users
        del_ug = self.client.delete(f"/api/admin/universities/{self.ug.id}/")
        self.assertEqual(del_ug.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(University.objects.filter(id=self.ug.id).exists())

        # Deactivating preserves user association while hiding from public dropdown
        patch_ug = self.client.patch(f"/api/admin/universities/{self.ug.id}/", {"is_active": False}, format="json")
        self.assertEqual(patch_ug.status_code, status.HTTP_200_OK)
        self.buyer_profile.refresh_from_db()
        self.assertEqual(self.buyer_profile.university_id, self.ug.id)
        pub_after = self.client.get("/api/universities/")
        self.assertFalse(any(u["id"] == self.ug.id for u in pub_after.data))

        # Unused new institution CAN be deleted cleanly
        del_new = self.client.delete(f"/api/admin/universities/{new_id}/")
        self.assertEqual(del_new.status_code, status.HTTP_200_OK)
        self.assertFalse(University.objects.filter(id=new_id).exists())
