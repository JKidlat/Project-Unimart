"""
Comprehensive Multi-Vendor Ordering and Delivery Coordination Test Suite.
Tests Scenarios A through G:
- Scenario A: Single-seller purchase & suborder generation
- Scenario B: Multi-vendor checkout (3+ independent sellers partitioned from 1 Master Order)
- Scenario C: Independent lifecycles (Seller A accepts, Seller B rejects; no cross-contamination)
- Scenario D: Structured Delivery Proposals & Agreement acceptance
- Scenario E: Concurrency-safe inventory deduction strictly upon suborder completion
- Scenario F: Data isolation & role-based permission enforcement
- Scenario G: Suborder issue reporting & Master Order status aggregation
"""

from decimal import Decimal
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from marketplace.models import Category, Product
from messaging.models import Conversation, Message
from universities.models import University
from .models import (
    Order,
    SellerOrder,
    OrderItem,
    SellerDeliverySettings,
    BuyerDeliveryPreferences,
    DeliveryAgreement,
    OrderIssueReport,
)
from .services import complete_seller_order_and_deduct_inventory

User = get_user_model()


class MultiVendorOrderSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Retrieve or create University (may be pre-seeded by migration)
        self.knust, _ = University.objects.get_or_create(
            short_name="KNUST",
            defaults={"name": "Kwame Nkrumah University of Science and Technology"}
        )
        self.ug, _ = University.objects.get_or_create(
            short_name="UG",
            defaults={"name": "University of Ghana"}
        )

        # Retrieve or create Category
        self.cat, _ = Category.objects.get_or_create(
            slug="electronics",
            defaults={"name": "Electronics"}
        )

        # Create Buyer
        self.buyer = User.objects.create_user(
            email="buyer@knust.edu.gh",
            password="TestPassword123!",
            full_name="Akua Mansa",
            is_email_verified=True,
            is_active=True,
        )

        # Create 3 Sellers
        self.seller_a = User.objects.create_user(
            email="seller_a@knust.edu.gh",
            password="TestPassword123!",
            full_name="Kofi Mensah",
            is_email_verified=True,
            is_active=True,
        )
        self.seller_b = User.objects.create_user(
            email="seller_b@ug.edu.gh",
            password="TestPassword123!",
            full_name="Ama Serwaa",
            is_email_verified=True,
            is_active=True,
        )
        self.seller_c = User.objects.create_user(
            email="seller_c@knust.edu.gh",
            password="TestPassword123!",
            full_name="Yaw Boateng",
            is_email_verified=True,
            is_active=True,
        )

        # Configure Seller A delivery settings
        SellerDeliverySettings.objects.create(
            seller=self.seller_a,
            offers_personal_delivery=True,
            offers_collection=True,
            base_delivery_fee=Decimal("15.00"),
            collection_location="Commercial Area Bank Square",
        )

        # Create Products
        self.prod_a = Product.objects.create(
            title="Scientific Calculator fx-991EX",
            price=Decimal("120.00"),
            stock=10,
            seller=self.seller_a,
            category=self.cat,
            university=self.knust,
            status="live",
            is_available=True,
        )
        self.prod_b = Product.objects.create(
            title="Noise Cancelling Headphones",
            price=Decimal("250.00"),
            stock=5,
            seller=self.seller_b,
            category=self.cat,
            university=self.ug,
            status="live",
            is_available=True,
        )
        self.prod_c = Product.objects.create(
            title="USB-C Fast Charging Cable",
            price=Decimal("45.00"),
            stock=20,
            seller=self.seller_c,
            category=self.cat,
            university=self.knust,
            status="live",
            is_available=True,
        )

    # -------------------------------------------------------------------------
    # SCENARIO A: SINGLE SELLER CHECKOUT
    # -------------------------------------------------------------------------
    def test_scenario_a_single_seller_checkout(self):
        """Single seller purchase creates 1 Master Order and 1 SellerOrder with deadline."""
        self.client.force_authenticate(user=self.buyer)

        payload = {
            "full_name": "Akua Mansa",
            "phone_number": "0241234567",
            "university": "KNUST",
            "hostel_room": "Unity Hall Room 402",
            "cart_items": [
                {"product_id": self.prod_a.id, "quantity": 2, "fulfilment_method": "personal_delivery"}
            ]
        }

        resp = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.data

        # Verify Master Order
        order_id = data["id"]
        order = Order.objects.get(pk=order_id)
        self.assertTrue(order.order_number.startswith("UM-"))
        self.assertEqual(order.total_product_amount, Decimal("240.00"))
        self.assertEqual(order.total_delivery_fee, Decimal("15.00"))
        self.assertEqual(order.total_amount, Decimal("255.00"))
        self.assertEqual(order.status, "pending")

        # Verify SellerOrder suborder
        suborders = order.seller_orders.all()
        self.assertEqual(suborders.count(), 1)
        suborder = suborders.first()
        self.assertEqual(suborder.seller, self.seller_a)
        self.assertEqual(suborder.suborder_number, f"{order.order_number}-A")
        self.assertEqual(suborder.status, "pending_response")
        self.assertEqual(suborder.subtotal, Decimal("240.00"))
        self.assertIsNotNone(suborder.seller_response_deadline)

        # Verify snapshots
        item = suborder.items.first()
        self.assertEqual(item.product_title_snapshot, self.prod_a.title)
        self.assertEqual(item.unit_price_snapshot, Decimal("120.00"))

        # Verify order conversation and automated system message
        conv = Conversation.objects.filter(seller_order=suborder).first()
        self.assertIsNotNone(conv)
        self.assertEqual(conv.buyer, self.buyer)
        self.assertEqual(conv.seller, self.seller_a)
        sys_msg = conv.messages.filter(message_type="system").first()
        self.assertIsNotNone(sys_msg)
        self.assertIn(suborder.suborder_number, sys_msg.body)

    # -------------------------------------------------------------------------
    # SCENARIO B: MULTI-VENDOR CHECKOUT (3 DIFFERENT SELLERS)
    # -------------------------------------------------------------------------
    def test_scenario_b_multi_vendor_checkout(self):
        """Ordering from 3 sellers creates 1 Master Order and 3 distinct SellerOrders."""
        self.client.force_authenticate(user=self.buyer)

        payload = {
            "full_name": "Akua Mansa",
            "phone_number": "0241234567",
            "university": "KNUST",
            "hostel_room": "Africa Hall Room 12",
            "cart_items": [
                {"product_id": self.prod_a.id, "quantity": 1, "fulfilment_method": "personal_delivery"},
                {"product_id": self.prod_b.id, "quantity": 1, "fulfilment_method": "courier"},
                {"product_id": self.prod_c.id, "quantity": 2, "fulfilment_method": "collection"},
            ]
        }

        resp = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(pk=resp.data["id"])

        # 3 distinct suborders created
        suborders = order.seller_orders.order_by("suborder_number")
        self.assertEqual(suborders.count(), 3)

        sub_sellers = {s.seller_id for s in suborders}
        self.assertEqual(sub_sellers, {self.seller_a.id, self.seller_b.id, self.seller_c.id})

        # Expected suborder numbers: -A, -B, -C
        sub_nums = [s.suborder_number for s in suborders]
        self.assertTrue(all(num.startswith(order.order_number) for num in sub_nums))
        self.assertEqual([num[-1] for num in sub_nums], ["A", "B", "C"])

        # Each suborder has its own separate conversation
        for s in suborders:
            conv = Conversation.objects.filter(seller_order=s).first()
            self.assertIsNotNone(conv)
            self.assertEqual(conv.seller, s.seller)

    # -------------------------------------------------------------------------
    # SCENARIO C: INDEPENDENT SELLER LIFECYCLES
    # -------------------------------------------------------------------------
    def test_scenario_c_independent_seller_lifecycles(self):
        """Seller A accepts, Seller B rejects; Seller A's order continues unaffected."""
        # Create multi-vendor order
        order = Order.objects.create(
            buyer=self.buyer,
            order_number="UM-202611-TEST1",
            full_name="Akua Mansa",
            university="KNUST",
        )
        sub_a = SellerOrder.objects.create(
            master_order=order,
            suborder_number="UM-202611-TEST1-A",
            seller=self.seller_a,
            buyer=self.buyer,
            status="pending_response",
            subtotal=Decimal("120.00"),
        )
        sub_b = SellerOrder.objects.create(
            master_order=order,
            suborder_number="UM-202611-TEST1-B",
            seller=self.seller_b,
            buyer=self.buyer,
            status="pending_response",
            subtotal=Decimal("250.00"),
        )
        order.recalculate_derived_status_and_totals(save=True)

        # Seller A accepts suborder A
        self.client.force_authenticate(user=self.seller_a)
        resp_a = self.client.post(f"/api/orders/seller-orders/{sub_a.id}/accept/")
        self.assertEqual(resp_a.status_code, status.HTTP_200_OK)
        sub_a.refresh_from_db()
        self.assertEqual(sub_a.status, "accepted")

        # Seller B rejects suborder B
        self.client.force_authenticate(user=self.seller_b)
        resp_b = self.client.post(f"/api/orders/seller-orders/{sub_b.id}/reject/", {"reason": "Item out of stock"}, format="json")
        self.assertEqual(resp_b.status_code, status.HTTP_200_OK)
        sub_b.refresh_from_db()
        self.assertEqual(sub_b.status, "rejected")
        self.assertEqual(sub_b.rejection_reason, "Item out of stock")

        # Suborder A remains active and untouched!
        sub_a.refresh_from_db()
        self.assertEqual(sub_a.status, "accepted")

        # Master order status reflects aggregate progress
        order.refresh_from_db()
        self.assertEqual(order.overall_status, "partially_accepted")

    # -------------------------------------------------------------------------
    # SCENARIO D: STRUCTURED DELIVERY PROPOSAL & AGREEMENT
    # -------------------------------------------------------------------------
    def test_scenario_d_delivery_proposal_and_acceptance(self):
        """Seller proposes delivery terms, Buyer accepts; terms update suborder and order."""
        order = Order.objects.create(buyer=self.buyer, order_number="UM-202611-TEST2")
        suborder = SellerOrder.objects.create(
            master_order=order,
            suborder_number="UM-202611-TEST2-A",
            seller=self.seller_a,
            buyer=self.buyer,
            status="accepted",
            subtotal=Decimal("120.00"),
            advertised_delivery_fee=Decimal("10.00"),
        )
        order.recalculate_derived_status_and_totals(save=True)

        # Seller proposes delivery terms
        self.client.force_authenticate(user=self.seller_a)
        proposal_payload = {
            "fulfilment_method": "personal_delivery",
            "proposed_fee": "20.00",
            "delivery_location": "Brunei Hostel Entrance",
            "estimated_delivery": "Tomorrow at 4:30 PM",
            "notes": "Call me when you reach the gate",
        }
        resp = self.client.post(f"/api/orders/seller-orders/{suborder.id}/propose-delivery/", proposal_payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        proposal_id = resp.data["id"]

        agreement = DeliveryAgreement.objects.get(pk=proposal_id)
        self.assertEqual(agreement.status, "pending")
        self.assertEqual(agreement.proposed_fee, Decimal("20.00"))

        # Buyer accepts the proposal
        self.client.force_authenticate(user=self.buyer)
        accept_resp = self.client.post(f"/api/orders/delivery-agreements/{proposal_id}/accept/")
        self.assertEqual(accept_resp.status_code, status.HTTP_200_OK)

        agreement.refresh_from_db()
        self.assertEqual(agreement.status, "accepted")

        # Suborder terms updated
        suborder.refresh_from_db()
        self.assertEqual(suborder.confirmed_delivery_fee, Decimal("20.00"))
        self.assertEqual(suborder.delivery_location, "Brunei Hostel Entrance")
        self.assertEqual(suborder.status, "preparing")

        # Master order total delivery fee updated
        order.refresh_from_db()
        self.assertEqual(order.total_delivery_fee, Decimal("20.00"))
        self.assertEqual(order.total_amount, Decimal("140.00"))

    # -------------------------------------------------------------------------
    # SCENARIO E: INVENTORY DEDUCTION ON SUBORDER COMPLETION
    # -------------------------------------------------------------------------
    def test_scenario_e_inventory_deduction_on_completion(self):
        """Stock is only decremented when the suborder is completed."""
        initial_stock = self.prod_a.stock

        order = Order.objects.create(buyer=self.buyer, order_number="UM-202611-TEST3")
        suborder = SellerOrder.objects.create(
            master_order=order,
            suborder_number="UM-202611-TEST3-A",
            seller=self.seller_a,
            buyer=self.buyer,
            status="dispatched",
            subtotal=Decimal("240.00"),
        )
        OrderItem.objects.create(
            order=order,
            seller_order=suborder,
            product=self.prod_a,
            seller=self.seller_a,
            quantity=2,
            price_at_purchase=Decimal("120.00"),
            total_price=Decimal("240.00"),
        )

        # Before completion, stock unchanged
        self.prod_a.refresh_from_db()
        self.assertEqual(self.prod_a.stock, initial_stock)

        # Buyer confirms receipt (marks completed)
        self.client.force_authenticate(user=self.buyer)
        patch_resp = self.client.patch(
            f"/api/orders/seller-orders/{suborder.id}/update-status/",
            {"status": "completed"},
            format="json"
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)

        # After completion: inventory deducted by exact ordered quantity
        self.prod_a.refresh_from_db()
        self.assertEqual(self.prod_a.stock, initial_stock - 2)

        suborder.refresh_from_db()
        self.assertEqual(suborder.status, "completed")
        self.assertTrue(suborder.inventory_deducted)

    # -------------------------------------------------------------------------
    # SCENARIO F: DATA ISOLATION AND ACCESS SECURITY
    # -------------------------------------------------------------------------
    def test_scenario_f_data_isolation(self):
        """Seller B cannot view or modify Seller A's suborder."""
        order = Order.objects.create(buyer=self.buyer, order_number="UM-202611-TEST4")
        sub_a = SellerOrder.objects.create(
            master_order=order,
            suborder_number="UM-202611-TEST4-A",
            seller=self.seller_a,
            buyer=self.buyer,
            status="pending_response",
            subtotal=Decimal("120.00"),
        )

        # Seller B tries to access Seller A's suborder
        self.client.force_authenticate(user=self.seller_b)
        get_resp = self.client.get(f"/api/orders/seller-orders/{sub_a.id}/")
        self.assertEqual(get_resp.status_code, status.HTTP_404_NOT_FOUND)

        # Seller B tries to accept Seller A's suborder
        accept_resp = self.client.post(f"/api/orders/seller-orders/{sub_a.id}/accept/")
        self.assertEqual(accept_resp.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------------------
    # SCENARIO G: SUBORDER ISSUE REPORTING
    # -------------------------------------------------------------------------
    def test_scenario_g_issue_reporting(self):
        """Buyer reports issue; suborder and master order reflect issue_reported status."""
        order = Order.objects.create(buyer=self.buyer, order_number="UM-202611-TEST5")
        suborder = SellerOrder.objects.create(
            master_order=order,
            suborder_number="UM-202611-TEST5-A",
            seller=self.seller_a,
            buyer=self.buyer,
            status="dispatched",
            subtotal=Decimal("120.00"),
        )
        order.recalculate_derived_status_and_totals(save=True)

        self.client.force_authenticate(user=self.buyer)
        issue_payload = {
            "issue_type": "item_not_received",
            "description": "Seller said they arrived but I waited 45 minutes and nobody showed up.",
        }
        resp = self.client.post(f"/api/orders/seller-orders/{suborder.id}/report-issue/", issue_payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        suborder.refresh_from_db()
        self.assertEqual(suborder.status, "issue_reported")

        order.refresh_from_db()
        self.assertEqual(order.overall_status, "issue_reported")

        reports = suborder.issue_reports.all()
        self.assertEqual(reports.count(), 1)
        self.assertEqual(reports.first().issue_type, "item_not_received")
