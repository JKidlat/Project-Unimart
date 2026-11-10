"""
Administrator-only API views backing the Unimart Admin Suite.

Every view in this module strictly enforces `IsPlatformAdmin` (active user
with `is_staff=True` or `is_superuser=True`) and computes results directly
from the production/application database with zero mock or placeholder data.
"""

from datetime import timedelta
from decimal import Decimal
import calendar

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.db.models.deletion import ProtectedError
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import KYCSubmission, Profile, RoleChangeRequest
from accounts.serializers import RoleChangeRequestSerializer
from core.permissions import IsPlatformAdmin
from marketplace.models import Product
from orders.models import Order, OrderItem
from payments.models import Payment
from reviews.models import Review
from universities.catalog import (
    CATEGORY_PRIVATE,
    CATEGORY_PUBLIC,
    CATEGORY_TECHNICAL,
)
from universities.models import University
from universities.serializers import AdminUniversitySerializer

User = get_user_model()


def _user_role_label(user) -> str:
    if user.is_staff or user.is_superuser:
        return "Admin"
    profile = getattr(user, "profile", None)
    return "Seller" if (profile and profile.is_vendor) else "Buyer"


def _serialize_admin_user(user, buyer_totals=None, seller_totals=None, kyc_map=None) -> dict:
    profile = getattr(user, "profile", None)
    uni = getattr(profile, "university", None) if profile else None
    b_stats = (buyer_totals or {}).get(user.id, {})
    s_stats = (seller_totals or {}).get(user.id, {})
    kyc_status = (kyc_map or {}).get(user.id, "none")

    return {
        "id": user.id,
        "name": user.full_name or user.email.split("@")[0],
        "full_name": user.full_name or "",
        "email": user.email,
        "phone": user.phone_number or "",
        "university": uni.name if uni else "Unassigned",
        "university_short_name": uni.short_name if uni else "",
        "university_id": uni.id if uni else None,
        "role": _user_role_label(user),
        "is_vendor": bool(profile.is_vendor) if profile else False,
        "business_name": profile.business_name if profile else "",
        "is_staff": bool(user.is_staff),
        "is_superuser": bool(user.is_superuser),
        "is_active": bool(user.is_active),
        "status": "Active" if user.is_active else "Suspended",
        "verified": bool(user.is_verified_student),
        "is_verified_student": bool(user.is_verified_student),
        "is_email_verified": bool(user.is_email_verified),
        "kyc_status": kyc_status,
        "has_firebase_linked": bool(getattr(user, "firebase_uid", None)),
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "totalPurchases": int(b_stats.get("orders_count", 0) or 0),
        "spent": float(b_stats.get("total_spent", 0) or 0),
        "totalSales": int(s_stats.get("sales_count", 0) or 0),
        "earned": float(s_stats.get("total_earned", 0) or 0),
    }


def _serialize_admin_product(product) -> dict:
    seller = product.seller
    profile = getattr(seller, "profile", None)
    seller_uni = getattr(profile, "university", None) if profile else None
    cat = product.category
    uni = product.university

    return {
        "id": product.id,
        "name": product.title,
        "title": product.title,
        "price": float(product.price),
        "oldPrice": float(product.old_price) if product.old_price is not None else None,
        "category": cat.name if cat else "Others",
        "category_slug": cat.slug if cat else "others",
        "condition": product.condition,
        "status": product.status,
        "is_available": bool(product.is_available),
        "flagReason": product.flag_reason or "",
        "rejectionReason": product.rejection_reason or "",
        "image": product.image or "",
        "description": product.description or "",
        "university": uni.name if uni else "",
        "university_short_name": uni.short_name if uni else "",
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "updated_at": product.updated_at.isoformat() if product.updated_at else None,
        "seller": {
            "id": seller.id,
            "name": seller.full_name or seller.email.split("@")[0],
            "email": seller.email,
            "phone": seller.phone_number or "",
            "university": seller_uni.name if seller_uni else (uni.name if uni else "Unassigned"),
            "verified": bool(seller.is_verified_student),
            "business_name": profile.business_name if profile else "",
        },
    }


def _serialize_admin_order(order) -> dict:
    items = list(order.items.all())
    return {
        "id": order.id,
        "full_name": order.full_name or (order.buyer.full_name if order.buyer else "") or "Campus Student",
        "buyer_email": order.buyer.email if order.buyer else "",
        "phone_number": order.phone_number or "",
        "university": order.university or "Unassigned",
        "hostel_room": order.hostel_room or "",
        "total_amount": float(order.total_amount or 0),
        "delivery_fee": float(order.delivery_fee or 0),
        "payment_method": order.payment_method or "paystack",
        "paystack_reference": order.payment_reference or "",
        "status": order.status,
        "refund_status": order.refund_status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "items_count": sum(item.quantity for item in items) or len(items),
    }


