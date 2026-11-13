"""
Order, SellerOrder, and OrderItem models for marketplace purchases.
Supports multi-vendor orders: creates one Master Order for the buyer
and partitions fulfilment across independent SellerOrders (Suborders).
Includes seller delivery settings, buyer preferences, delivery agreements,
audit events, and issue reporting.
"""

from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from marketplace.models import Product


class SellerDeliverySettings(models.Model):
    """
    Default delivery and collection configurations set by a seller.
    Applies across their catalog unless overridden at the individual product level.
    """
    COVERAGE_CHOICES = [
        ("within_campus", "Within Campus / Institution"),
        ("inter_campus", "Between Campuses / Other Institutions"),
        ("outside_campus", "Outside Campus / Local Area"),
        ("nationwide", "Nationwide (Courier)"),
    ]
    FEE_TYPE_CHOICES = [
        ("free", "Free Delivery"),
        ("fixed", "Fixed Rate"),
        ("negotiable", "Negotiable / To Be Agreed"),
        ("depends_on_location", "Depends on Destination"),
        ("buyer_arranges", "Buyer Arranges / Collects"),
    ]
    PREP_TIME_CHOICES = [
        ("same_day", "Same Day (Within 12 hours)"),
        ("1_2_days", "1 - 2 Business Days"),
        ("3_5_days", "3 - 5 Business Days"),
        ("custom", "Custom / On Demand"),
    ]

    seller = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="delivery_settings",
        help_text="Seller who owns these delivery defaults."
    )
    offers_personal_delivery = models.BooleanField(
        default=True,
        help_text="Seller or their agent delivers directly to buyer on campus."
    )
    offers_courier = models.BooleanField(
        default=False,
        help_text="Fulfilled via 3rd-party parcel/courier service (e.g. Ghana Post, VIP, Bolt/Yango)."
    )
    offers_collection = models.BooleanField(
        default=True,
        help_text="Buyer picks up in person at a designated campus meeting point."
    )
    offers_custom = models.BooleanField(
        default=False,
        help_text="Custom delivery/collection arrangement to be coordinated via chat."
    )

    delivery_coverage = models.CharField(
        max_length=50,
        choices=COVERAGE_CHOICES,
        default="within_campus",
        help_text="Geographical reach of seller delivery."
    )
    delivery_fee_type = models.CharField(
        max_length=50,
        choices=FEE_TYPE_CHOICES,
        default="fixed",
        help_text="How the seller charges for delivery."
    )
    base_delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("10.00"),
        help_text="Advertised base delivery fee in Ghana Cedis (if fixed or starting rate)."
    )
    collection_location = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Designated campus meeting point (e.g., Main Library, Porter's Lodge)."
    )
    collection_instructions = models.TextField(
        blank=True,
        default="",
        help_text="Instructions for buyer collection (e.g., call upon arrival, bring student ID)."
    )
    available_days_times = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Times available for collection or delivery (e.g., Mon-Fri 2:00pm - 6:00pm)."
    )
    preparation_time = models.CharField(
        max_length=50,
        choices=PREP_TIME_CHOICES,
        default="same_day",
        help_text="Standard preparation/packaging lead time."
    )
    custom_prep_time = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Custom preparation lead time description if prep_time='custom'."
    )
    delivery_notes = models.TextField(
        blank=True,
        default="",
        help_text="Additional delivery notes, restrictions, or terms."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Delivery Settings - {self.seller.email}"


class BuyerDeliveryPreferences(models.Model):
    """
    Saved delivery preferences for a buyer.
    Automatically populates the checkout delivery information form.
    """
    CONTACT_METHOD_CHOICES = [
        ("chat", "In-App Chat"),
        ("call", "Phone Call"),
        ("whatsapp", "WhatsApp"),
    ]

    buyer = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="delivery_preferences",
        help_text="Buyer who owns these default preferences."
    )
    preferred_university = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Preferred campus institution for delivery/collection."
    )
    campus_location = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Campus location, hall of residence, or facility."
    )
    hostel_room = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Room number, block, or specific room details."
    )
    preferred_delivery_time = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Preferred delivery window (e.g. After 4pm, Weekends)."
    )
    special_instructions = models.TextField(
        blank=True,
        default="",
        help_text="Instructions for finding the room or hand-off."
    )
    preferred_contact_method = models.CharField(
        max_length=50,
        choices=CONTACT_METHOD_CHOICES,
        default="chat",
        help_text="Preferred way for sellers to coordinate."
    )
    contact_phone = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Phone number for delivery calls/SMS."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Delivery Preferences - {self.buyer.email}"


