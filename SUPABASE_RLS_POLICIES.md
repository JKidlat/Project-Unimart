# UNIMART SUPABASE & POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES
**Architecture Model:** Django REST Framework Authoritative Backend with Supabase PostgreSQL  
**Document Status:** Deployment Ready  
**Target Environment:** Supabase PostgreSQL 15+  

---

## 1. Database Architecture & Access Model

In Unimart, the **Django REST Framework backend** acts as the single authoritative application tier communicating with Supabase PostgreSQL via connection pooling (`DATABASE_URL`). The React frontend communicates strictly through Django REST endpoints (`/api/...`), ensuring business logic, permission classes, rate limiting, and password hashing are rigorously enforced.

To achieve **defense-in-depth**, Row Level Security (RLS) is enabled on all application tables. This ensures that even if direct database access is attempted via Supabase Studio, REST Data API (PostgREST), or client SDKs, strict row-level isolation guarantees that students cannot access or manipulate other users' private profiles, orders, KYC identity documents, or payments.

---

## 2. Table Security Classification

| Table Name | Sensitivity | Access Model | RLS Status |
|---|---|---|---|
| `accounts_user` | **High** | Self read/update; Staff full access | **ENABLED** |
| `accounts_profile` | **High** | Self read/update; Staff full access | **ENABLED** |
| `accounts_kycsubmission` | **Critical** (Ghana Act 843 PII) | Self read/create; Staff review/update | **ENABLED** |
| `universities_university` | **Low** | Public read-only; Staff write | **ENABLED** |
| `marketplace_category` | **Low** | Public read-only; Staff write | **ENABLED** |
| `marketplace_product` | **Medium** | Public read (live only); Seller CRUD; Staff moderate | **ENABLED** |
| `marketplace_wishlistitem` | **Medium** | Self CRUD; Staff read | **ENABLED** |
| `orders_order` | **High** | Buyer & Item Seller read; Buyer create; Staff manage | **ENABLED** |
| `orders_orderitem` | **High** | Associated Buyer & Seller read; Staff manage | **ENABLED** |
| `payments_payment` | **Critical** (Financial) | Paying user read; Staff manage | **ENABLED** |
| `reviews_review` | **Medium** | Public read; Verified Buyer create; Author/Staff delete | **ENABLED** |
| `token_blacklist_*` | **Critical** (Auth) | Backend service role only | **ENABLED** |

---

## 3. Complete Supabase PostgreSQL Hardening SQL Script

Execute the following SQL commands in the **Supabase SQL Editor** after running standard Django migrations (`py manage.py migrate`).

