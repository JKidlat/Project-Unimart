"""
Concurrency-safe order inventory deduction services.
Stock is NEVER decremented during cart addition or checkout initiation;
it is deducted atomically only once the vendor confirms and completes the order.
"""

from collections import defaultdict
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from marketplace.models import Product
from .models import Order


@transaction.atomic
def complete_order_and_deduct_inventory(order: Order) -> Order:
    """
    Atomically verify and deduct remaining stock for every OrderItem when an
    order is confirmed as `completed`. Prevents negative stock and overselling
    under concurrent order completions via `select_for_update()` + conditional F().
    """
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

    # Verify availability for all items before mutating any row
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

    # Conditional atomic update prevents negative stock even under extreme contention
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

