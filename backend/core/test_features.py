"""
Comprehensive integration & regression tests covering Unimart workflows:
- Customer signup field validation, profile counts, cart/wishlist persistence, avatar upload
- Customer Support ticket creation, admin triage/reply, permission isolation
- Seller-Buyer Messaging conversations, unread counts, strict participant isolation
- Media upload & magic-byte validation, blob URL rejection, Seller listing resubmission moderation
- Product inventory display tiers, atomic completion-only stock deduction, cancellation/oversell guards
- Authorized self-service account deletion (hard delete vs. anonymized order-ledger preservation)
"""

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Profile
from core.models import AccountDeletionAudit, MediaAsset, SupportTicket
from marketplace.models import CartItem, Category, Product, WishlistItem
from messaging.models import Conversation, Message
from orders.models import Order, OrderItem
from universities.models import University

User = get_user_model()

VALID_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


class UnimartFeatureIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.uni, _ = University.objects.get_or_create(
            short_name="UG", defaults={"name": "University of Ghana"}
        )
        self.category, _ = Category.objects.get_or_create(
            slug="electronics", defaults={"name": "Electronics"}
        )

        self.buyer = User.objects.create_user(
            email="feat.buyer@st.ug.edu.gh", password="StrongPassword123!"
        )
        self.buyer.full_name = "Kofi Buyer"
        self.buyer.phone_number = "+233201112233"
        self.buyer.is_email_verified = True
        self.buyer.is_verified_student = True
        self.buyer.save()
        Profile.objects.create(user=self.buyer, university=self.uni, is_vendor=False)

        self.other_buyer = User.objects.create_user(
            email="feat.other@st.ug.edu.gh", password="StrongPassword123!"
        )
        self.other_buyer.full_name = "Ama Bystander"
        self.other_buyer.is_email_verified = True
        self.other_buyer.save()
        Profile.objects.create(user=self.other_buyer, university=self.uni, is_vendor=False)

        self.seller = User.objects.create_user(
            email="feat.seller@st.ug.edu.gh", password="StrongPassword123!"
        )
        self.seller.full_name = "Yaw Seller"
        self.seller.phone_number = "+233249998877"
        self.seller.is_email_verified = True
        self.seller.is_verified_student = True
        self.seller.save()
        Profile.objects.create(
            user=self.seller,
            university=self.uni,
            is_vendor=True,
            business_name="Yaw Campus Tech",
        )

        self.admin = User.objects.create_superuser(
            email="feat.admin@unimartgh.com", password="StrongAdminPassword123!"
        )
        self.admin.full_name = "Unimart Admin"
        self.admin.is_email_verified = True
        self.admin.save()
        Profile.objects.create(user=self.admin, university=self.uni, is_vendor=False)

    def _auth_as(self, user):
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    # ── A. Customer Signup Validation, Avatar Upload & Real Profile Counts ─────────

    def test_signup_descriptive_errors_avatar_upload_and_real_counts(self):
        # 1. Short password
        res_short = self.client.post(
            "/api/auth/register/",
            {
                "email": "new.student@st.ug.edu.gh",
                "password": "abc",
                "confirm_password": "abc",
                "full_name": "Esi Mensah",
            },
            format="json",
        )
        self.assertEqual(res_short.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", res_short.data)
        self.assertIn("8", str(res_short.data["password"]))

        # 2. Password mismatch
        res_mismatch = self.client.post(
            "/api/auth/register/",
            {
                "email": "new.student@st.ug.edu.gh",
                "password": "StrongPassword123!",
                "confirm_password": "DifferentPassword123!",
                "full_name": "Esi Mensah",
            },
            format="json",
        )
        self.assertEqual(res_mismatch.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", res_mismatch.data)

        # 3. Numeric-only password
        res_num = self.client.post(
            "/api/auth/register/",
            {
                "email": "new.student@st.ug.edu.gh",
                "password": "1234567890",
                "confirm_password": "1234567890",
                "full_name": "Esi Mensah",
            },
            format="json",
        )
        self.assertEqual(res_num.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", res_num.data)

        # 4. Duplicate email
        res_dup = self.client.post(
            "/api/auth/register/",
            {
                "email": self.buyer.email,
                "password": "StrongPassword123!",
                "confirm_password": "StrongPassword123!",
                "full_name": "Kofi Duplicate",
            },
            format="json",
        )
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", res_dup.data)

        # 5. Avatar upload validation (reject non-image spoof) & real PNG persistence
        self._auth_as(self.buyer)
        fake_file = SimpleUploadedFile("script.png", b"not-a-real-png-binary", content_type="image/png")
        bad_avatar = self.client.post("/api/auth/me/avatar/", {"file": fake_file}, format="multipart")
        self.assertEqual(bad_avatar.status_code, status.HTTP_400_BAD_REQUEST)

        real_png = SimpleUploadedFile("avatar.png", VALID_PNG_BYTES, content_type="image/png")
        good_avatar = self.client.post("/api/auth/me/avatar/", {"file": real_png}, format="multipart")
        self.assertEqual(good_avatar.status_code, status.HTTP_200_OK)
        pic_url = good_avatar.data["profile_pic"]
        self.assertIn("/api/media/", pic_url)
        asset_path = "/api/media/" + pic_url.split("/api/media/", 1)[1]
        served = self.client.get(asset_path)
        self.assertEqual(served.status_code, status.HTTP_200_OK)
        self.assertEqual(served["Content-Type"], "image/png")
        self.assertEqual(served.content, VALID_PNG_BYTES)

        # 6. Real user DB counts on /api/auth/me/ + cart persistence
        prod = Product.objects.create(
            seller=self.seller,
            title="Desk Lamp",
            price="95.00",
            stock=6,
            category=self.category,
            university=self.uni,
            status="live",
            is_available=True,
            image=pic_url,
            images=[pic_url],
        )
        WishlistItem.objects.create(user=self.buyer, product=prod)
        add_cart = self.client.post("/api/cart/", {"product_id": prod.id, "quantity": 2}, format="json")
        self.assertEqual(add_cart.status_code, status.HTTP_200_OK)

        # Exceeding stock in cart must fail cleanly
        over_cart = self.client.patch(f"/api/cart/{prod.id}/", {"quantity": 9}, format="json")
        self.assertEqual(over_cart.status_code, status.HTTP_400_BAD_REQUEST)

        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["wishlist_count"], 1)
        self.assertEqual(me.data["cart_count"], 2)
        self.assertEqual(me.data["orders_count"], 0)
        self.assertTrue(CartItem.objects.filter(user=self.buyer, product=prod, quantity=2).exists())

    # ── B. Customer Support End-to-End Integration ───────────────────────────────

    def test_customer_support_submission_admin_triage_and_isolation(self):
        self._auth_as(self.buyer)
        create_res = self.client.post(
            "/api/support/tickets/",
            {
                "category": "Order Problem",
                "orderReference": "1042",
                "subject": "Vendor pickup timing mismatch",
                "description": "Seller asked to meet outside campus instead of Night Market.",
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        ticket_id = create_res.data["ticket"]["id"]
        self.assertEqual(create_res.data["ticket"]["status"], "open")

        # Another customer cannot view or hit admin support endpoint
        self._auth_as(self.other_buyer)
        self.assertEqual(self.client.get(f"/api/support/tickets/{ticket_id}/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get("/api/admin/support/").status_code, status.HTTP_403_FORBIDDEN)

        # Admin sees ticket count on dashboard + live activity + responds and marks in_progress -> resolved
        self._auth_as(self.admin)
        dash = self.client.get("/api/admin/dashboard/")
        self.assertEqual(dash.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(dash.data["stats"]["open_support_tickets"], 1)
        self.assertGreaterEqual(dash.data["badges"]["support"], 1)

        act = self.client.get("/api/admin/activity/")
        self.assertEqual(act.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(act.data["counts"]["support"], 1)

        admin_list = self.client.get("/api/admin/support/")
        self.assertEqual(admin_list.status_code, status.HTTP_200_OK)
        self.assertTrue(any(t["id"] == ticket_id for t in admin_list.data["results"]))

        admin_reply = self.client.patch(
            f"/api/admin/support/{ticket_id}/",
            {
                "status": "in_progress",
                "admin_response": "We have reminded the seller to use verified campus pickup points.",
            },
            format="json",
        )
        self.assertEqual(admin_reply.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_reply.data["ticket"]["status"], "in_progress")

        # Customer sees admin response and replies back
        self._auth_as(self.buyer)
        cust_detail = self.client.get(f"/api/support/tickets/{ticket_id}/")
        self.assertEqual(cust_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(cust_detail.data["ticket"]["status"], "in_progress")
        self.assertEqual(
            cust_detail.data["ticket"]["adminResponse"],
            "We have reminded the seller to use verified campus pickup points.",
        )

        follow_up = self.client.post(
            f"/api/support/tickets/{ticket_id}/",
            {"message": "Thanks, the seller met me at Night Market safely!"},
            format="json",
        )
        self.assertEqual(follow_up.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(follow_up.data["ticket"]["messages"]), 2)
        self.assertEqual(
            [m["isAdmin"] for m in follow_up.data["ticket"]["messages"]],
            [True, False],
        )

        # Admin resolves ticket
        self._auth_as(self.admin)
        resolved = self.client.patch(
            f"/api/admin/support/{ticket_id}/",
            {"status": "resolved"},
            format="json",
        )
        self.assertEqual(resolved.status_code, status.HTTP_200_OK)
        self.assertEqual(resolved.data["ticket"]["status"], "resolved")
        self.assertEqual(SupportTicket.objects.get(pk=ticket_id).status, "resolved")

    # ── C. Buyer-Seller Messaging System ─────────────────────────────────────────

    def test_buyer_seller_messaging_sync_and_participant_isolation(self):
        product = Product.objects.create(
            seller=self.seller,
            title="HP EliteBook",
            price="3500.00",
            stock=3,
            category=self.category,
            university=self.uni,
            status="live",
            is_available=True,
        )

        # Buyer initiates chat from product
        self._auth_as(self.buyer)
        init_res = self.client.post(
            "/api/messages/conversations/",
            {"product_id": product.id, "initial_message": "Is the battery health still over 85%?"},
            format="json",
        )
        self.assertEqual(init_res.status_code, status.HTTP_201_CREATED)
        conv_id = init_res.data["conversation"]["id"]

        # Resuming same thread reuses existing Conversation instead of duplicating
        resume_res = self.client.post(
            "/api/messages/conversations/",
            {"product_id": product.id},
            format="json",
        )
        self.assertEqual(resume_res.status_code, status.HTTP_200_OK)
        self.assertEqual(resume_res.data["conversation"]["id"], conv_id)

        # Seller cannot chat on own listing as buyer
        self._auth_as(self.seller)
        self_chat = self.client.post("/api/messages/conversations/", {"product_id": product.id}, format="json")
        self.assertEqual(self_chat.status_code, status.HTTP_400_BAD_REQUEST)

        # Seller inbox shows unread buyer inquiry, opens it, and replies
        seller_inbox = self.client.get("/api/messages/conversations/?role=seller")
        self.assertEqual(seller_inbox.status_code, status.HTTP_200_OK)
        self.assertEqual(seller_inbox.data["unread_count"], 1)

        reply_res = self.client.post(
            f"/api/messages/conversations/{conv_id}/messages/",
            {"body": "Yes! 92% capacity, available for pickup at Balme Library."},
            format="json",
        )
        self.assertEqual(reply_res.status_code, status.HTTP_201_CREATED)

        # Third user cannot read or send into conversation
        self._auth_as(self.other_buyer)
        self.assertEqual(self.client.get(f"/api/messages/conversations/{conv_id}/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.post(f"/api/messages/conversations/{conv_id}/messages/", {"body": "Spy"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )

        # Buyer checks unread count, reads thread, and unread count drops to 0
        self._auth_as(self.buyer)
        self.assertEqual(self.client.get("/api/messages/unread-count/").data["unread_count"], 1)
        thread = self.client.get(f"/api/messages/conversations/{conv_id}/")
        self.assertEqual(thread.status_code, status.HTTP_200_OK)
        self.assertEqual(len(thread.data["messages"]), 2)
        self.assertEqual(self.client.get("/api/messages/unread-count/").data["unread_count"], 0)

    # ── D. Media Upload, Seller Listings (`?mine=true`), Editing & Resubmission ─

    def test_seller_media_upload_blob_rejection_and_edit_resubmission(self):
        self._auth_as(self.seller)

        # Upload 2 images cleanly
        img1 = SimpleUploadedFile("p1.png", VALID_PNG_BYTES, content_type="image/png")
        img2 = SimpleUploadedFile("p2.png", VALID_PNG_BYTES, content_type="image/png")
        up = self.client.post("/api/media/upload/?kind=product", {"files": [img1, img2]}, format="multipart")
        self.assertEqual(up.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(up.data["urls"]), 2)
        media_url_1 = up.data["urls"][0]

        # Reject blob URL or missing/0 stock
        bad_blob = self.client.post(
            "/api/products/",
            {
                "title": "Broken Photo Ad",
                "price": 100,
                "stock": 2,
                "category": "electronics",
                "image": "blob:https://project-unimart.vercel.app/fake-uuid",
            },
            format="json",
        )
        self.assertEqual(bad_blob.status_code, status.HTTP_400_BAD_REQUEST)

        bad_stock = self.client.post(
            "/api/products/",
            {
                "title": "Zero Stock Ad",
                "price": 100,
                "stock": 0,
                "category": "electronics",
                "image": media_url_1,
            },
            format="json",
        )
        self.assertEqual(bad_stock.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid ad creation -> starts pending_approval
        created = self.client.post(
            "/api/products/",
            {
                "title": "Casio FX-991EX Calculator",
                "price": 145,
                "stock": 12,
                "category": "stationery",
                "condition": "New",
                "image": media_url_1,
                "images": up.data["urls"],
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        pid = created.data["id"]
        self.assertEqual(created.data["status"], "pending_approval")
        self.assertEqual(created.data["stock"], 12)
        self.assertIsNone(created.data["stock_label"])

        # Seller sees pending ad in ?mine=true, public shop does not
        mine = self.client.get("/api/products/?mine=true")
        self.assertTrue(any(p["id"] == pid for p in (mine.data.get("results", mine.data))))

        # Admin approves ad -> goes live
        self._auth_as(self.admin)
        approve = self.client.patch(f"/api/admin/products/{pid}/", {"status": "live", "is_available": True}, format="json")
        self.assertEqual(approve.status_code, status.HTTP_200_OK)

        # Seller updates stock via dedicated endpoint without losing live status
        self._auth_as(self.seller)
        stock_patch = self.client.patch(f"/api/products/{pid}/stock/", {"stock": 7}, format="json")
        self.assertEqual(stock_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(stock_patch.data["status"], "live")
        self.assertEqual(stock_patch.data["stock_label"], "Few units left")

        # Seller edits title/price -> automatically resubmitted to pending_approval
        edit_res = self.client.patch(
            f"/api/products/{pid}/",
            {"title": "Casio FX-991EX Original + Cover", "price": 155, "stock": 7},
            format="json",
        )
        self.assertEqual(edit_res.status_code, status.HTTP_200_OK)
        self.assertEqual(edit_res.data["status"], "pending_approval")
        self.assertFalse(edit_res.data["is_available"])
        self.assertTrue(edit_res.data["is_resubmitted"])

    # ── E. Inventory Tiers, Cancellation & Atomic Completion Deduction ───────────

    def test_inventory_tiers_checkout_cancel_and_atomic_completion_deduction(self):
        # Create products covering exact visibility tiers: 15, 8, 4, 1, 0 (live stays visible when stock=0)
        p_plenty = Product.objects.create(
            seller=self.seller, title="Plenty Item", price="50.00", stock=15,
            category=self.category, university=self.uni, status="live", is_available=True
        )
        p_few = Product.objects.create(
            seller=self.seller, title="Few Item", price="50.00", stock=8,
            category=self.category, university=self.uni, status="live", is_available=True
        )
        p_critical = Product.objects.create(
            seller=self.seller, title="Critical Item", price="50.00", stock=4,
            category=self.category, university=self.uni, status="live", is_available=True
        )
        p_last = Product.objects.create(
            seller=self.seller, title="Last One", price="200.00", stock=1,
            category=self.category, university=self.uni, status="live", is_available=True
        )

        # Public shop list checks stock_label tiers
        self.client.credentials()
        pub = self.client.get("/api/products/")
        by_id = {p["id"]: p for p in pub.data.get("results", pub.data)}
        self.assertIsNone(by_id[p_plenty.id]["stock_label"])
        self.assertEqual(by_id[p_few.id]["stock_label"], "Few units left")
        self.assertEqual(by_id[p_critical.id]["stock_label"], "4 left")
        self.assertEqual(by_id[p_last.id]["stock_label"], "1 left")

        # Two separate buyers both place pending orders while stock == 1 (stock NOT deducted yet!)
        self._auth_as(self.buyer)
        order_a_res = self.client.post(
            "/api/orders/",
            {
                "full_name": "Kofi Buyer",
                "phone_number": "+233201112233",
                "university": "UG",
                "hostel_room": "Pent Hall A12",
                "payment_method": "cash",
                "cart_items": [{"product_id": p_last.id, "quantity": 1}],
            },
            format="json",
        )
        self.assertEqual(order_a_res.status_code, status.HTTP_201_CREATED)
        order_a_id = order_a_res.data["id"]

        self._auth_as(self.other_buyer)
        order_b_res = self.client.post(
            "/api/orders/",
            {
                "full_name": "Ama Bystander",
                "phone_number": "+233209991122",
                "university": "UG",
                "hostel_room": "Sarbah C5",
                "payment_method": "cash",
                "cart_items": [{"product_id": p_last.id, "quantity": 1}],
            },
            format="json",
        )
        self.assertEqual(order_b_res.status_code, status.HTTP_201_CREATED)
        order_b_id = order_b_res.data["id"]

        # Stock must STILL be 1 after checkout
        p_last.refresh_from_db()
        self.assertEqual(p_last.stock, 1)

        # Also create & cancel an order on p_critical -> stock stays 4
        self._auth_as(self.buyer)
        cancel_order_res = self.client.post(
            "/api/orders/",
            {
                "full_name": "Kofi Buyer",
                "phone_number": "+233201112233",
                "university": "UG",
                "hostel_room": "Pent Hall A12",
                "payment_method": "cash",
                "cart_items": [{"product_id": p_critical.id, "quantity": 2}],
            },
            format="json",
        )
        self.assertEqual(cancel_order_res.status_code, status.HTTP_201_CREATED)
        cid = cancel_order_res.data["id"]
        self.assertEqual(
            self.client.patch(f"/api/orders/{cid}/", {"status": "cancelled"}, format="json").status_code,
            status.HTTP_200_OK,
        )
        p_critical.refresh_from_db()
        self.assertEqual(p_critical.stock, 4)

        # Seller advances Order A to processing -> stock still 1; then completed -> stock becomes 0!
        self._auth_as(self.seller)
        self.assertEqual(
            self.client.patch(f"/api/orders/{order_a_id}/", {"status": "processing"}, format="json").status_code,
            status.HTTP_200_OK,
        )
        p_last.refresh_from_db()
        self.assertEqual(p_last.stock, 1)

        comp_a = self.client.patch(f"/api/orders/{order_a_id}/", {"status": "completed"}, format="json")
        self.assertEqual(comp_a.status_code, status.HTTP_200_OK)
        self.assertTrue(comp_a.data["inventory_deducted"])

        p_last.refresh_from_db()
        self.assertEqual(p_last.stock, 0)
        self.assertEqual(p_last.status, "live")
        self.assertTrue(p_last.is_available)

        # Second competing order completion fails cleanly instead of causing negative stock
        comp_b = self.client.patch(f"/api/orders/{order_b_id}/", {"status": "completed"}, format="json")
        self.assertEqual(comp_b.status_code, status.HTTP_400_BAD_REQUEST)
        p_last.refresh_from_db()
        self.assertEqual(p_last.stock, 0)

        # New checkout on 0-stock item fails cleanly
        self._auth_as(self.buyer)
        oversell = self.client.post(
            "/api/orders/",
            {
                "full_name": "Kofi Buyer",
                "phone_number": "+233201112233",
                "university": "UG",
                "hostel_room": "Pent Hall A12",
                "payment_method": "cash",
                "cart_items": [{"product_id": p_last.id, "quantity": 1}],
            },
            format="json",
        )
        self.assertEqual(oversell.status_code, status.HTTP_400_BAD_REQUEST)

    # ── F. Authorized Account Deletion (Hard Delete & Anonymization) ──────────────

    def test_account_deletion_hard_delete_and_ledger_anonymization(self):
        # Case 1: User WITHOUT orders -> permanently deleted & tokens blacklisted
        temp_user = User.objects.create_user(email="delete.clean@st.ug.edu.gh", password="StrongPassword123!")
        temp_user.full_name = "Temp Student"
        temp_user.is_email_verified = True
        temp_user.save()
        Profile.objects.create(user=temp_user, university=self.uni, is_vendor=False)
        uid_clean = temp_user.id

        refresh = RefreshToken.for_user(temp_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Wrong password rejected
        wrong_pw = self.client.post(
            "/api/auth/delete-account/",
            {"password": "WrongPassword999!"},
            format="json",
        )
        self.assertEqual(wrong_pw.status_code, status.HTTP_403_FORBIDDEN)

        # Correct password permanently deletes account & blacklists token
        good_del = self.client.post(
            "/api/auth/delete-account/",
            {"password": "StrongPassword123!", "reason": "Graduated"},
            format="json",
        )
        self.assertEqual(good_del.status_code, status.HTTP_200_OK)
        self.assertEqual(good_del.data["mode"], "deleted")
        self.assertFalse(User.objects.filter(pk=uid_clean).exists())
        self.assertTrue(
            AccountDeletionAudit.objects.filter(deleted_user_id=uid_clean, had_transactions=False).exists()
        )
        self.assertEqual(
            self.client.post("/api/auth/token/refresh/", {"refresh": str(refresh)}, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        # Case 2: User WITH OrderItem PROTECT FK -> anonymized & PII wiped, order preserved
        prod = Product.objects.create(
            seller=self.seller, title="Ledger Product", price="40.00", stock=5,
            category=self.category, university=self.uni, status="live", is_available=True
        )
        order = Order.objects.create(
            buyer=self.other_buyer,
            full_name="Ama Bystander",
            phone_number="+233209991122",
            university="UG",
            hostel_room="Sarbah C5",
            total_amount="40.00",
        )
        OrderItem.objects.create(
            order=order,
            product=prod,
            seller=self.seller,
            quantity=1,
            price_at_purchase="40.00",
            total_price="40.00",
        )
        uid_ledger = self.other_buyer.id
        self._auth_as(self.other_buyer)
        anon_del = self.client.post(
            "/api/auth/delete-account/",
            {"password": "StrongPassword123!", "reason": "No longer using marketplace"},
            format="json",
        )
        self.assertEqual(anon_del.status_code, status.HTTP_200_OK)
        self.assertEqual(anon_del.data["mode"], "anonymized")

        self.other_buyer.refresh_from_db()
        self.assertFalse(self.other_buyer.is_active)
        self.assertEqual(self.other_buyer.full_name, "Deleted User")
        self.assertIn("anonymized.unimart.invalid", self.other_buyer.email)
        self.assertFalse(self.other_buyer.has_usable_password())
        self.assertTrue(Order.objects.filter(pk=order.id).exists())
        self.assertTrue(
            AccountDeletionAudit.objects.filter(deleted_user_id=uid_ledger, had_transactions=True).exists()
        )
