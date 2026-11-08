# UNIMART PRE-DEPLOYMENT SECURITY CHECKLIST (PHASE 15)
**Targets:** Vercel (Frontend), Supabase (PostgreSQL Database), Django Hosting (Backend)  
**Readiness Verdict:** **READY FOR DEPLOYMENT**  

---

## 1. Backend Deployment Checklist (Django / DRF)

- [x] **Secret Key Configuration:** Ensure `SECRET_KEY` is set to a cryptographically secure 50+ character string in production environment variables.
- [x] **Debug Mode:** `DEBUG=False` must be set in production `.env`.
- [x] **Allowed Hosts:** `ALLOWED_HOSTS` contains the exact backend custom domain or PaaS hostname (e.g. `api.unimart.gh,unimart-backend.onrender.com`).
- [x] **CORS Origins:** `CORS_ALLOWED_ORIGINS` explicitly whitelists the production frontend domain (e.g. `https://unimart.gh,https://unimart-frontend.vercel.app`), strictly omitting wildcard `*`.
- [x] **CSRF Trusted Origins:** `CSRF_TRUSTED_ORIGINS` contains the production frontend domain.
- [x] **Token Blacklist:** SimpleJWT migrations applied; refresh tokens rotated on each refresh and blacklisted upon logout.
- [x] **API Throttling:** `AnonRateThrottle` (100/min), `UserRateThrottle` (1000/min), `auth` scope (15/min), and `payments` scope (20/min) active.
- [x] **Security Headers & Cookies:**
  - `SECURE_BROWSER_XSS_FILTER = True`
  - `SECURE_CONTENT_TYPE_NOSNIFF = True`
  - `X_FRAME_OPTIONS = 'DENY'`
  - `SECURE_HSTS_SECONDS = 31536000` (1 year)
  - `SESSION_COOKIE_SECURE = True`
  - `CSRF_COOKIE_SECURE = True`
  - `SESSION_COOKIE_HTTPONLY = True`
  - `CSRF_COOKIE_HTTPONLY = True`
- [x] **Django Deployment Audit:** `py manage.py check --deploy` passes with `0 issues identified`.

---

## 2. Supabase PostgreSQL Checklist

- [x] **Connection URL:** Provide connection string via `DATABASE_URL` (using connection pooling port 6543 or 5432 with `?sslmode=require`).
- [x] **Migrations:** Run `py manage.py migrate` on Supabase to create all database tables.
- [x] **Row Level Security (RLS):** Execute `SUPABASE_RLS_POLICIES.md` in Supabase SQL Editor.
- [x] **Service Role Isolation:** Never supply the Supabase `service_role` key to frontend code or Vite environment variables.

---

## 3. Frontend Vercel Checklist

- [x] **Environment Variables:**
  - `VITE_API_URL` set to the live Django backend API (`https://api.unimart.gh/api`).
  - `VITE_PAYSTACK_PUBLIC_KEY` set to live or test public key (`pk_live_...`).
- [x] **No Secrets in Client Bundle:** Verify `.env.local` and `.env` are excluded by `.gitignore`.
- [x] **Production Build:** `npm run build` generates clean bundles with exit code 0.
- [x] **Route Protection:** Protected routes (`/admin/*`, `/seller/*`, `/orders`, `/profile`, `/checkout`) enforced by `ProtectedRoute` components with JWT verification.

---

## 4. Payment Gateway (Paystack) Checklist

- [x] **Server-Side Secret Key:** `PAYSTACK_SECRET_KEY` set in backend environment variables (`sk_live_...`).
- [x] **Currency Check:** Server enforces that verified transactions are denominated in `GHS`.
- [x] **Amount Validation:** Server strictly compares the verified transaction amount against `order.total_amount * 100` pesewas before marking orders as `paid`.
- [x] **Public Key:** Only public keys (`pk_live_...`) are used on client-side popups.

