"""
Concurrency-safe order inventory deduction services.
Stock is NEVER decremented during cart addition or checkout initiation;
it is deducted atomically only once a suborder is confirmed and completed.
Supports completing individual SellerOrders (suborders) without mutating or
impacting other sellers' items in the same Master Order.
"""

from collections import defaultdict
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from marketplace.models import Product
from .models import Order, SellerOrder


@transaction.atomic
def complete_seller_order_and_deduct_inventory(seller_order: SellerOrder, actor=None) -> SellerOrder:
    """
    Atomically verify and deduct remaining stock for items belonging to this specific SellerOrder.
    Deduction is strictly scoped to this seller's items and does not mutate or affect other sellers' items.
    """
    locked_suborder = SellerOrder.objects.select_for_update().get(pk=seller_order.pk)

    if locked_suborder.status in ("cancelled", "rejected"):
        raise ValidationError({"status": f"Cannot complete a {locked_suborder.status} suborder."})

    if locked_suborder.inventory_deducted:
        if locked_suborder.status != "completed":
            old_status = locked_suborder.status
            locked_suborder.status = "completed"
            locked_suborder.save(update_fields=["status", "updated_at"])
            locked_suborder.log_event(actor, "completed", old_status, "completed", "Order completed by participant.")
            locked_suborder.master_order.recalculate_derived_status_and_totals(save=True)
        return locked_suborder

    items = list(locked_suborder.items.select_related("product").all())
    if not items:
        old_status = locked_suborder.status
        locked_suborder.status = "completed"
        locked_suborder.vendor_confirmed_at = locked_suborder.vendor_confirmed_at or timezone.now()
        locked_suborder.save(update_fields=["status", "vendor_confirmed_at", "updated_at"])
        locked_suborder.log_event(actor, "completed", old_status, "completed", "Order completed.")
        locked_suborder.master_order.recalculate_derived_status_and_totals(save=True)
        return locked_suborder

    required_by_product = defaultdict(int)
    for item in items:
        required_by_product[item.product_id] += int(item.quantity or 0)

    sorted_product_ids = sorted(required_by_product.keys())
    locked_products = {
        p.id: p
        for p in Product.objects.select_for_update().filter(id__in=sorted_product_ids).order_by("id")
    }

    # Verify availability for all items before mutating any row
    for pid in sorted_product_ids:
        needed = required_by_product[pid]
        product = locked_products.get(pid)
        if not product:
            raise ValidationError({"status": f"Product #{pid} no longer exists in catalog."})
        if product.stock < needed:
            raise ValidationError({
                "status": (
                    f'Insufficient stock to complete suborder {locked_suborder.suborder_number}: '
                    f'"{product.title}" has {product.stock} unit(s) remaining (requires {needed}).'
                )
            })

    # Conditional atomic update prevents negative stock even under extreme contention
    for pid in sorted_product_ids:
        needed = required_by_product[pid]
        updated = Product.objects.filter(id=pid, stock__gte=needed).update(
            stock=F("stock") - needed,
            updated_at=timezone.now(),
        )
        if updated == 0:
            raise ValidationError({
                "status": f"Unable to complete suborder {locked_suborder.suborder_number} due to concurrent stock depletion."
            })

    old_status = locked_suborder.status
    locked_suborder.status = "completed"
    locked_suborder.inventory_deducted = True
    locked_suborder.vendor_confirmed_at = timezone.now()
    locked_suborder.save(update_fields=["status", "inventory_deducted", "vendor_confirmed_at", "updated_at"])
    locked_suborder.log_event(actor, "completed", old_status, "completed", "Suborder fulfilled and completed. Inventory deducted.")

    # Refresh master order totals and derived overall status
    locked_suborder.master_order.recalculate_derived_status_and_totals(save=True)
    return locked_suborder


@transaction.atomic
def complete_order_and_deduct_inventory(order: Order, actor=None) -> Order:
    """
    Completes all eligible suborders within a Master Order and deducts inventory.
    Maintained for backward compatibility with master order status updates.
    """
    suborders = order.seller_orders.all()
    if suborders.exists():
        for sub in suborders:
            if sub.status not in ("completed", "cancelled", "rejected"):
                complete_seller_order_and_deduct_inventory(sub, actor=actor)
        order.refresh_from_db()
        if all(s.inventory_deducted for s in order.seller_orders.all()):
            order.inventory_deducted = True
            order.vendor_confirmed_at = order.vendor_confirmed_at or timezone.now()
            order.status = "completed"
            order.overall_status = "completed"
            order.save(update_fields=['inventory_deducted', 'vendor_confirmed_at', 'status', 'overall_status', 'updated_at'])
        return order

    # Fallback legacy path if no suborders exist
    locked_order = Order.objects.select_for_update().get(pk=order.pk)
    if locked_order.status == "cancelled":
        raise ValidationError({"status": "Cancelled orders cannot be confirmed as completed."})

    if locked_order.inventory_deducted:
        if locked_order.status != "completed":
            locked_order.status = "completed"
            locked_order.save(update_fields=["status", "updated_at"])
        return locked_order

    items = list(locked_order.items.select_related("product").all())
    if not items:
        locked_order.status = "completed"
        locked_order.vendor_confirmed_at = locked_order.vendor_confirmed_at or timezone.now()
        locked_order.save(update_fields=["status", "vendor_confirmed_at", "updated_at"])
        return locked_order

    required_by_product = defaultdict(int)
    for item in items:
        required_by_product[item.product_id] += int(item.quantity or 0)

    sorted_product_ids = sorted(required_by_product.keys())
    locked_products = {
        p.id: p
        for p in Product.objects.select_for_update().filter(id__in=sorted_product_ids).order_by("id")
    }

    for pid in sorted_product_ids:
        needed = required_by_product[pid]
        product = locked_products.get(pid)
        if not product:
            raise ValidationError({"status": f"Product #{pid} no longer exists in catalog."})
        if product.stock < needed:
            raise ValidationError({
                "status": (
                    f'Insufficient stock to confirm order #{locked_order.id}: '
                    f'"{product.title}" has {product.stock} unit(s) remaining (requires {needed}).'
                )
            })

    for pid in sorted_product_ids:
        needed = required_by_product[pid]
        updated = Product.objects.filter(id=pid, stock__gte=needed).update(
            stock=F("stock") - needed,
            updated_at=timezone.now(),
        )
        if updated == 0:
            raise ValidationError({
                "status": f"Unable to complete order #{locked_order.id} due to concurrent stock depletion."
            })

    locked_order.status = "completed"
    locked_order.inventory_deducted = True
    locked_order.vendor_confirmed_at = timezone.now()
    locked_order.save(update_fields=["status", "inventory_deducted", "vendor_confirmed_at", "updated_at"])
    return locked_order
