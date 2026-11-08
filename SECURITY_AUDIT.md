# UNIMART COMPREHENSIVE APPLICATION SECURITY AUDIT (PHASE 1)
**Target Platform:** Unimart (Student Marketplace for Ghanaian Universities)  
**Evaluation Standard:** OWASP Top 10 API Security, Django & DRF Security Best Practices, CWE/SANS Top 25  
**Audit Date:** November 2026  
**Auditor:** Senior Application Security Engineer & Backend Security Architect  

---

## 1. Executive Summary

A comprehensive security reconnaissance and vulnerability assessment was conducted across the entire Unimart repository, covering the Django REST Framework backend (`Project-Unimart/backend`), the React/Vite frontend (`Project-Unimart/src`), authentication mechanisms, database configuration, and third-party integrations (Paystack, Supabase, Firebase).

While the application features clean separation of concerns and foundational DRF permissions, several **Critical** and **High** severity vulnerabilities were identified that must be remediated prior to production deployment. These vulnerabilities include hardcoded client-side admin credentials, mass assignment enabling moderation bypass on product listings, insecure direct object references (IDOR) on order statuses, personally identifiable information (PII) exposure in public listings and reviews, lack of token blacklisting on logout, missing rate limiting, and unhardened production Django settings.

---

## 2. Architecture & Reconnaissance Map

| Component | Technology | Security State |
|---|---|---|
| **Backend API** | Django 5.2.7 + DRF 3.16.1 | Python 3.13; DRF viewsets, Generic Views, JWT Auth |
| **Authentication** | `rest_framework_simplejwt` + `FirebaseAuthentication` | Access lifetime: 72 hrs; Refresh: 7 days; Blacklist missing |
| **Database** | SQLite local (`db.sqlite3`), Supabase PostgreSQL planned | `psycopg2-binary` installed; `DATABASE_URL` parsing required |
| **Frontend** | React 18 + Vite 6 + Tailwind CSS | ProtectedRoute components present; client-side admin bypass present |
| **Payment Gateway** | Paystack API (Card, MoMo) | Server-to-server verification endpoint exists; amount verification missing |
| **Hosting Targets** | Vercel (Frontend) + Supabase (DB) + Django Host (API) | Wildcard CORS enabled; Security headers unconfigured |

---

## 3. Vulnerability Classification & Findings Matrix

| Finding ID | Title | Severity | Impacted Component | CWE Reference |
|---|---|---|---|---|
| **SEC-01** | Client-Side Hardcoded Plaintext Admin Credentials & Bypassed Admin Auth | **CRITICAL** | `src/lib/adminAuth.ts`, `AdminLogin.tsx` | CWE-798, CWE-287 |
| **SEC-02** | Mass Assignment / Self-Approval of Seller Ads | **CRITICAL** | `marketplace/serializers.py`, `marketplace/views.py` | CWE-915, CWE-285 |
| **SEC-03** | IDOR & Client-Manipulated Order Status | **HIGH** | `orders/serializers.py`, `orders/views.py` | CWE-639, CWE-862 |
| **SEC-04** | PII Exposure: Student Email Addresses in Public Products & Reviews | **HIGH** | `marketplace/serializers.py`, `reviews/serializers.py` | CWE-200, CWE-359 |
| **SEC-05** | Refresh Token Invalidation Disabled on Logout (Missing Blacklist App) | **HIGH** | `accounts/views.py`, `unimart/settings.py` | CWE-613 |
| **SEC-06** | Insecure Production Settings (Hardcoded Insecure Key, Wildcard CORS) | **HIGH** | `unimart/settings.py` | CWE-1188, CWE-942 |
| **SEC-07** | Lack of API Rate Limiting / Abuse Protection | **MEDIUM** | `unimart/settings.py` | CWE-307, CWE-770 |
| **SEC-08** | Payment Gateway Verification Lacks Amount & Currency Integrity Checks | **MEDIUM** | `payments/views.py` | CWE-840, CWE-345 |
| **SEC-09** | Object Permission Deadlock for Staff Administrators on Seller Products | **MEDIUM** | `core/permissions.py` | CWE-285 |
| **SEC-10** | Unapproved / Rejected Products Accessible via Detail Endpoint | **MEDIUM** | `marketplace/views.py` | CWE-862 |
| **SEC-11** | Database Configuration Lacks Seamless Supabase / PostgreSQL Support | **LOW** | `unimart/settings.py` | CWE-15 |
| **SEC-12** | Weak Password Complexity Controls on Student Registration | **LOW** | `accounts/serializers.py` | CWE-521 |

