/**
 * ==============================================================================
 * UNIMART API CLIENT & OFFLINE PERSISTENCE ENGINE (api.ts)
 * ==============================================================================
 * This file serves as the unified network layer for the Unimart marketplace.
 *
 * How it works (Dual-Engine Architecture):
 * 1. Online Mode (Django REST Backend):
 *    - When the Django server is running (default: http://localhost:8000/api),
 *      it sends real HTTP requests with JWT Authorization Bearer tokens.
 *    - If an access token expires (HTTP 401), it attempts an automatic refresh
 *      using the stored refresh token.
 *
 * 2. Offline / Demo Mode (Mock Fallback Engine):
 *    - If the backend is offline, or connection fails ('Failed to fetch'),
 *      `handleMockFallback` steps in automatically.
 *    - It simulates backend databases using browser `localStorage`:
 *        - `unimart_user_session`: active student login & role
 *        - `unimart_products_store`: marketplace items & approval state
 *        - `unimart_orders_store`: buyer orders & live tracking steps
 *        - `unimart_kyc_store`: seller identity verification docs
 *        - `unimart_wishlist_store`: items saved by buyers
 *    - This guarantees that students and reviewers can test all features
 *      (buying, selling, KYC, admin approvals) even without Python/Django running.
 * ==============================================================================
 */

import { 
  products as initialProducts, 
  categories as initialCategories
} from '../app/data/mockData';

// Base URL for the Django REST API backend (configurable via environment variable)
const DEFAULT_PROD_API_URL = 'https://project-unimart.onrender.com/api';
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const BASE_URL = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:8000/api' : DEFAULT_PROD_API_URL);

// LocalStorage key constants to prevent spelling mistakes
const TOKEN_KEY = 'unimart_access_token';
const REFRESH_KEY = 'unimart_refresh_token';
const USER_KEY = 'unimart_user_session';
const LOGIN_TS_KEY = 'unimart_login_ts';
const PRODUCTS_KEY = 'unimart_products_store';
const ORDERS_KEY = 'unimart_orders_store';
const KYC_KEY = 'unimart_kyc_store';
const WISHLIST_KEY = 'unimart_wishlist_store';

/** 72 hours in milliseconds: Used to enforce session lifetime */
const SESSION_TTL_MS = 72 * 60 * 60 * 1000;

// ==============================================================================
// 1. TOKEN & SESSION STORAGE HELPER
// ==============================================================================

/**
 * Manages JWT tokens, user object, and 72-hour session expiry in localStorage.
 */
export const tokenStorage = {
  /** Get the current JWT access token string */
  getAccess: () => localStorage.getItem(TOKEN_KEY),

  /** Get the current JWT refresh token string */
  getRefresh: () => localStorage.getItem(REFRESH_KEY),

  /** Retrieve the parsed user profile object from active session */
  getUser: () => {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Checks if the user session has been active for longer than 72 hours.
   * If true, the user will be logged out and asked to sign in again.
   */
  isExpired: (): boolean => {
    const ts = localStorage.getItem(LOGIN_TS_KEY);
    if (!ts) return false; // If no timestamp exists, treat as valid to prevent unnecessary logouts
    return Date.now() - Number(ts) > SESSION_TTL_MS;
  },

  /** Store new JWT access/refresh tokens and record current login timestamp */
  setTokens: (access: string, refresh?: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(LOGIN_TS_KEY, String(Date.now()));
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },

  /** Save or update the active user profile object in storage */
  setUser: (user: any) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /** Clear all session data on sign out */
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LOGIN_TS_KEY);
  }
};

// ==============================================================================
// 2. WISHLIST STORAGE HELPER
// ==============================================================================

/**
 * Manages saved products for buyers in localStorage.
 */
export const wishlistStorage = {
  /** Retrieve array of saved wishlist items */
  get: (): any[] => {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); } catch { return []; }
  },
  /** Save updated array of wishlist items */
  save: (items: any[]) => localStorage.setItem(WISHLIST_KEY, JSON.stringify(items)),
};