def _serialize_admin_review(review) -> dict:
    reviewer = review.user
    profile = getattr(reviewer, "profile", None)
    uni = getattr(profile, "university", None) if profile else None
    return {
        "id": review.id,
        "productId": review.product_id,
        "productName": review.product.title if review.product else "Product",
        "reviewerName": reviewer.full_name or reviewer.email.split("@")[0],
        "reviewerEmail": reviewer.email,
        "university": uni.name if uni else "Unassigned",
        "rating": review.rating,
        "reviewText": review.comment or "",
        "status": review.moderation_status,
        "reportCount": review.report_count,
        "flagReason": review.flag_reason or "",
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }


def _build_revenue_series(time_range: str, now):
    local_now = timezone.localtime(now)
    today = local_now.date()

    if time_range == "30d":
        start_date = today - timedelta(days=27)
        buckets = []
        for idx in range(4):
            b_start = start_date + timedelta(days=idx * 7)
            b_end = b_start + timedelta(days=6)
            buckets.append({
                "name": f"{b_start.strftime('%b %d')}-{b_end.strftime('%d')}",
                "start": b_start,
                "end": b_end,
                "revenue": 0.0,
                "orders": 0,
            })
        orders = (
            Order.objects.filter(created_at__date__gte=start_date)
            .exclude(status="cancelled")
            .values("created_at", "total_amount")
        )
        for row in orders:
            d = timezone.localtime(row["created_at"]).date()
            for bucket in buckets:
                if bucket["start"] <= d <= bucket["end"]:
                    bucket["revenue"] += float(row["total_amount"] or 0)
                    bucket["orders"] += 1
                    break
        return [{"name": b["name"], "revenue": round(b["revenue"], 2), "orders": b["orders"]} for b in buckets]

    if time_range == "ytd":
        year = today.year
        buckets = []
        for month in range(1, today.month + 1):
            buckets.append({
                "month": month,
                "name": calendar.month_abbr[month],
                "revenue": 0.0,
                "orders": 0,
            })
        orders = (
            Order.objects.filter(created_at__year=year)
            .exclude(status="cancelled")
            .values("created_at", "total_amount")
        )
        for row in orders:
            m = timezone.localtime(row["created_at"]).month
            if 1 <= m <= len(buckets):
                buckets[m - 1]["revenue"] += float(row["total_amount"] or 0)
                buckets[m - 1]["orders"] += 1
        return [{"name": b["name"], "revenue": round(b["revenue"], 2), "orders": b["orders"]} for b in buckets]

    # Default: 7d
    start_date = today - timedelta(days=6)
    day_map = {}
    series = []
    for offset in range(7):
        d = start_date + timedelta(days=offset)
        entry = {"name": d.strftime("%a %d"), "revenue": 0.0, "orders": 0}
        day_map[d] = entry
        series.append(entry)

    orders = (
        Order.objects.filter(created_at__date__gte=start_date)
        .exclude(status="cancelled")
        .values("created_at", "total_amount")
    )
    for row in orders:
        d = timezone.localtime(row["created_at"]).date()
        if d in day_map:
            day_map[d]["revenue"] += float(row["total_amount"] or 0)
            day_map[d]["orders"] += 1
    for entry in series:
        entry["revenue"] = round(entry["revenue"], 2)
    return series