---

## 4. In-Depth Vulnerability Details

### SEC-01: Client-Side Hardcoded Plaintext Admin Credentials & Bypassed Auth (CRITICAL)
- **Description:** `src/lib/adminAuth.ts` defines hardcoded administrator credentials (`jansah.klintaps@gmail.com` and initial password `unimartadmin1234`). `AdminLogin.tsx` validates against local storage rather than authenticating against the Django backend API.
- **Risk:** Any attacker inspecting client-side bundle or localStorage can spoof an administrative session, and the administrative workflow is decoupled from real server-side JWT authentication.
- **Remediation:** Remove hardcoded credentials. Connect `AdminLogin.tsx` strictly to `/api/auth/login/` which returns authentic signed JWT tokens with verified `is_staff` and `is_superuser` claims from the database.

### SEC-02: Mass Assignment & Self-Approval of Seller Listings (CRITICAL)
- **Description:** In `marketplace/serializers.py`, `status`, `is_available`, and `rejection_reason` are defined as writable fields in `ProductSerializer`. `ProductDetailView` does not override `perform_update`.
- **Risk:** A seller can create a product in `pending_approval` state and immediately issue a `PATCH /api/products/<id>/` payload containing `{"status": "live", "is_available": true}`, completely bypassing the university marketplace moderation and KYC review queue.
- **Remediation:** Make `status`, `is_available`, and `rejection_reason` read-only for standard users in `ProductSerializer`. Only permit staff/admin users to transition `status` or alter `is_available`.

### SEC-03: IDOR & Client-Manipulated Order Status (HIGH)
- **Description:** In `orders/serializers.py`, `status` is not in `read_only_fields` of `OrderSerializer`. When an order is created, a buyer can supply `{"status": "paid"}` or `{"status": "completed"}`. Furthermore, in `orders/views.py`, `OrderDetailView` allows `PATCH` updates using `OrderStatusUpdateSerializer` without checking whether the requesting user is the buyer or seller.
- **Risk:** A buyer can update their own order status to "completed" without making any payment.
- **Remediation:** Enforce that initial order creation always sets `status='pending'`. On `PATCH /api/orders/<id>/`, allow sellers/admins to advance fulfillment (`shipped`, `completed`), allow buyers to `cancel` only while pending, and allow payment verification to set `paid`.

### SEC-04: Student PII Exposure in Public Product Listings and Reviews (HIGH)
- **Description:** `marketplace.serializers.ProductSerializer.get_seller_details()` returns `seller.email`. `reviews.serializers.ReviewListSerializer` and `ReviewSerializer` return `user_email` and `user` (which stringifies to email).
- **Risk:** Scraping products or reviews exposes student personal email addresses, violating Ghana Data Protection Act 2012 (Act 843) and enabling phishing and spam campaigns against university students.
- **Remediation:** Remove raw email addresses from public serializers. Surface only public seller identifiers (e.g., display name, university short name, seller verification badge).