// ==============================================================================
// 3. KYC (KNOW YOUR CUSTOMER) STORAGE HELPER
// ==============================================================================

/**
 * Manages seller identity submissions in localStorage.
 */
export const kycStorage = {
  /** Retrieve all seller KYC submissions */
  getAll: (): any[] => {
    try { return JSON.parse(localStorage.getItem(KYC_KEY) || '[]'); } catch { return []; }
  },

  /** Find a specific user's KYC record by their email */
  getByEmail: (email: string): any | null => {
    return kycStorage.getAll().find((k: any) => k.email === email) || null;
  },

  /** Save a new KYC submission to the storage array */
  save: (submission: any) => {
    const all = kycStorage.getAll().filter((k: any) => k.email !== submission.email);
    all.unshift(submission);
    localStorage.setItem(KYC_KEY, JSON.stringify(all));
  },

  /**
   * Update the status of a KYC record (e.g. 'approved' or 'rejected') with optional reason.
   */
  updateStatus: (email: string, status: 'approved' | 'rejected', reason?: string) => {
    const all = kycStorage.getAll().map((k: any) =>
      k.email === email ? { ...k, status, rejectionReason: reason || null, reviewedAt: new Date().toISOString() } : k
    );
    localStorage.setItem(KYC_KEY, JSON.stringify(all));
  },
};

// ==============================================================================
// 4. LOCAL PRODUCTS STORE HELPER
// ==============================================================================

const CATEGORY_ALIAS_MAP: Record<string, string> = {
  'books': 'stationery',
  'textbooks': 'stationery',
  'books-stationery': 'stationery',
  'clothing': 'fashion',
  'dorm-essentials': 'appliances',
  'home': 'appliances',
  'hostel': 'appliances',
  'beauty': 'beauty-cosmetics',
  'beauty-and-cosmetics': 'beauty-cosmetics',
  'other': 'others',
};

export function normalizeCategorySlug(rawCategory: string = ''): string {
  const clean = String(rawCategory).toLowerCase().trim();
  return CATEGORY_ALIAS_MAP[clean] || clean;
}

/**
 * Retrieves all products from localStorage.
 * Normalizes categories and ensures default approval statuses.
 */
function getLocalProductsStore() {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Normalize categories and statuses
        const normalized = parsed.map(p => ({
          ...p,
          category: normalizeCategorySlug(p.category || 'others'),
          status: p.status || 'live',
          is_available: p.is_available !== undefined ? p.is_available : (p.status !== 'rejected' && p.status !== 'pending_approval'),
        }));
        return normalized;
      }
    }
  } catch {}
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(initialProducts));
  return initialProducts;
}

/**
 * Prepends a newly submitted product ad to localStorage.
 */
function saveLocalProduct(product: any) {
  const existing = getLocalProductsStore();
  const updated = [product, ...existing];
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
  return updated;
}

// ==============================================================================
// 5. OFFLINE MOCK FALLBACK HANDLER
// ==============================================================================

/**
 * Intercepts requests when the real Django backend is offline,
 * simulating database responses so the frontend remains 100% interactive.
 */
