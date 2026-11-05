/**
 * ==============================================================================
 * CENTRALIZED TYPESCRIPT TYPE DEFINITIONS (types/index.ts)
 * ==============================================================================
 * This file contains data contracts and type shapes used across the Unimart app.
 *
 * Why TypeScript types matter for beginners:
 * - They act as live documentation: hover over any variable in VS Code/editor to
 *   see what properties it has.
 * - They prevent typos: if you type `product.prce` instead of `product.price`,
 *   TypeScript immediately flags the error before runtime.
 * - Centralizing them ensures that changes to data models only need to be updated
 *   in one place rather than in 20 different components.
 * ==============================================================================
 */

// ==============================================================================
// 1. USER & AUTHENTICATION TYPES
// ==============================================================================

/**
 * Three distinct user tiers supported in Unimart:
 * - 'Buyer': Standard student user who purchases items and tracks orders.
 * - 'Seller': Verified student with store dashboard, post-ad tools, and order tracker.
 * - 'Admin': Platform staff managing users, approving ads, and reviewing KYC.
 */
export type UserRole = 'Buyer' | 'Seller' | 'Admin';

/**
 * Profile structure representing a logged-in student user.
 */
export interface User {
  id?: number | string;           // Unique user identifier
  name: string;                   // Student full name
  email: string;                  // Student email (e.g. @st.ug.edu.gh)
  university: string;             // Institution name (e.g. University of Ghana)
  role: UserRole;                 // Active account tier (Buyer, Seller, Admin)
  profilePic: string | null;      // Optional profile picture URL
  joinDate: string;               // Month & year joined (e.g. 'Oct 2024')
  referralCode: string;           // Unique referral code (e.g. 'UNIM-KO-9021')
  is_staff?: boolean;             // True if user has administrative rights
  businessName?: string;          // Optional store name for sellers
  kyc_status?: 'none' | 'pending' | 'approved' | 'rejected'; // Verification status
}

// ==============================================================================
// 2. PRODUCT & CATALOG TYPES
// ==============================================================================

/**
 * Product item listed for sale on the marketplace.
 */
export interface Product {
  id: string | number;            // Unique product ID
  title?: string;                 // Product title
  name: string;                   // Primary display name
  description?: string;           // Detailed text description
  price: number;                  // Current sale price in Ghana Cedis (GH₵)
  oldPrice?: number | null;       // Optional original price before discount
  image: string;                  // Primary image URL
  condition?: 'New' | 'Like New' | 'Good' | 'Fair'; // Item condition grade
  category?: string;              // Category slug (e.g. 'electronics', 'books')
  category_name?: string;         // Human-friendly category label
  university?: string;            // Campus location where product is available
  university_name?: string;       // Campus name
  seller_details?: SellerDetails; // Nested information about the student seller
  average_rating?: number;        // Review rating average (1 to 5)
  rating?: number;                // Rating fallback
  reviews?: number;               // Number of customer reviews
  is_available?: boolean;         // True if item is currently in stock
  product_type?: string;          // Type tag
  badge?: string;                 // Special badge (e.g. 'Trending', 'Hot Deal')
  created_at?: string;            // ISO timestamp when product was posted
  updated_at?: string;            // ISO timestamp when product was last edited
  status?: 'pending_approval' | 'live' | 'rejected'; // Admin approval status
}

/**
 * Basic details about the seller displayed on product cards and detail pages.
 */
export interface SellerDetails {
  id: number | string;            // Seller ID
  name: string;                   // Seller display name
  email: string;                  // Seller contact email
  rating?: number;                // Average rating from buyers
  verified?: boolean;             // True if KYC verification has been completed
}

// ==============================================================================
// 3. CATEGORY TYPES
// ==============================================================================

/**
 * Category structure used in grid cards, filters, and navigation.
 */
export interface Category {
  id: string;                     // Category slug (e.g. 'electronics')
  name: string;                   // Category display name
  icon: string;                   // Lucide icon identifier
  image: string;                  // Representative banner image URL
  color: string;                  // Tailwind background/accent color classes
  product_count?: number;         // Count of active listings in this category
}

// ==============================================================================
// 4. CART & CHECKOUT TYPES
// ==============================================================================

/**
 * Item added to the buyer's shopping cart.
 */