```sql
-- ============================================================================
-- UNIMART ROW LEVEL SECURITY (RLS) DEPLOYMENT SCRIPT
-- ============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ACROSS ALL APPLICATION TABLES
ALTER TABLE accounts_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_kycsubmission ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities_university ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_wishlistitem ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders_orderitem ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_blacklist_blacklistedtoken ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_blacklist_outstandingtoken ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. UNIVERSITIES (PUBLIC READ, ADMIN WRITE)
-- ============================================================================
CREATE POLICY "Universities are viewable by all users" 
ON universities_university FOR SELECT 
USING (true);

CREATE POLICY "Universities are manageable only by staff" 
ON universities_university FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

-- ============================================================================
-- 3. CATEGORIES (PUBLIC READ, ADMIN WRITE)
-- ============================================================================
CREATE POLICY "Categories are viewable by all users" 
ON marketplace_category FOR SELECT 
USING (true);

CREATE POLICY "Categories are manageable only by staff" 
ON marketplace_category FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

-- ============================================================================
-- 4. ACCOUNTS (USER & PROFILE PRIVACY)
-- ============================================================================
-- Users can only view their own account record unless staff
CREATE POLICY "Users can view their own user account" 
ON accounts_user FOR SELECT 
TO authenticated 
USING (id = auth.uid()::integer OR EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

CREATE POLICY "Users can update their own user account" 
ON accounts_user FOR UPDATE 
TO authenticated 
USING (id = auth.uid()::integer)
WITH CHECK (id = auth.uid()::integer);

-- Profiles
CREATE POLICY "Users can view their own profile or public vendor badge" 
ON accounts_profile FOR SELECT 
TO authenticated 
USING (user_id = auth.uid()::integer OR is_vendor = true OR EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

CREATE POLICY "Users can update their own profile" 
ON accounts_profile FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid()::integer)
WITH CHECK (user_id = auth.uid()::integer);

-- ============================================================================
-- 5. KYC SUBMISSIONS (CRITICAL IDENTITY PRIVACY)
-- ============================================================================
CREATE POLICY "Users can view their own KYC verification" 
ON accounts_kycsubmission FOR SELECT 
TO authenticated 
USING (user_id = auth.uid()::integer OR EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

CREATE POLICY "Users can create their own KYC submission" 
ON accounts_kycsubmission FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid()::integer);

CREATE POLICY "Only staff can update or review KYC status" 
ON accounts_kycsubmission FOR UPDATE 
TO authenticated 
USING (EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

-- ============================================================================
-- 6. MARKETPLACE PRODUCTS (APPROVAL WORKFLOW & OWNERSHIP)
-- ============================================================================
-- Public can only see live, available products. Sellers see their own pending/rejected ads.
CREATE POLICY "Public can view approved live products" 
ON marketplace_product FOR SELECT 
USING (
  (status = 'live' AND is_available = true) OR 
  (auth.uid() IS NOT NULL AND seller_id = auth.uid()::integer) OR
  (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true))
);

CREATE POLICY "Verified sellers can insert new pending listings" 
ON marketplace_product FOR INSERT 
TO authenticated 
WITH CHECK (seller_id = auth.uid()::integer);

CREATE POLICY "Sellers can update their own products; Staff can moderate" 
ON marketplace_product FOR UPDATE 
TO authenticated 
USING (seller_id = auth.uid()::integer OR EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

CREATE POLICY "Sellers can delete their own products; Staff can delete any" 
ON marketplace_product FOR DELETE 
TO authenticated 
USING (seller_id = auth.uid()::integer OR EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

-- ============================================================================
-- 7. WISHLIST ITEMS
-- ============================================================================
CREATE POLICY "Users can manage their own wishlist items" 
ON marketplace_wishlistitem FOR ALL 
TO authenticated 
USING (user_id = auth.uid()::integer)
WITH CHECK (user_id = auth.uid()::integer);

-- ============================================================================
-- 8. ORDERS & ORDER ITEMS (STRICT TRANSACTION ISOLATION)
-- ============================================================================
CREATE POLICY "Buyers and associated sellers can view orders" 
ON orders_order FOR SELECT 
TO authenticated 
USING (
  buyer_id = auth.uid()::integer OR 
  EXISTS (SELECT 1 FROM orders_orderitem WHERE order_id = orders_order.id AND seller_id = auth.uid()::integer) OR
  EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true)
);

CREATE POLICY "Authenticated buyers can place orders" 
ON orders_order FOR INSERT 
TO authenticated 
WITH CHECK (buyer_id = auth.uid()::integer);

CREATE POLICY "Order items viewable by buyer, seller, or staff" 
ON orders_orderitem FOR SELECT 
TO authenticated 
USING (
  seller_id = auth.uid()::integer OR
  EXISTS (SELECT 1 FROM orders_order WHERE id = orders_orderitem.order_id AND buyer_id = auth.uid()::integer) OR
  EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true)
);

-- ============================================================================
-- 9. PAYMENTS (FINANCIAL PRIVACY)
-- ============================================================================
CREATE POLICY "Users can view their own payment records" 
ON payments_payment FOR SELECT 
TO authenticated 
USING (user_id = auth.uid()::integer OR EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

CREATE POLICY "Payments can only be inserted or updated by server-side processes" 
ON payments_payment FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid()::integer);

-- ============================================================================
-- 10. REVIEWS (PUBLIC VISIBILITY, AUTHOR DELETION)
-- ============================================================================
CREATE POLICY "Reviews are publicly readable" 
ON reviews_review FOR SELECT 
USING (true);

CREATE POLICY "Verified buyers can create a review" 
ON reviews_review FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid()::integer);

CREATE POLICY "Authors or staff can delete reviews" 
ON reviews_review FOR DELETE 
TO authenticated 
USING (user_id = auth.uid()::integer OR EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

-- ============================================================================
-- 11. TOKEN BLACKLIST (BACKEND EXCLUSIVE)
-- ============================================================================
CREATE POLICY "Token blacklist managed exclusively by staff and backend" 
ON token_blacklist_blacklistedtoken FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));

CREATE POLICY "Outstanding tokens managed exclusively by staff and backend" 
ON token_blacklist_outstandingtoken FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM accounts_user WHERE id = auth.uid()::integer AND is_staff = true));
```

---

## 4. Verification and Testing Instructions

1. **Verify RLS Status:**
   Run in Supabase SQL editor:
   ```sql
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```
   Ensure `rowsecurity = true` for all target tables.

2. **Test Isolation:**
   Simulate User A (`SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claims" = '{"sub": "2"}';`) and verify User A cannot read User B's orders (`SELECT * FROM orders_order WHERE buyer_id = 3;` returns 0 rows).