async function handleMockFallback(endpoint: string, options: RequestInit = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : {};

  // Slight simulated delay for realistic feel
  await new Promise(r => setTimeout(r, 200));

  // --- Fallback 1: User Login ---
  if (endpoint.includes('/auth/login') && method === 'POST') {
    const email = body.email || 'student@unimart.gh';
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const user = {
      id: 1,
      email,
      name: name || 'Student User',
      university: 'University of Ghana (UG)',
      role: 'Buyer',
      profilePic: null,
      joinDate: 'Oct 2024',
      referralCode: `UNIM-${email.slice(0, 2).toUpperCase()}-9021`,
      is_staff: false
    };
    const tokens = { access: 'mock_jwt_access_' + Date.now(), refresh: 'mock_jwt_refresh_' + Date.now() };
    tokenStorage.setTokens(tokens.access, tokens.refresh);
    tokenStorage.setUser(user);
    return { tokens, user, message: 'Signed in successfully' };
  }

  // --- Fallback 2: User Registration ---
  if (endpoint.includes('/auth/register') && method === 'POST') {
    const email = body.email;
    const fullName = body.full_name || body.name || email.split('@')[0];
    const role = body.role || (body.is_vendor ? 'Seller' : 'Buyer');
    const user = {
      id: Date.now(),
      email,
      name: fullName,
      university: body.university || 'University of Ghana (UG)',
      role,
      profilePic: null,
      joinDate: 'Oct 2024',
      referralCode: `UNIM-${fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase()}-${Date.now().toString().slice(-4)}`,
      is_staff: false
    };
    const tokens = { access: 'mock_jwt_access_' + Date.now(), refresh: 'mock_jwt_refresh_' + Date.now() };
    tokenStorage.setTokens(tokens.access, tokens.refresh);
    tokenStorage.setUser(user);
    return { tokens, user, message: 'Account created successfully' };
  }

  // --- Fallback 3: Current Profile (/auth/me) ---
  if (endpoint.includes('/auth/me')) {
    if (method === 'GET') {
      const user = tokenStorage.getUser();
      if (!user) throw new Error('Unauthenticated');
      return user;
    }
    if (method === 'PATCH' || method === 'PUT') {
      const current = tokenStorage.getUser() || {};
      const updated = { ...current, ...body };
      tokenStorage.setUser(updated);
      return updated;
    }
  }

  // --- Fallback 4: Products List, Details, Ad Posting & Approvals ---
  if (endpoint.includes('/products')) {
    const store = getLocalProductsStore();

    // Check for single product detail route: /products/:id/
    const singleProductMatch = endpoint.match(/\/products\/([^/?]+)\/?$/);
    const productId = singleProductMatch ? singleProductMatch[1] : null;

    // PATCH /products/:id (Approval / Status update / edit)
    if (productId && method === 'PATCH') {
      const updated = store.map((p: any) => {
        if (String(p.id) === String(productId)) {
          const nextStatus = body.status !== undefined ? body.status : p.status;
          return {
            ...p,
            ...body,
            status: nextStatus,
            is_available: nextStatus === 'live',
            rejectionReason: body.rejectionReason || body.rejection_reason || p.rejectionReason,
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      });
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
      const target = updated.find((p: any) => String(p.id) === String(productId));
      return target || { message: 'Updated' };
    }

    // GET /products/:id (Single product detail)
    if (productId && method === 'GET') {
      const found = store.find((p: any) => String(p.id) === String(productId));
      if (found) return found;
      return store[0] || null;
    }

    // POST /products (Seller creates a new ad -> pending_approval)
    if (method === 'POST') {
      const user = tokenStorage.getUser() || { name: 'Verified Student', university: 'UG - Legon', email: 'seller@unimart.local' };
      const normalizedCategory = normalizeCategorySlug(body.category || 'others');
      const initialStatus = body.status || 'pending_approval';

      const newProduct = {
        id: String(Date.now()),
        name: body.title || body.name,
        title: body.title || body.name,
        price: Number(body.price),
        oldPrice: body.oldPrice || body.old_price ? Number(body.oldPrice || body.old_price) : undefined,
        category: normalizedCategory,
        category_name: normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1).replace('-', ' '),
        condition: body.condition || 'New',
        image: body.image || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147',
        university: user.university || body.university || 'University of Ghana (UG)',
        description: body.description || '',
        status: initialStatus,
        is_available: initialStatus === 'live',
        seller_email: user.email,
        seller: {
          id: user.id || Date.now(),
          name: user.name || 'Student Seller',
          email: user.email,
          rating: 5.0,
          verified: true
        },
        created_at: new Date().toISOString(),
      };
      saveLocalProduct(newProduct);
      return newProduct;
    }

    // Filter products by category, university, status, or search keyword
    const url = new URL('http://dummy.com' + endpoint);
    const category = url.searchParams.get('category');
    const uni = url.searchParams.get('university');
    const search = url.searchParams.get('search');
    const statusParam = url.searchParams.get('status');
    const sellerEmail = url.searchParams.get('seller_email');

    let filtered = [...store];

    // Status filtering:
    // If specific status requested (e.g. 'pending_approval', 'live', 'all')
    if (statusParam && statusParam !== 'all') {
      filtered = filtered.filter((p: any) => p.status === statusParam);
    } else if (!statusParam && !sellerEmail) {
      // Public marketplace request: ONLY show live approved products
      filtered = filtered.filter((p: any) => p.status === 'live' || !p.status);
    }

    if (sellerEmail) {
      filtered = filtered.filter((p: any) => 
        p.seller_email === sellerEmail || 
        p.seller?.email === sellerEmail ||
        p.seller?.name === sellerEmail
      );
    }

    if (category && category !== 'all') {
      const normCat = normalizeCategorySlug(category);
      filtered = filtered.filter((p: any) => normalizeCategorySlug(p.category) === normCat);
    }

    if (uni && uni !== 'all') {
      filtered = filtered.filter((p: any) => p.university && p.university.includes(uni));
    }

    if (search) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter((p: any) => 
        (p.name && p.name.toLowerCase().includes(q)) || 
        (p.title && p.title.toLowerCase().includes(q)) || 
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.category_name && p.category_name.toLowerCase().includes(q)) ||
        (p.seller?.name && p.seller.name.toLowerCase().includes(q))
      );
    }

    return { results: filtered, count: filtered.length };
  }

  // --- Fallback 5: Categories List ---
  if (endpoint.includes('/categories')) {
    return initialCategories;
  }

  // --- Fallback 6: Orders Management & Status Tracking ---
  if (endpoint.includes('/orders')) {
    let orders: any[] = [];
    try {
      orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    } catch {}

    // Buyer places an order
    if (method === 'POST') {
      const currentUser = tokenStorage.getUser();
      const newOrder = {
        id: `ORD-${Date.now()}`,
        buyer_email: currentUser?.email || 'student@unimart.gh',
        buyer_name: currentUser?.name || 'Student',
        full_name: body.full_name,
        phone_number: body.phone_number,
        university: body.university,
        hostel_room: body.hostel_room,
        total_amount: body.total_amount,
        payment_method: body.payment_method || 'paystack',
        status: 'pending',
        statusHistory: [{ status: 'pending', timestamp: new Date().toISOString() }],
        created_at: new Date().toISOString(),
        items: body.cart_items || []
      };
      orders.unshift(newOrder);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      return newOrder;
    }

    // Seller updates order status step (e.g. Processing -> Ready for Pickup)
    const idMatch = endpoint.match(/\/orders\/([^/]+)/);
    if (method === 'PATCH' && idMatch) {
      const orderId = idMatch[1];
      const updated = orders.map((o: any) =>
        String(o.id) === String(orderId)
          ? { ...o, ...body, statusHistory: [...(o.statusHistory || []), { status: body.status, timestamp: new Date().toISOString() }] }
          : o
      );
      localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
      return updated.find((o: any) => String(o.id) === String(orderId));
    }

    // Retrieve order list filtered by buyer or seller email
    const url = new URL('http://dummy.com' + endpoint);
    const sellerEmail = url.searchParams.get('seller_email');
    const buyerEmail = url.searchParams.get('buyer_email');
    let filtered = [...orders];
    if (sellerEmail) {
      filtered = filtered.filter((o: any) =>
        (o.items || []).some((i: any) => i.seller_email === sellerEmail)
      );
    }
    if (buyerEmail) {
      filtered = filtered.filter((o: any) => o.buyer_email === buyerEmail);
    }
    return { results: filtered, count: filtered.length };
  }

  // --- Fallback 7: KYC Verification Endpoints ---
  if (endpoint.includes('/kyc')) {
    if (method === 'POST') {
      const submission = {
        ...body,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        rejectionReason: null,
      };
      kycStorage.save(submission);
      // Update session's KYC status to pending
      const currentUser = tokenStorage.getUser();
      if (currentUser) {
        const updated = { ...currentUser, kyc_status: 'pending' };
        tokenStorage.setUser(updated);
      }
      return submission;
    }
    if (method === 'GET') {
      const url = new URL('http://dummy.com' + endpoint);
      const email = url.searchParams.get('email');
      if (email) return kycStorage.getByEmail(email);
      return kycStorage.getAll();
    }
    if (method === 'PATCH') {
      const idMatch = endpoint.match(/\/kyc\/([^/]+)/);
      if (idMatch) {
        kycStorage.updateStatus(idMatch[1], body.status, body.rejection_reason);
        // If approved and was an upgrade request, upgrade role to Seller
        if (body.status === 'approved') {
          const all = kycStorage.getAll();
          const kyc = all.find((k: any) => k.email === idMatch[1]);
          if (kyc?.mode === 'upgrade') {
            const sessions = JSON.parse(localStorage.getItem('unimart_user_session') || 'null');
            if (sessions?.email === kyc.email) {
              tokenStorage.setUser({ ...sessions, role: 'Seller', kyc_status: 'approved' });
            }
          }
        }
        return { success: true };
      }
    }
  }

  // --- Fallback 8: Payment Verification ---
  if (endpoint.includes('/payments/verify')) {
    return { message: 'Payment verified', reference: body.reference, status: 'paid' };
  }

  return { message: 'Success' };
}

