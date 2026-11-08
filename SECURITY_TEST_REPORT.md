# UNIMART AUTOMATED SECURITY TEST REPORT (PHASE 14 & 15)
**Test Execution Command:** `py manage.py test core`  
**Execution Environment:** Django 5.2.7, Python 3.13, SQLite / PostgreSQL test runner  
**Status:** ALL 14 TESTS PASSED (0 FAILURES, 0 ERRORS)  

---

## 1. Test Suite Results Overview

| Test Identifier | Category | Target Vulnerability | Status |
|---|---|---|---|
| `test_unauthenticated_requests_blocked` | Authentication | Broken Access Control / Forced Browsing | **PASSED** |
| `test_invalid_bearer_token_rejected` | Authentication | Forged Token Replay / Auth Bypass | **PASSED** |
| `test_refresh_token_revocation_on_logout` | Authentication | Session Hijacking / Stale Refresh Tokens | **PASSED** |
| `test_seller_cannot_modify_another_sellers_product` | Authorization (IDOR) | Product Tampering / IDOR | **PASSED** |
| `test_seller_cannot_delete_another_sellers_product` | Authorization (IDOR) | Unauthorized Resource Deletion | **PASSED** |
| `test_staff_admin_can_moderate_any_product` | RBAC | Administrator Moderation Access | **PASSED** |
| `test_buyer_cannot_view_another_buyers_order` | Authorization (IDOR) | Transaction Data Disclosure (IDOR) | **PASSED** |
| `test_buyer_cannot_mark_own_order_completed` | Authorization | Client-Supplied Fulfillment Status | **PASSED** |
| `test_registration_prevents_admin_privilege_escalation` | RBAC | Mass Assignment / Privilege Escalation | **PASSED** |
| `test_regular_user_cannot_access_admin_user_directory` | RBAC | Admin Endpoint Protection | **PASSED** |
| `test_seller_cannot_self_approve_ad_listing` | Integrity | Marketplace Ad Moderation Bypass | **PASSED** |
| `test_product_listing_does_not_expose_seller_email` | Privacy (PII) | Student Email Scraping / Phishing | **PASSED** |
| `test_review_listing_does_not_expose_reviewer_email` | Privacy (PII) | Student Reviewer PII Leakage | **PASSED** |
| `test_payment_amount_tampering_rejected` | Financial Integrity | Underpayment & Gateway Tampering | **PASSED** |

---

## 2. Test Execution Output

```text
Creating test database for alias 'default'...
..............
----------------------------------------------------------------------
Ran 14 tests in 84.292s

OK
Destroying test database for alias 'default'...
Found 14 test(s).
System check identified no issues (0 silenced).
```

---

## 3. Frontend Production Build Verification

```text
> unimart-frontend@0.1.0 build
> vite build

vite v6.4.5 building for production...
✓ 2694 modules transformed.
dist/index.html                     0.84 kB │ gzip:   0.47 kB
dist/assets/index-DLhEX54M.css     92.38 kB │ gzip:  14.69 kB
dist/assets/index-DCbUpi4-.js   2,019.63 kB │ gzip: 475.19 kB
✓ built in 20.60s
```

---

## 4. Tests Not Performed & Scope Limitations

1. **Third-Party Gateway Live Webhook Simulation:**
   - Real network interactions with live Paystack servers require a registered Paystack test merchant API key in `.env`. The test suite verified server-side validation logic and status handling with mocked/tampered responses.
2. **Third-Party Supabase Cloud Network RLS Live Execution:**
   - Supabase RLS policies are compiled into SQL migration scripts (`SUPABASE_RLS_POLICIES.md`). Execution on live Supabase projects should be completed during cloud deployment following the provided checklist.