### SEC-05: Refresh Token Revocation Disabled on Logout (HIGH)
- **Description:** `accounts/views.py` invokes `token.blacklist()`, but `'rest_framework_simplejwt.token_blacklist'` is not included in `settings.INSTALLED_APPS`. The resulting `AttributeError` is silently caught.
- **Risk:** Tokens remain valid until expiration even after the user logs out.
- **Remediation:** Add `'rest_framework_simplejwt.token_blacklist'` to `INSTALLED_APPS`, run migrations, and ensure refresh tokens are strictly blacklisted upon logout.

### SEC-06: Insecure Production Settings (HIGH)
- **Description:** In `backend/unimart/settings.py`, `SECRET_KEY` falls back to `'django-insecure-default-key-for-dev'`. `CORS_ALLOW_ALL_ORIGINS = True` is hardcoded. Security middleware headers (X-Frame-Options, X-Content-Type-Options, HSTS, Secure cookies) are not configured.
- **Risk:** In production, session hijacking, cross-origin data exfiltration, clickjacking, and token tampering can occur.
- **Remediation:** Enforce `SECRET_KEY` from environment in production; configure strict `CORS_ALLOWED_ORIGINS`; add security headers and cookie flags.

### SEC-07: Lack of API Rate Limiting / Abuse Protection (MEDIUM)
- **Description:** No throttling is defined in `REST_FRAMEWORK` settings.
- **Risk:** Susceptible to credential stuffing on `/api/auth/login/`, automated account creation on `/api/auth/register/`, and DoS on search endpoints.
- **Remediation:** Configure `AnonRateThrottle`, `UserRateThrottle`, and dedicated scoped throttles for authentication endpoints.

### SEC-08: Payment Gateway Verification Lacks Amount & Currency Validation (MEDIUM)
- **Description:** `payments/views.py` verifies Paystack transactions by reference, but does not verify that the returned transaction `amount` (in pesewas) matches `int(order.total_amount * 100)` or that `currency` is `GHS`.
- **Risk:** A malicious buyer could initiate a transaction of 1 Pesewa, obtain a successful reference, and pass it to `/api/payments/verify/` to mark a 5,000 GHS order as `paid`.
- **Remediation:** Add rigorous checks comparing `data['amount'] == int(order.total_amount * 100)` and `data['currency'] == 'GHS'`.

### SEC-09: Object Permission Deadlock for Staff Admins on Seller Listings (MEDIUM)
- **Description:** `core.permissions.IsOwnerOrReadOnly` checks `obj.seller == request.user`. Platform staff/admins cannot update or delete listings submitted by sellers.
- **Risk:** Admins cannot moderate or take down prohibited products via the REST API.
- **Remediation:** Update `IsOwnerOrReadOnly` to grant permissions if `request.user.is_staff or request.user.is_superuser`.

### SEC-10: Unapproved / Rejected Products Accessible via Detail Endpoint (MEDIUM)
- **Description:** `ProductDetailView` queries `Product.objects.all()`. If an unauthenticated user knows the numeric ID of a pending or rejected product, they can retrieve its full details.
- **Risk:** Pre-release or rejected products are publicly accessible before review.
- **Remediation:** In `ProductDetailView`, restrict retrieval of non-live products to the product's seller or staff users.

---

## 5. Next Steps: Hardening Roadmap
1. **Phase 2:** Secrets isolation, environment variables, `.gitignore` reinforcement, `.env.example`.
2. **Phase 3:** Token blacklisting setup, rate limiting, password validation enforcement.
3. **Phase 4 & 5:** IDOR fixes across Orders, Products, and Profiles; strict RBAC.
4. **Phase 6:** Supabase PostgreSQL compatibility in `settings.py` and comprehensive RLS policy design (`SUPABASE_RLS_POLICIES.md`).
5. **Phase 7 & 8:** Payment amount validation, removal of PII (emails) from public serializers.
6. **Phase 9, 10, 11:** Frontend authentication alignment, route guards, security headers, Vercel readiness.
7. **Phase 14:** Automated security test suite verification.
8. **Phase 15:** Final documentation and readiness verdict.