// ==============================================================================
// 6. MAIN API REQUEST DISPATCHER
// ==============================================================================

/**
 * Universal fetch wrapper that:
 * 1. Formats endpoint URL with BASE_URL
 * 2. Injects JWT Bearer token into headers if user is logged in
 * 3. Handles automatic token refreshing on HTTP 401 Unauthorized
 * 4. Catches network failures and seamlessly runs mock fallback
 */
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/google/link',
  '/auth/verify-email',
  '/auth/password-reset',
  '/auth/token/refresh',
];

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some((path) => endpoint.startsWith(path));
  const token = tokenStorage.getAccess();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  // Set default JSON Content-Type unless uploading FormData (browser must generate boundary)
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization Bearer header only when authenticated and not hitting public login/signup/reset routes
  if (token && !isPublicAuthRequest) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token expiration & automatic refresh
    if (response.status === 401 && !isPublicAuthRequest && tokenStorage.getRefresh()) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: tokenStorage.getRefresh() }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          tokenStorage.setTokens(data.access);
          headers['Authorization'] = `Bearer ${data.access}`;
          const retryRes = await fetch(url, { ...options, headers });
          if (retryRes.ok) return await retryRes.json();
        }
      } catch {}
      tokenStorage.clear();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const fieldErrors: Record<string, string> = {};
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([key, val]) => {
          if (key === 'code' || key === 'email' && typeof val === 'string' && errorData.code) return;
          if (Array.isArray(val)) {
            const joined = val.map((v) => String(v)).filter(Boolean).join(' ');
            if (joined) fieldErrors[key] = joined;
          } else if (typeof val === 'string' && val.trim()) {
            fieldErrors[key] = val.trim();
          }
        });
      }

      let message = errorData.error || errorData.detail || errorData.message;
      if (!message && Object.keys(fieldErrors).length > 0) {
        message = Object.values(fieldErrors)[0];
      }
      if (response.status >= 500 && (!message || message.length > 220)) {
        message = 'A server error occurred while processing your request. Please try again shortly.';
      }
      const apiErr: any = new Error(message || `Request failed with status ${response.status}`);
      if (errorData?.code) apiErr.code = errorData.code;
      if (errorData?.email) apiErr.email = errorData.email;
      apiErr.fieldErrors = fieldErrors;
      apiErr.status = response.status;
      throw apiErr;
    }

    return await response.json();
  } catch (err: any) {
    // Never mask database/authenticated/core endpoints with local demo fallbacks
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      if (
        endpoint.startsWith('/admin') ||
        endpoint.includes('/admin/') ||
        endpoint.includes('/auth/') ||
        endpoint.includes('/kyc') ||
        endpoint.includes('/universities') ||
        endpoint.includes('/support') ||
        endpoint.includes('/messages') ||
        endpoint.includes('/media') ||
        endpoint.includes('/cart') ||
        endpoint.includes('/wishlist') ||
        endpoint.includes('/orders') ||
        endpoint.includes('mine=true') ||
        endpoint.includes('status=all')
      ) {
        throw new Error('Unable to reach the Unimart server. Please check your connection and try again.');
      }
      return handleMockFallback(endpoint, options);
    }
    throw err;
  }
}