class AdminDashboardView(APIView):
    """
    Aggregated real-time platform KPIs, revenue chart series, KYC queue,
    recent registrations, and recent platform activities from database records.
    """

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        now = timezone.now()
        today = timezone.localtime(now).date()
        seven_days_ago = now - timedelta(days=7)
        time_range = (request.query_params.get("range") or "7d").lower()
        if time_range not in ("7d", "30d", "ytd"):
            time_range = "7d"

        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        suspended_users = User.objects.filter(is_active=False).count()
        total_admins = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).count()
        total_sellers = User.objects.filter(
            is_staff=False, is_superuser=False, profile__is_vendor=True
        ).count()
        total_buyers = User.objects.filter(
            is_staff=False, is_superuser=False
        ).filter(Q(profile__is_vendor=False) | Q(profile__isnull=True)).count()
        verified_students = User.objects.filter(is_verified_student=True).count()
        verified_emails = User.objects.filter(is_email_verified=True).count()
        recent_registrations_7d = User.objects.filter(date_joined__gte=seven_days_ago).count()

        total_products = Product.objects.count()
        live_products = Product.objects.filter(status="live", is_available=True).count()
        pending_ads = Product.objects.filter(status="pending_approval").count()
        flagged_products = Product.objects.filter(status="flagged").count()
        hidden_products = Product.objects.filter(status="hidden").count()
        rejected_products = Product.objects.filter(status="rejected").count()

        pending_kyc = KYCSubmission.objects.filter(status="pending").count()
        pending_role_requests = RoleChangeRequest.objects.filter(status="pending").count()

        non_cancelled_orders = Order.objects.exclude(status="cancelled")
        total_orders = Order.objects.count()
        orders_today = Order.objects.filter(created_at__date=today).count()
        today_revenue = float(
            non_cancelled_orders.filter(created_at__date=today).aggregate(
                total=Coalesce(Sum("total_amount"), Decimal("0.00"))
            )["total"]
        )
        total_revenue = float(
            non_cancelled_orders.aggregate(
                total=Coalesce(Sum("total_amount"), Decimal("0.00"))
            )["total"]
        )
        paid_revenue = float(
            Order.objects.filter(status__in=["paid", "shipped", "completed"]).aggregate(
                total=Coalesce(Sum("total_amount"), Decimal("0.00"))
            )["total"]
        )
        non_cancelled_count = non_cancelled_orders.count()
        avg_order_value = round(total_revenue / non_cancelled_count, 2) if non_cancelled_count > 0 else 0.0
        refund_requests = Order.objects.filter(refund_status="requested").count()

        total_reviews = Review.objects.count()
        pending_reviews = Review.objects.filter(moderation_status="pending").count()
        flagged_reviews = Review.objects.filter(moderation_status="flagged").count()
        removed_reviews = Review.objects.filter(moderation_status="removed").count()

        total_universities = University.objects.count()
        active_universities = University.objects.filter(is_active=True).count()

        kyc_queue_qs = list(
            KYCSubmission.objects.select_related("user", "user__profile__university")
            .filter(status="pending")
            .order_by("-submitted_at")[:6]
        )
        if not kyc_queue_qs:
            kyc_queue_qs = list(
                KYCSubmission.objects.select_related("user", "user__profile__university")
                .order_by("-submitted_at")[:5]
            )

        kyc_queue = [
            {
                "id": k.id,
                "name": k.user.full_name or k.email.split("@")[0],
                "email": k.email,
                "institution_email": k.institution_email,
                "business_name": k.business_name,
                "school": (
                    k.user.profile.university.short_name
                    if getattr(getattr(k.user, "profile", None), "university", None)
                    else "Unassigned"
                ),
                "mode": k.mode,
                "status": k.status,
                "submitted_at": k.submitted_at.isoformat() if k.submitted_at else None,
            }
            for k in kyc_queue_qs
        ]

        recent_users_qs = User.objects.select_related("profile", "profile__university").order_by(
            "-date_joined", "-id"
        )[:6]
        recent_registrations = [
            {
                "id": u.id,
                "name": u.full_name or u.email.split("@")[0],
                "email": u.email,
                "role": _user_role_label(u),
                "university": (
                    u.profile.university.name
                    if getattr(getattr(u, "profile", None), "university", None)
                    else "Unassigned"
                ),
                "is_active": u.is_active,
                "is_email_verified": u.is_email_verified,
                "date_joined": u.date_joined.isoformat() if u.date_joined else None,
            }
            for u in recent_users_qs
        ]

        return Response({
            "stats": {
                "total_users": total_users,
                "active_users": active_users,
                "suspended_users": suspended_users,
                "total_buyers": total_buyers,
                "total_sellers": total_sellers,
                "total_admins": total_admins,
                "verified_students": verified_students,
                "verified_emails": verified_emails,
                "recent_registrations_7d": recent_registrations_7d,
                "total_products": total_products,
                "live_products": live_products,
                "pending_ads": pending_ads,
                "flagged_products": flagged_products,
                "hidden_products": hidden_products,
                "rejected_products": rejected_products,
                "pending_kyc": pending_kyc,
                "pending_role_requests": pending_role_requests,
                "total_orders": total_orders,
                "orders_today": orders_today,
                "today_revenue": round(today_revenue, 2),
                "total_revenue": round(total_revenue, 2),
                "paid_revenue": round(paid_revenue, 2),
                "avg_order_value": avg_order_value,
                "refund_requests": refund_requests,
                "total_reviews": total_reviews,
                "pending_reviews": pending_reviews,
                "flagged_reviews": flagged_reviews,
                "removed_reviews": removed_reviews,
                "total_universities": total_universities,
                "active_universities": active_universities,
            },
            "badges": {
                "kyc": pending_kyc,
                "ads": pending_ads,
                "role_requests": pending_role_requests,
            },
            "revenue_series": _build_revenue_series(time_range, now),
            "pending_kyc_queue": kyc_queue,
            "recent_registrations": recent_registrations,
        })