class Order(models.Model):
    """
    Master Order placed by a buyer.
    Aggregates one or more SellerOrders (suborders) for multi-vendor purchases.
    The buyer interacts with this order as their unified purchase receipt.
    """
    STATUS_CHOICES = [
        ("pending", "Pending Confirmation"),
        ("partially_accepted", "Partially Accepted"),
        ("processing", "Processing"),
        ("ready_for_pickup", "Ready for Pickup"),
        ("paid", "Paid"),
        ("shipped", "Shipped / Dispatched"),
        ("completed", "Completed"),
        ("partially_cancelled", "Partially Cancelled"),
        ("cancelled", "Cancelled"),
        ("issue_reported", "Issue Reported"),
    ]
    REFUND_STATUS_CHOICES = [
        ("none", "None"),
        ("requested", "Requested"),
        ("refunded", "Refunded"),
    ]

    order_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        help_text="Unique customer-facing master order code (e.g. UM-202611-1001)."
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders_made",
        help_text="User who placed the order."
    )
    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=50, blank=True)
    university = models.CharField(max_length=255, blank=True)
    hostel_room = models.CharField(max_length=255, blank=True)

    # Financial breakdown
    total_product_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Sum of product subtotals across all seller suborders."
    )
    total_delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Sum of delivery fees across all seller suborders."
    )
    delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Legacy delivery fee field maintained for backward compatibility."
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Grand total (products + delivery fees)."
    )

    payment_method = models.CharField(max_length=50, default="pay_on_delivery")
    payment_reference = models.CharField(max_length=120, blank=True, null=True)

    # Master Order derived status
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Overall status derived dynamically from seller suborders."
    )
    overall_status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Explicit overall status representing aggregated suborder progress."
    )
    refund_status = models.CharField(
        max_length=20,
        choices=REFUND_STATUS_CHOICES,
        default="none",
        help_text="Refund processing status."
    )
    inventory_deducted = models.BooleanField(
        default=False,
        help_text="Tracks whether all suborder inventory has been deducted."
    )
    vendor_confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when all suborders were confirmed."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['buyer'], name='order_buyer_idx'),
            models.Index(fields=['status'], name='order_status_idx'),
            models.Index(fields=['order_number'], name='order_num_idx'),
            models.Index(fields=['created_at'], name='order_created_idx'),
        ]

    def __str__(self):
        code = self.order_number or f"#{self.id}"
        return f"Order {code} - {self.buyer.email} ({self.status})"

    def recalculate_derived_status_and_totals(self, save=True):
        """
        Derives master order totals and overall_status from child SellerOrders.
        Independent lifecycle: 1 seller rejection or cancellation does not cancel others.
        """
        suborders = list(self.seller_orders.all())
        if not suborders:
            return

        prod_sum = sum(so.subtotal for so in suborders)
        deliv_sum = sum(so.confirmed_delivery_fee or so.advertised_delivery_fee for so in suborders)
        grand_total = prod_sum + deliv_sum

        self.total_product_amount = prod_sum
        self.total_delivery_fee = deliv_sum
        self.delivery_fee = deliv_sum
        self.total_amount = grand_total

        statuses = [so.status for so in suborders]
        total_count = len(statuses)

        if all(s == 'completed' for s in statuses):
            new_status = 'completed'
            if all(so.inventory_deducted for so in suborders):
                self.inventory_deducted = True
                self.vendor_confirmed_at = self.vendor_confirmed_at or timezone.now()
        elif all(s in ('cancelled', 'rejected') for s in statuses):
            new_status = 'cancelled'
        elif any(s == 'issue_reported' for s in statuses):
            new_status = 'issue_reported'
        elif any(s in ('preparing', 'ready_for_collection', 'dispatched') for s in statuses):
            new_status = 'processing'
        elif any(s == 'accepted' for s in statuses) and any(s in ('cancelled', 'rejected') for s in statuses):
            new_status = 'partially_accepted'
        elif any(s == 'accepted' for s in statuses):
            new_status = 'processing' if all(s == 'accepted' for s in statuses) else 'partially_accepted'
        elif any(s in ('cancelled', 'rejected') for s in statuses):
            new_status = 'partially_cancelled'
        else:
            new_status = 'pending'

        self.overall_status = new_status
        self.status = new_status

        if save:
            self.save(update_fields=[
                'total_product_amount',
                'total_delivery_fee',
                'delivery_fee',
                'total_amount',
                'overall_status',
                'status',
                'inventory_deducted',
                'vendor_confirmed_at',
                'updated_at',
            ])