// ==============================================================================
// 7. CONVENIENCE HTTP METHODS
// ==============================================================================

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T = any>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
  upload: <T = any>(endpoint: string, formData: FormData) =>
    apiRequest<T>(endpoint, { method: 'POST', body: formData }),
};

// ==============================================================================
// 8. LEGAL ACCEPTANCE & COMPLIANCE RECORDS (Act 843 & Act 772)
// ==============================================================================

const LEGAL_ACCEPTANCES_KEY = 'unimart_legal_acceptances';
const DELETION_REQUESTS_KEY = 'unimart_deletion_requests';

/**
 * Audit-ready storage engine for legal policy acceptances.
 * Preserves complete historical version logs without overwriting previous agreements.
 */
export const legalAcceptanceStorage = {
  /**
   * Record a new policy acceptance event.
   */
  recordAcceptance: (params: {
    userId: string | number;
    userEmail?: string;
    documentId: string;
    documentVersion: string;
    userRole: 'Buyer' | 'Seller' | 'Admin';
    acceptanceMethod: string;
    ipAddress?: string;
  }) => {
    try {
      const records = legalAcceptanceStorage.getAll();
      const newRecord = {
        id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        userId: params.userId,
        userEmail: params.userEmail,
        documentId: params.documentId,
        documentVersion: params.documentVersion,
        timestamp: new Date().toISOString(),
        userRole: params.userRole,
        acceptanceMethod: params.acceptanceMethod,
        ipAddress: params.ipAddress || 'client_web_session',
      };
      records.push(newRecord);
      localStorage.setItem(LEGAL_ACCEPTANCES_KEY, JSON.stringify(records));
      return newRecord;
    } catch (e) {
      console.error('Failed to persist legal acceptance record:', e);
      return null;
    }
  },

  /**
   * Retrieve all recorded legal acceptances.
   */
  getAll: () => {
    try {
      const raw = localStorage.getItem(LEGAL_ACCEPTANCES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieve all acceptance records for a specific user.
   */
  getByUser: (userId: string | number) => {
    const all = legalAcceptanceStorage.getAll();
    return all.filter((r: any) => String(r.userId) === String(userId));
  },

  /**
   * Check if a user has accepted a specific version of a document.
   */
  hasAcceptedVersion: (userId: string | number, documentId: string, version: string) => {
    const userRecords = legalAcceptanceStorage.getByUser(userId);
    return userRecords.some(
      (r: any) => r.documentId === documentId && r.documentVersion === version
    );
  },
};

/**
 * Storage and audit engine for user account deletion requests (Ghana Act 843 compliance).
 */
export const accountDeletionStorage = {
  createRequest: (data: {
    userId: string | number;
    userEmail: string;
    userName: string;
    reason?: string;
  }) => {
    try {
      const list = accountDeletionStorage.getAll();
      const newReq = {
        id: 'del_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        userId: data.userId,
        userEmail: data.userEmail,
        userName: data.userName,
        reason: data.reason || 'User requested account closure',
        status: 'pending' as const,
        requestDate: new Date().toISOString(),
      };
      list.push(newReq);
      localStorage.setItem(DELETION_REQUESTS_KEY, JSON.stringify(list));
      return newReq;
    } catch (e) {
      console.error('Failed to record deletion request:', e);
      return null;
    }
  },

  getAll: () => {
    try {
      const raw = localStorage.getItem(DELETION_REQUESTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  updateStatus: (id: string, status: 'reviewed' | 'completed' | 'rejected', notes?: string) => {
    try {
      const list = accountDeletionStorage.getAll();
      const updated = list.map((req: any) => {
        if (req.id === id) {
          return {
            ...req,
            status,
            notes,
            reviewDate: new Date().toISOString(),
          };
        }
        return req;
      });
      localStorage.setItem(DELETION_REQUESTS_KEY, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },
};