export interface CartItem {
  id: string | number;            // Product ID
  name: string;                   // Product name
  price: number;                  // Unit price in GH₵
  image: string;                  // Thumbnail image
  quantity: number;               // Number of units in cart
  university?: string;            // University campus location
}

// ==============================================================================
// 5. REVIEW & RATING TYPES
// ==============================================================================

/**
 * Review submitted by a verified buyer for a product.
 */
export interface Review {
  id: string | number;            // Review ID
  user: string;                   // Reviewer display name
  university?: string;            // Reviewer's campus
  rating: number;                 // Star rating (1 to 5)
  date: string;                   // Formatted review date
  comment: string;                // Review feedback text
  verified?: boolean;             // True if verified campus purchase
  productId?: string | number;    // Linked product ID
  status?: 'approved' | 'pending' | 'flagged'; // Content moderation status
}

// ==============================================================================
// 6. ORDER & TRACKING TYPES
// ==============================================================================

/**
 * Order record created after checkout.
 */
export interface Order {
  id: string | number;            // Order ID
  orderNumber: string;            // Human-readable code (e.g. 'ORD-1234')
  status: 'pending' | 'processing' | 'ready_for_pickup' | 'completed' | 'cancelled' | 'refunded';
  items: CartItem[];              // Purchased items
  total: number;                  // Total order amount in GH₵
  createdAt: string;              // ISO creation timestamp
  buyer?: string;                 // Buyer name
  seller?: string;                // Seller name
  statusHistory?: { status: string; timestamp: string }[]; // Tracking timeline
}

// ==============================================================================
// 7. IN-APP MESSAGING & CHAT TYPES
// ==============================================================================

/**
 * Individual chat message sent between a buyer and a seller.
 */
export interface Message {
  id: string | number;            // Message ID
  text: string;                   // Message body text
  sender: 'buyer' | 'seller';     // Who sent the message
  timestamp: string;              // Time message was sent (e.g. '2:45 PM')
}

/**
 * Conversation thread displayed in the Messages inbox.
 */
export interface Conversation {
  id: string | number;            // Conversation thread ID
  with: string;                   // Contact name
  avatar?: string;                // Contact avatar image URL
  lastMessage: string;            // Preview of the most recent message
  timestamp: string;              // Time of last message
  unread?: number;                // Count of unread messages
  product?: string;               // Optional name of product being discussed
}

// ==============================================================================
// 8. USER NOTIFICATION PREFERENCES
// ==============================================================================

/**
 * Notification toggle states in Account Settings.
 */
export interface NotificationSettings {
  chat: boolean;                  // Receive alerts for new chat messages
  orders: boolean;                // Receive status update alerts for orders
  wishlist: boolean;              // Receive alerts for discounts on saved items
  promotions: boolean;            // Receive campus promotions and news
}

// ==============================================================================
// 9. LEGAL & COMPLIANCE RECORDS (Ghana Act 843 & Act 772)
// ==============================================================================

/**
 * Immutable legal policy acceptance record.
 * Stored with timestamp, document version, role, and method to maintain
 * a verifiable audit trail of terms acceptance without overwriting historical records.
 */
export interface LegalAcceptanceRecord {
  id: string;                     // Unique record UUID
  userId: string | number;        // Identifier of accepting user or applicant
  userEmail?: string;             // User email for audit reference
  documentId: string;             // Document identifier (e.g. 'terms', 'privacy', 'seller-agreement')
  documentVersion: string;        // Specific version agreed to (e.g. '0.1')
  timestamp: string;              // ISO 8601 UTC timestamp of acceptance
  userRole: UserRole;             // Active role at time of acceptance (Buyer/Seller)
  acceptanceMethod: string;       // Form/context where accepted (e.g. 'buyer_registration_form')
  ipAddress?: string;             // Optional client IP for audit where available
}

/**
 * Account deletion request structure complying with user privacy rights.
 */
export interface AccountDeletionRequest {
  id: string;
  userId: string | number;
  userEmail: string;
  userName: string;
  reason?: string;
  status: 'pending' | 'reviewed' | 'completed' | 'rejected';
  requestDate: string;
  reviewedBy?: string;
  reviewDate?: string;
  notes?: string;
}