class SellerOrder(models.Model):
    """
    Suborder created per individual seller for items in a Master Order.
    Each seller independently manages, accepts/rejects, negotiates delivery,
    and fulfills their own suborder.
    """
    STATUS_CHOICES = [
        ("pending_response", "Pending Response"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("awaiting_delivery_agreement", "Awaiting Delivery Agreement"),
        ("preparing", "Preparing"),
        ("ready_for_collection", "Ready for Collection"),
        ("dispatched", "Dispatched"),
        ("delivered", "Delivered"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("issue_reported", "Issue Reported"),
    ]
    FULFILMENT_METHOD_CHOICES = [
        ("personal_delivery", "Personal Delivery"),
        ("courier", "Third-Party Courier"),
        ("collection", "Buyer Collection"),
        ("custom", "Custom Arrangement"),
        ("undecided", "To Be Agreed"),
    ]

    master_order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="seller_orders",
        help_text="Master Order placed by the buyer."
    )
    suborder_number = models.CharField(
        max_length=60,
        unique=True,
        help_text="Unique seller-facing suborder identifier (e.g. UM-202611-1001-A)."
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_suborders",
        help_text="Seller responsible for fulfilling this suborder."
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="buyer_suborders",
        help_text="Buyer who purchased this suborder."
    )

    status = models.CharField(
        max_length=40,
        choices=STATUS_CHOICES,
        default="pending_response",
        help_text="Current state in the seller suborder fulfillment lifecycle."
    )

    # Financial details
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Product sum for this seller's items."
    )
    advertised_delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Initial delivery fee calculated from seller defaults or selected method."
    )
    confirmed_delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Agreed delivery fee after proposal acceptance or confirmation."
    )

    fulfilment_method = models.CharField(
        max_length=40,
        choices=FULFILMENT_METHOD_CHOICES,
        default="personal_delivery",
        help_text="How this suborder is fulfilled."
    )
    delivery_location = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Agreed campus location or collection meeting point."
    )
    estimated_delivery = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Estimated date/time or window for collection or drop-off."
    )

    seller_response_deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text="12-hour default deadline for the seller to accept or reject the order."
    )
    rejection_reason = models.TextField(
        blank=True,
        default="",
        help_text="Reason provided by seller if suborder was rejected."
    )
    cancellation_reason = models.TextField(
        blank=True,
        default="",
        help_text="Reason provided if suborder was cancelled."
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="cancelled_suborders",
        help_text="User (buyer, seller, or admin) who cancelled the suborder."
    )

    inventory_deducted = models.BooleanField(
        default=False,
        help_text="True once stock has been atomically decremented upon order completion."
    )
    vendor_confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when seller or buyer completed fulfillment."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['master_order'], name='suborder_master_idx'),
            models.Index(fields=['seller', 'status'], name='suborder_seller_status_idx'),
            models.Index(fields=['buyer', 'status'], name='suborder_buyer_status_idx'),
            models.Index(fields=['suborder_number'], name='suborder_num_idx'),
            models.Index(fields=['created_at'], name='suborder_created_idx'),
        ]

    def __str__(self):
        return f"Suborder {self.suborder_number} ({self.seller.email} - {self.status})"

    @property
    def total_amount(self):
        fee = self.confirmed_delivery_fee if self.confirmed_delivery_fee > 0 else self.advertised_delivery_fee
        return self.subtotal + (fee or Decimal("0.00"))

    def log_event(self, actor, event_type, from_status="", to_status="", description=""):
        return OrderEvent.objects.create(
            seller_order=self,
            actor=actor,
            event_type=event_type,
            from_status=from_status,
            to_status=to_status,
            description=description,
        )