class AdminActivityView(APIView):
    """Real chronological platform activity stream compiled from actual database records."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        type_filter = (request.query_params.get("type") or "all").lower()
        events = []

        for u in User.objects.select_related("profile", "profile__university").order_by("-date_joined", "-id")[:25]:
            uni = getattr(getattr(u, "profile", None), "university", None)
            role = _user_role_label(u)
            events.append({
                "id": f"signup-{u.id}",
                "type": "signup",
                "message": f"Registered as {role}",
                "subtext": u.email,
                "user": u.full_name or u.email.split("@")[0],
                "university": uni.name if uni else "Unassigned",
                "amount": None,
                "timestamp": u.date_joined.isoformat() if u.date_joined else None,
            })

        for p in Product.objects.select_related("seller", "university", "category").order_by("-created_at")[:25]:
            events.append({
                "id": f"listing-{p.id}",
                "type": "listing",
                "message": f"Listing ({p.status.replace('_', ' ')})",
                "subtext": f"{p.title} • {p.category.name if p.category else 'Others'}",
                "user": p.seller.full_name or p.seller.email,
                "university": p.university.name if p.university else "Unassigned",
                "amount": f"GH₵{float(p.price):,.2f}",
                "timestamp": p.created_at.isoformat() if p.created_at else None,
            })

        for o in Order.objects.select_related("buyer").order_by("-created_at")[:25]:
            events.append({
                "id": f"order-{o.id}",
                "type": "order",
                "message": f"Order #{o.id} ({o.status})",
                "subtext": f"Method: {o.payment_method}" + (f" • Ref: {o.payment_reference}" if o.payment_reference else ""),
                "user": o.full_name or (o.buyer.full_name if o.buyer else "") or (o.buyer.email if o.buyer else "Buyer"),
                "university": o.university or "Unassigned",
                "amount": f"GH₵{float(o.total_amount):,.2f}",
                "timestamp": o.created_at.isoformat() if o.created_at else None,
            })

        for pay in Payment.objects.select_related("user", "user__profile__university").order_by("-created_at")[:25]:
            uni = getattr(getattr(pay.user, "profile", None), "university", None)
            events.append({
                "id": f"payment-{pay.id}",
                "type": "payment",
                "message": f"Payment {pay.status} via {pay.channel}",
                "subtext": f"Ref: {pay.reference}",
                "user": pay.user.full_name or pay.user.email,
                "university": uni.name if uni else "Unassigned",
                "amount": f"GH₵{float(pay.amount):,.2f}",
                "timestamp": pay.created_at.isoformat() if pay.created_at else None,
            })

        for k in KYCSubmission.objects.select_related("user", "user__profile__university").order_by("-submitted_at")[:20]:
            uni = getattr(getattr(k.user, "profile", None), "university", None)
            events.append({
                "id": f"kyc-{k.id}",
                "type": "kyc",
                "message": f"Seller KYC {k.status}",
                "subtext": k.business_name or k.email,
                "user": k.user.full_name or k.email,
                "university": uni.name if uni else "Unassigned",
                "amount": None,
                "timestamp": k.submitted_at.isoformat() if k.submitted_at else None,
            })

        for r in Review.objects.select_related("user", "user__profile__university", "product").order_by("-created_at")[:20]:
            uni = getattr(getattr(r.user, "profile", None), "university", None)
            events.append({
                "id": f"review-{r.id}",
                "type": "review",
                "message": f"{r.rating}-star review on {r.product.title}",
                "subtext": (r.comment or "")[:120],
                "user": r.user.full_name or r.user.email,
                "university": uni.name if uni else "Unassigned",
                "amount": None,
                "timestamp": r.created_at.isoformat() if r.created_at else None,
            })

        events.sort(key=lambda e: e["timestamp"] or "", reverse=True)

        counts = {
            "signup": User.objects.count(),
            "listing": Product.objects.count(),
            "order": Order.objects.count(),
            "payment": Payment.objects.count(),
            "kyc": KYCSubmission.objects.count(),
            "review": Review.objects.count(),
        }

        if type_filter != "all":
            events = [e for e in events if e["type"] == type_filter]

        return Response({
            "counts": counts,
            "results": events[:50],
        })


class AdminUserListView(APIView):
    """List all registered users and real aggregate statistics (Admin only)."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        search = (request.query_params.get("search") or "").strip()
        role_filter = (request.query_params.get("role") or "All").strip()
        status_filter = (request.query_params.get("status") or "All").strip()

        buyer_totals = {
            row["buyer_id"]: row
            for row in Order.objects.exclude(status="cancelled")
            .values("buyer_id")
            .annotate(
                orders_count=Count("id"),
                total_spent=Coalesce(Sum("total_amount"), Decimal("0.00")),
            )
        }
        seller_totals = {
            row["seller_id"]: row
            for row in OrderItem.objects.exclude(order__status="cancelled")
            .values("seller_id")
            .annotate(
                sales_count=Coalesce(Sum("quantity"), 0),
                total_earned=Coalesce(Sum("total_price"), Decimal("0.00")),
            )
        }
        kyc_map = {}
        for sub in KYCSubmission.objects.order_by("-submitted_at"):
            if sub.user_id not in kyc_map:
                kyc_map[sub.user_id] = sub.status

        stats = {
            "total_users": User.objects.count(),
            "total_buyers": User.objects.filter(is_staff=False, is_superuser=False).filter(
                Q(profile__is_vendor=False) | Q(profile__isnull=True)
            ).count(),
            "active_sellers": User.objects.filter(
                is_staff=False, is_superuser=False, is_active=True, profile__is_vendor=True
            ).count(),
            "verified_students": User.objects.filter(is_verified_student=True).count(),
            "suspended_users": User.objects.filter(is_active=False).count(),
        }

        qs = User.objects.select_related("profile", "profile__university").order_by("-date_joined", "-id")
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(profile__university__name__icontains=search)
                | Q(profile__university__short_name__icontains=search)
            )
        if status_filter.lower() == "active":
            qs = qs.filter(is_active=True)
        elif status_filter.lower() == "suspended":
            qs = qs.filter(is_active=False)

        if role_filter.lower() == "admin":
            qs = qs.filter(Q(is_staff=True) | Q(is_superuser=True))
        elif role_filter.lower() == "seller":
            qs = qs.filter(is_staff=False, is_superuser=False, profile__is_vendor=True)
        elif role_filter.lower() == "buyer":
            qs = qs.filter(is_staff=False, is_superuser=False).filter(
                Q(profile__is_vendor=False) | Q(profile__isnull=True)
            )

        users_data = [
            _serialize_admin_user(u, buyer_totals=buyer_totals, seller_totals=seller_totals, kyc_map=kyc_map)
            for u in qs
        ]
        return Response({"stats": stats, "results": users_data})


class AdminUserDetailView(APIView):
    """Manage a specific user's active status, verification flag, or Buyer/Seller role."""

    permission_classes = [IsPlatformAdmin]

    @transaction.atomic
    def patch(self, request, pk):
        target = generics.get_object_or_404(User, pk=pk)
        profile, _ = Profile.objects.get_or_create(user=target)
        action = (request.data.get("action") or "").strip().lower()

        if "is_active" in request.data:
            next_active = bool(request.data.get("is_active"))
            if target.pk == request.user.pk and not next_active:
                return Response(
                    {"error": "You cannot suspend your own administrator account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if target.is_superuser and not request.user.is_superuser and not next_active:
                return Response(
                    {"error": "Only a superuser can deactivate a superuser account."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            target.is_active = next_active

        if "is_verified_student" in request.data:
            target.is_verified_student = bool(request.data.get("is_verified_student"))

        if action == "graduate_seller":
            if target.is_staff or target.is_superuser:
                return Response(
                    {"error": "Administrator accounts cannot be modified via student graduation."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.is_vendor = False
            profile.save(update_fields=["is_vendor"])
            Product.objects.filter(seller=target, status__in=["live", "pending_approval"]).update(
                status="hidden", is_available=False
            )
        elif "role" in request.data:
            next_role = str(request.data.get("role") or "").strip()
            if next_role == "Admin":
                return Response(
                    {
                        "error": "Use the Admin Security panel (superuser required) to grant administrator privileges."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            if next_role not in ("Buyer", "Seller"):
                return Response({"error": "Invalid role. Must be Buyer or Seller."}, status=status.HTTP_400_BAD_REQUEST)
            if target.is_staff or target.is_superuser:
                return Response(
                    {"error": "Administrator accounts cannot be converted via student role controls."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.is_vendor = next_role == "Seller"
            profile.save(update_fields=["is_vendor"])

        target.save()
        return Response({"user": _serialize_admin_user(target)})


class AdminProductListView(APIView):
    """List all marketplace products and moderation summary counts (Admin only)."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        status_filter = (request.query_params.get("status") or "all").strip()
        category_filter = (request.query_params.get("category") or "all").strip()
        search = (request.query_params.get("search") or "").strip()

        stats = {
            "total": Product.objects.count(),
            "live": Product.objects.filter(status="live").count(),
            "pending_approval": Product.objects.filter(status="pending_approval").count(),
            "flagged": Product.objects.filter(status="flagged").count(),
            "hidden": Product.objects.filter(status="hidden").count(),
            "rejected": Product.objects.filter(status="rejected").count(),
        }

        qs = Product.objects.select_related(
            "seller", "seller__profile", "seller__profile__university", "category", "university"
        ).order_by("-created_at")

        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)
        if category_filter and category_filter.lower() != "all":
            qs = qs.filter(
                Q(category__slug__iexact=category_filter) | Q(category__name__iexact=category_filter)
            )
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(seller__full_name__icontains=search)
                | Q(seller__email__icontains=search)
                | Q(university__name__icontains=search)
            )

        return Response({
            "stats": stats,
            "results": [_serialize_admin_product(p) for p in qs],
        })


class AdminProductDetailView(APIView):
    """Moderate (approve, flag, hide, reject) or remove a product listing (Admin only)."""

    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        product = generics.get_object_or_404(
            Product.objects.select_related("seller", "seller__profile", "category", "university"),
            pk=pk,
        )
        next_status = request.data.get("status")
        valid_statuses = {"pending_approval", "live", "flagged", "hidden", "rejected"}
        if next_status is not None:
            if next_status not in valid_statuses:
                return Response({"error": "Invalid product status."}, status=status.HTTP_400_BAD_REQUEST)
            product.status = next_status
            product.is_available = next_status == "live"
            if next_status == "live":
                product.flag_reason = ""
                product.rejection_reason = ""

        if "flag_reason" in request.data or "flagReason" in request.data:
            product.flag_reason = (request.data.get("flag_reason") or request.data.get("flagReason") or "").strip()

        if "rejection_reason" in request.data or "rejectionReason" in request.data:
            product.rejection_reason = (
                request.data.get("rejection_reason") or request.data.get("rejectionReason") or ""
            ).strip()

        if "is_available" in request.data and next_status is None:
            product.is_available = bool(request.data.get("is_available"))

        product.save()
        return Response({"product": _serialize_admin_product(product)})

    def delete(self, request, pk):
        product = generics.get_object_or_404(Product, pk=pk)
        try:
            product.delete()
            return Response({"message": "Listing deleted from catalog.", "archived": False})
        except ProtectedError:
            product.status = "hidden"
            product.is_available = False
            product.save(update_fields=["status", "is_available"])
            return Response({
                "message": "Listing has linked order history and was archived (hidden) instead of deleted.",
                "archived": True,
                "product": _serialize_admin_product(product),
            })


class AdminOrderListView(APIView):
    """List all orders and financial/order summary stats (Admin only)."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        today = timezone.localtime(timezone.now()).date()
        search = (request.query_params.get("search") or "").strip()
        status_filter = (request.query_params.get("status") or "all").strip().lower()

        all_orders = Order.objects.exclude(status="cancelled")
        stats = {
            "settled_volume": float(
                all_orders.aggregate(total=Coalesce(Sum("total_amount"), Decimal("0.00")))["total"]
            ),
            "total_orders": Order.objects.count(),
            "orders_today": Order.objects.filter(created_at__date=today).count(),
            "refund_requests": Order.objects.filter(refund_status="requested").count(),
            "refunded_count": Order.objects.filter(refund_status="refunded").count(),
        }

        qs = Order.objects.select_related("buyer").prefetch_related("items").order_by("-created_at")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)
        if search:
            q_filter = (
                Q(full_name__icontains=search)
                | Q(buyer__email__icontains=search)
                | Q(payment_reference__icontains=search)
                | Q(university__icontains=search)
            )
            if search.isdigit():
                q_filter |= Q(id=int(search))
            qs = qs.filter(q_filter)

        return Response({
            "stats": stats,
            "results": [_serialize_admin_order(o) for o in qs],
        })


class AdminOrderDetailView(APIView):
    """Update order status or process refund status (Admin only)."""

    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        order = generics.get_object_or_404(Order.objects.select_related("buyer").prefetch_related("items"), pk=pk)
        action = (request.data.get("action") or "").strip().lower()

        if action == "process_refund":
            order.refund_status = "refunded"
            order.status = "cancelled"
        else:
            if "status" in request.data:
                next_status = request.data.get("status")
                if next_status not in {c[0] for c in Order.STATUS_CHOICES}:
                    return Response({"error": "Invalid order status."}, status=status.HTTP_400_BAD_REQUEST)
                order.status = next_status
            if "refund_status" in request.data:
                next_refund = request.data.get("refund_status")
                if next_refund not in {c[0] for c in Order.REFUND_STATUS_CHOICES}:
                    return Response({"error": "Invalid refund status."}, status=status.HTTP_400_BAD_REQUEST)
                order.refund_status = next_refund

        order.save()
        return Response({"order": _serialize_admin_order(order)})


class AdminReviewListView(APIView):
    """List all reviews for admin moderation with DB counts (Admin only)."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        status_filter = (request.query_params.get("status") or "all").strip().lower()
        search = (request.query_params.get("search") or "").strip()

        total = Review.objects.count()
        pending = Review.objects.filter(moderation_status="pending").count()
        approved = Review.objects.filter(moderation_status="approved").count()
        flagged = Review.objects.filter(moderation_status="flagged").count()
        removed = Review.objects.filter(moderation_status="removed").count()
        approval_rate = round((approved / total) * 100, 1) if total > 0 else 0.0

        qs = Review.objects.select_related(
            "user", "user__profile", "user__profile__university", "product"
        ).order_by("-created_at")

        if status_filter and status_filter != "all":
            qs = qs.filter(moderation_status=status_filter)
        if search:
            qs = qs.filter(
                Q(product__title__icontains=search)
                | Q(user__full_name__icontains=search)
                | Q(comment__icontains=search)
                | Q(user__profile__university__name__icontains=search)
            )

        return Response({
            "stats": {
                "total": total,
                "pending": pending,
                "approved": approved,
                "flagged": flagged,
                "removed": removed,
                "approval_rate": approval_rate,
            },
            "results": [_serialize_admin_review(r) for r in qs],
        })


class AdminReviewDetailView(APIView):
    """Moderate or permanently remove a product review (Admin only)."""

    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        review = generics.get_object_or_404(
            Review.objects.select_related("user", "user__profile", "user__profile__university", "product"),
            pk=pk,
        )
        next_status = (request.data.get("status") or request.data.get("moderation_status") or "").strip().lower()
        if next_status:
            if next_status not in {"pending", "approved", "flagged", "removed"}:
                return Response({"error": "Invalid moderation status."}, status=status.HTTP_400_BAD_REQUEST)
            review.moderation_status = next_status
            if next_status == "flagged":
                review.report_count = review.report_count + 1
            elif next_status == "approved":
                review.flag_reason = ""

        if "flag_reason" in request.data or "flagReason" in request.data:
            review.flag_reason = (request.data.get("flag_reason") or request.data.get("flagReason") or "").strip()

        review.save()
        return Response({"review": _serialize_admin_review(review)})

    def delete(self, request, pk):
        review = generics.get_object_or_404(Review, pk=pk)
        review.delete()
        return Response({"message": "Review permanently deleted."})


class AdminRoleRequestListView(APIView):
    """List all student role change requests (Admin only)."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        status_filter = (request.query_params.get("status") or "all").strip().lower()
        all_qs = RoleChangeRequest.objects.select_related("user").order_by("-created_at")
        counts = {
            "all": all_qs.count(),
            "pending": all_qs.filter(status="pending").count(),
            "approved": all_qs.filter(status="approved").count(),
            "rejected": all_qs.filter(status="rejected").count(),
        }
        qs = all_qs if status_filter == "all" else all_qs.filter(status=status_filter)
        return Response({
            "counts": counts,
            "results": RoleChangeRequestSerializer(qs, many=True).data,
        })


class AdminRoleRequestDetailView(APIView):
    """Approve or reject a student Buyer<->Seller role change request (Admin only)."""

    permission_classes = [IsPlatformAdmin]

    @transaction.atomic
    def patch(self, request, pk):
        req_obj = generics.get_object_or_404(RoleChangeRequest.objects.select_related("user"), pk=pk)
        next_status = (request.data.get("status") or "").strip().lower()
        if next_status not in ("approved", "rejected"):
            return Response({"error": "Status must be approved or rejected."}, status=status.HTTP_400_BAD_REQUEST)

        admin_note = (request.data.get("admin_note") or request.data.get("adminNote") or "").strip()
        req_obj.status = next_status
        req_obj.admin_note = admin_note or ("Approved" if next_status == "approved" else "Rejected by Admin")
        req_obj.reviewed_by = request.user
        req_obj.reviewed_at = timezone.now()
        req_obj.save()

        if next_status == "approved":
            target_user = req_obj.user
            if not (target_user.is_staff or target_user.is_superuser):
                profile, _ = Profile.objects.get_or_create(user=target_user)
                profile.is_vendor = req_obj.requested_role == "Seller"
                profile.save(update_fields=["is_vendor"])
                if not profile.is_vendor:
                    Product.objects.filter(seller=target_user, status__in=["live", "pending_approval"]).update(
                        status="hidden", is_available=False
                    )

        return Response({"request": RoleChangeRequestSerializer(req_obj).data})


class AdminUniversityListCreateView(generics.ListCreateAPIView):
    """
    Admin directory for viewing all universities (active + inactive) with user/product counts,
    plus creating new institutions.
    """

    serializer_class = AdminUniversitySerializer
    permission_classes = [IsPlatformAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = University.objects.annotate(
            user_count=Count("users", distinct=True),
            product_count=Count("products", distinct=True),
        )
        category = (self.request.query_params.get("category") or "").strip()
        if category and category.lower() != "all":
            qs = qs.filter(category__iexact=category)
        status_param = (self.request.query_params.get("status") or "").strip().lower()
        if status_param == "active":
            qs = qs.filter(is_active=True)
        elif status_param == "inactive":
            qs = qs.filter(is_active=False)
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(short_name__icontains=search))
        return qs.order_by("name")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        all_unis = University.objects.all()
        summary = {
            "total": all_unis.count(),
            "active": all_unis.filter(is_active=True).count(),
            "inactive": all_unis.filter(is_active=False).count(),
            "public": all_unis.filter(category=CATEGORY_PUBLIC).count(),
            "technical": all_unis.filter(category=CATEGORY_TECHNICAL).count(),
            "private": all_unis.filter(category=CATEGORY_PRIVATE).count(),
        }
        return Response({"summary": summary, "results": serializer.data})


class AdminUniversityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Edit, activate/deactivate, or safely delete an institution (Admin only).
    Permanent deletion is strictly blocked if any user profiles or products reference the institution.
    """

    serializer_class = AdminUniversitySerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        return University.objects.annotate(
            user_count=Count("users", distinct=True),
            product_count=Count("products", distinct=True),
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        has_users = Profile.objects.filter(university=instance).exists()
        has_products = Product.objects.filter(university=instance).exists()
        if has_users or has_products:
            return Response(
                {
                    "error": (
                        "Cannot permanently delete an institution that still has registered users or listings. "
                        "Deactivate it instead to preserve historical user relationships."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return Response({"message": "Institution deleted successfully."})


class AdminSecurityAdminsView(APIView):
    """
    View authorized database administrator accounts (Admin only).
    Creating or revoking staff privileges strictly requires `is_superuser=True`.
    """

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        admins = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).order_by("-is_superuser", "email")
        return Response({
            "can_manage_admins": bool(request.user.is_superuser),
            "results": [
                {
                    "id": a.id,
                    "email": a.email,
                    "name": a.full_name or a.email.split("@")[0],
                    "is_staff": a.is_staff,
                    "is_superuser": a.is_superuser,
                    "is_active": a.is_active,
                    "role": "Super Admin" if a.is_superuser else "Admin",
                    "last_login": a.last_login.isoformat() if a.last_login else None,
                    "date_joined": a.date_joined.isoformat() if a.date_joined else None,
                }
                for a in admins
            ],
        })

    @transaction.atomic
    def post(self, request):
        if not request.user.is_superuser:
            return Response(
                {"error": "Only a Super Administrator can provision or promote administrator accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        email = (request.data.get("email") or "").strip().lower()
        full_name = (request.data.get("full_name") or request.data.get("name") or "").strip()
        password = request.data.get("password") or ""

        if not email:
            return Response({"error": "Email address is required."}, status=status.HTTP_400_BAD_REQUEST)

        existing = User.objects.filter(email__iexact=email).first()
        if existing:
            existing.is_staff = True
            existing.is_active = True
            if full_name and not existing.full_name:
                existing.full_name = full_name
            if password:
                try:
                    validate_password(password, user=existing)
                except DjangoValidationError as exc:
                    return Response({"error": " ".join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
                existing.set_password(password)
            existing.save()
            Profile.objects.get_or_create(user=existing)
            target = existing
        else:
            if not password:
                return Response(
                    {"error": "A strong password is required when creating a new administrator account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                validate_password(password)
            except DjangoValidationError as exc:
                return Response({"error": " ".join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
            try:
                target = User.objects.create_user(email=email, password=password)
            except IntegrityError:
                return Response({"error": "Email already registered."}, status=status.HTTP_400_BAD_REQUEST)
            target.full_name = full_name
            target.is_staff = True
            target.is_email_verified = True
            target.save(update_fields=["full_name", "is_staff", "is_email_verified"])
            Profile.objects.get_or_create(user=target)

        return Response(
            {
                "admin": {
                    "id": target.id,
                    "email": target.email,
                    "name": target.full_name or target.email.split("@")[0],
                    "is_staff": target.is_staff,
                    "is_superuser": target.is_superuser,
                    "role": "Super Admin" if target.is_superuser else "Admin",
                }
            },
            status=status.HTTP_201_CREATED,
        )


class AdminSecurityAdminDetailView(APIView):
    """Revoke staff administrator access without deleting user data (Superuser only)."""

    permission_classes = [IsPlatformAdmin]

    def delete(self, request, pk):
        if not request.user.is_superuser:
            return Response(
                {"error": "Only a Super Administrator can revoke administrator access."},
                status=status.HTTP_403_FORBIDDEN,
            )
        target = generics.get_object_or_404(User, pk=pk)
        if target.pk == request.user.pk:
            return Response({"error": "You cannot remove your own administrator access."}, status=status.HTTP_400_BAD_REQUEST)
        if target.is_superuser:
            return Response(
                {"error": "Protected Super Administrator accounts cannot be revoked here."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target.is_staff = False
        target.save(update_fields=["is_staff"])
        return Response({"message": f"Administrator access removed for {target.email}."})