class OrderItem(models.Model):
    """
    Individual line item in an order.
    Points to the Master Order as well as the specific SellerOrder (suborder).
    Stores snapshots of product details at purchase time to protect against
    catalog mutations or deletions.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )
    seller_order = models.ForeignKey(
        SellerOrder,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="The specific seller suborder this line item belongs to."
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="order_items"
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sales_items"
    )
    quantity = models.PositiveIntegerField(default=1)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    # Immutability snapshots
    product_title_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Product title at time of order."
    )
    product_image_snapshot = models.CharField(
        max_length=1000,
        blank=True,
        default="",
        help_text="Product primary image at time of order."
    )
    unit_price_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Product unit price at time of order."
    )

    def save(self, *args, **kwargs):
        if not self.total_price:
            self.total_price = Decimal(str(self.quantity)) * Decimal(str(self.price_at_purchase))
        if not self.product_title_snapshot and self.product:
            self.product_title_snapshot = self.product.title
        if not self.product_image_snapshot and self.product:
            self.product_image_snapshot = self.product.image or ""
        if self.unit_price_snapshot is None:
            self.unit_price_snapshot = self.price_at_purchase
        super().save(*args, **kwargs)

    def __str__(self):
        sub_id = self.seller_order.suborder_number if self.seller_order else f"Order #{self.order_id}"
        return f"{self.quantity}x {self.product_title_snapshot or self.product.title} in {sub_id}"


class DeliveryAgreement(models.Model):
    """
    Structured delivery / collection proposal and agreed terms for a SellerOrder.
    Can be proposed by seller or requested by buyer, and accepted/declined.
    Agreed terms directly update the suborder delivery fee and location.
    """
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("superseded", "Superseded"),
    ]

    seller_order = models.ForeignKey(
        SellerOrder,
        on_delete=models.CASCADE,
        related_name="delivery_agreements",
        help_text="Suborder for which delivery arrangement is proposed."
    )
    proposed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="proposed_delivery_agreements",
        help_text="User who initiated this delivery proposal."
    )
    fulfilment_method = models.CharField(
        max_length=40,
        choices=SellerOrder.FULFILMENT_METHOD_CHOICES,
        default="personal_delivery"
    )
    proposed_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Proposed delivery fee."
    )
    delivery_location = models.CharField(
        max_length=255,
        help_text="Proposed hand-off / collection location."
    )
    estimated_delivery = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Proposed date, time, or delivery window."
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Additional terms or notes for this proposal."
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending"
    )
    rejection_reason = models.TextField(
        blank=True,
        default="",
        help_text="Feedback if proposal was declined."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Proposal #{self.id} for {self.seller_order.suborder_number} ({self.status})"


class OrderEvent(models.Model):
    """
    Immutable audit log for suborder events, state transitions, and messages.
    """
    seller_order = models.ForeignKey(
        SellerOrder,
        on_delete=models.CASCADE,
        related_name="events"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="order_events_triggered"
    )
    event_type = models.CharField(max_length=50)
    from_status = models.CharField(max_length=40, blank=True, default="")
    to_status = models.CharField(max_length=40, blank=True, default="")
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.event_type}] {self.seller_order.suborder_number} at {self.created_at}"


class OrderIssueReport(models.Model):
    """
    Dispute / issue report raised on a specific SellerOrder by buyer or seller.
    Visible in Admin Panel with investigation status and administrative notes.
    """
    ISSUE_TYPE_CHOICES = [
        ("item_not_received", "Item Not Received"),
        ("wrong_item", "Wrong Item Delivered"),
        ("damaged", "Damaged / Defective Item"),
        ("seller_unresponsive", "Seller Unresponsive"),
        ("buyer_unresponsive", "Buyer Unresponsive"),
        ("delivery_dispute", "Delivery Fee / Location Dispute"),
        ("payment_dispute", "Direct Payment Dispute"),
        ("other", "Other Issue"),
    ]
    STATUS_CHOICES = [
        ("open", "Open"),
        ("investigating", "Under Investigation"),
        ("resolved", "Resolved"),
        ("dismissed", "Dismissed"),
    ]

    seller_order = models.ForeignKey(
        SellerOrder,
        on_delete=models.CASCADE,
        related_name="issue_reports"
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="order_issues_reported"
    )
    issue_type = models.CharField(
        max_length=40,
        choices=ISSUE_TYPE_CHOICES,
        default="other"
    )
    description = models.TextField(help_text="Detailed description of the issue.")
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="open"
    )
    admin_notes = models.TextField(blank=True, default="")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="resolved_order_issues"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Issue #{self.id} on {self.seller_order.suborder_number} ({self.status})"
