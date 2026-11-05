/**
 * ==============================================================================
 * UNIMART APPLICATION ROOT ROUTER (App.tsx)
 * ==============================================================================
 * This file sets up the primary architecture of the Unimart web application:
 * 1. Global Context Providers:
 *    - UserProvider: Manages user authentication, current session, and roles.
 *    - KYCProvider: Tracks identity verification status (none, pending, approved).
 *    - WishlistProvider: Stores saved products for later.
 *    - CartProvider: Manages items added to cart, quantities, and checkout state.
 * 
 * 2. Routing System (React Router):
 *    - Public Routes: Open to everyone (Home, Shop, Product Details, Signin, Signup).
 *    - Protected Buyer Routes: Require login (Orders, Checkout, Profile, Settings).
 *    - Protected Seller Routes: Require Seller role (Seller Studio, Ad Creator).
 *    - Protected Admin Suite: Require Admin role (Dashboard, KYC, Ad Approvals).
 * 
 * 3. Layout Structure:
 *    - Top Navbar: Present across standard pages, omitted on Admin suite.
 *    - Main Body (<main>): Renders active route component.
 *    - Footer: Standard footer for public pages.
 *    - Mobile Bottom Bar: Fixed bottom navigation for mobile viewports.
 * ==============================================================================
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router';
import { Toaster } from 'sonner';
import { 
  Home as HomeIcon, 
  Search as SearchIcon, 
  ShoppingCart as CartIcon, 
  User as UserIcon 
} from 'lucide-react';

// ============================================================================
// Layout & Navigation Components
// ============================================================================
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// ============================================================================
// Public & Buyer Pages
// ============================================================================
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetails } from './pages/ProductDetails';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { Profile } from './pages/Profile';
import { AccountSettings } from './pages/AccountSettings';
import { Sell } from './pages/Sell';
import { Orders } from './pages/Orders';
import { Wishlist } from './pages/Wishlist';
import { Referrals } from './pages/Referrals';
import { Verification } from './pages/Verification';
import { KYC } from './pages/KYC';
import { StaticInfoPage } from './pages/StaticInfoPage';
import { NotFound } from './pages/NotFound';

// ============================================================================
// Legal & Governance Pages (Ghana Act 843 & Act 772 Compliance)
// ============================================================================
import { LegalIndex } from './pages/Legal/LegalIndex';
import { LegalDocumentPage } from './pages/Legal/LegalDocumentPage';
import { CookieConsentBanner } from './components/Legal/CookieConsentBanner';

// ============================================================================
// Authentication Pages
// ============================================================================
import { Signup } from './pages/Auth/Signup';
import { Signin } from './pages/Auth/Signin';

// ============================================================================
// Seller Pages
// ============================================================================
import { SellerDashboard } from './pages/seller/SellerDashboard';

// ============================================================================
// Admin Suite Pages
// ============================================================================
import { AdminDashboard } from './pages/Admin/Dashboard';
import { AdminLogin } from './pages/Admin/AdminLogin';
import { UserManagement } from './pages/Admin/UserManagement';
import { LiveActivity } from './pages/Admin/LiveActivity';
import { ProductManagement } from './pages/Admin/ProductManagement';
import { ReviewsModeration } from './pages/Admin/ReviewsModeration';
import { OrdersManagement } from './pages/Admin/OrdersManagement';
import { AdApprovals } from './pages/Admin/AdApprovals';
import { KYCManagement } from './pages/Admin/KYCManagement';
import { RoleChangeApprovals } from './pages/Admin/RoleChangeApprovals';

// ============================================================================
// Help & Support Pages
// ============================================================================
import { Messages } from './pages/Messages';
import { HelpCenter } from './pages/Help/HelpCenter';
import { ReportIssue } from './pages/Help/ReportIssue';
import { FAQ } from './pages/Help/FAQ';
import { ContactSupport } from './pages/Help/ContactSupport';
import { SystemStatus } from './pages/Help/SystemStatus';

// ============================================================================
// State Context Providers & Route Guards
// ============================================================================
import { UserProvider } from './context/UserContext';
import { KYCProvider } from './context/KYCContext';
import { WishlistProvider } from './context/WishlistContext';
import { CartProvider, useCart } from './context/CartContext';
import { ProtectedRoute } from './components/ProtectedRoute';

/**
 * ScrollToTop Component:
 * Automatically resets window scroll position to (0, 0) whenever the user navigates
 * to a new URL path.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

/**
 * AppContent Component:
 * Renders the active layout elements depending on whether the user is on an Admin page
 * or a regular marketplace page.
 */
const AppContent = () => {
  const location = useLocation();
  const { itemCount } = useCart();
  
  // Admin pages have their own custom sidebar & header in AdminLayout
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#f3d7db] selection:text-[#a14b58]">
      {/* Ensures viewport scrolls to top on route change */}
      <ScrollToTop />
      
      {/* Toast notification container (popups for successes & errors) */}
      <Toaster position="top-center" richColors />
      
      {/* Main navigation header — visible on all standard non-admin pages */}
      {!isAdminPage && <Navbar />}
      
      {/* Main router container */}
      <main className="flex-1">
        <Routes>
          {/* ============================================================== */}
          {/* 1. PUBLIC MARKETPLACE ROUTES (No authentication required)       */}
          {/* ============================================================== */}
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/referrals" element={<Referrals />} />
          
          {/* ============================================================== */}
          {/* 2. PROTECTED USER / BUYER ROUTES (Login required)             */}
          {/* ============================================================== */}
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/order-success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
          <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
          <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
          <Route path="/kyc" element={<ProtectedRoute><KYC /></ProtectedRoute>} />

          {/* ============================================================== */}
          {/* 3. PROTECTED SELLER SUITE (Seller role required)              */}
          {/* ============================================================== */}
          <Route path="/seller" element={<ProtectedRoute allowedRoles={['Seller']}><SellerDashboard /></ProtectedRoute>} />
          <Route path="/seller/dashboard" element={<ProtectedRoute allowedRoles={['Seller']}><SellerDashboard /></ProtectedRoute>} />
          
          {/* ============================================================== */}
          {/* 4. CENTRAL LEGAL REPOSITORY & POLICY PAGES (Ghana Act 843/772) */}
          {/* ============================================================== */}
          <Route path="/legal" element={<LegalIndex />} />
          <Route path="/legal/:slug" element={<LegalDocumentPage />} />
          {/* Direct legacy aliases mapped to single source of truth */}
          <Route path="/terms" element={<LegalDocumentPage />} />
          <Route path="/privacy" element={<LegalDocumentPage />} />
          <Route path="/returns" element={<LegalDocumentPage />} />
          <Route path="/refunds" element={<LegalDocumentPage />} />
          <Route path="/cookies" element={<LegalDocumentPage />} />
          <Route path="/disclaimer" element={<LegalDocumentPage />} />
          
          {/* Static Informational Pages */}
          <Route path="/how-it-works" element={<StaticInfoPage />} />
          <Route path="/help" element={<StaticInfoPage />} />
          <Route path="/safety" element={<StaticInfoPage />} />
          
          {/* ============================================================== */}
          {/* 5. ADMIN CONTROL SUITE (Admin role required)                  */}
          {/* ============================================================== */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin/signin" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['Admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/activity" element={<ProtectedRoute allowedRoles={['Admin']}><LiveActivity /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['Admin']}><ProductManagement /></ProtectedRoute>} />
          <Route path="/admin/ad-approvals" element={<ProtectedRoute allowedRoles={['Admin']}><AdApprovals /></ProtectedRoute>} />
          <Route path="/admin/kyc" element={<ProtectedRoute allowedRoles={['Admin']}><KYCManagement /></ProtectedRoute>} />
          <Route path="/admin/role-requests" element={<ProtectedRoute allowedRoles={['Admin']}><RoleChangeApprovals /></ProtectedRoute>} />
          <Route path="/admin/reviews" element={<ProtectedRoute allowedRoles={['Admin']}><ReviewsModeration /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['Admin']}><OrdersManagement /></ProtectedRoute>} />
          
          {/* ============================================================== */}
          {/* 6. USER MESSAGES & SUPPORT CENTER                             */}
          {/* ============================================================== */}
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/help-center" element={<HelpCenter />} />
          <Route path="/help/report" element={<ReportIssue />} />
          <Route path="/help/faq" element={<FAQ />} />
          <Route path="/help/contact" element={<ContactSupport />} />
          <Route path="/help/status" element={<SystemStatus />} />
          
          {/* ============================================================== */}
          {/* 7. ALIASES & FALLBACK ROUTING                                  */}
          {/* ============================================================== */}
          <Route path="/categories" element={<Shop />} />
          <Route path="/deals" element={<Shop />} />
          <Route path="/contact" element={<ContactSupport />} />
          
          {/* 404 Catch-All Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Main footer — visible on regular pages */}
      {!isAdminPage && <Footer />}

      {/* Global Cookie Consent Banner & Preferences Manager (Ghana Act 843) */}
      <CookieConsentBanner />

      {/* Mobile Bottom Navigation Bar (Phone viewport sticky footer) */}
      {!isAdminPage && (
        <div className="md:hidden sticky bottom-0 z-50 bg-white/90 backdrop-blur-md border-t border-[#f3d7db] px-6 py-3 flex justify-between items-center shadow-lg">
          <Link to="/" className="flex flex-col items-center gap-1 text-[#a14b58]">
            <div className="w-6 h-6 flex items-center justify-center"><HomeIcon className="w-5 h-5" /></div>
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          <Link to="/shop" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#a14b58] transition-colors">
            <div className="w-6 h-6 flex items-center justify-center"><SearchIcon className="w-5 h-5" /></div>
            <span className="text-[10px] font-bold">Shop</span>
          </Link>
          <Link to="/cart" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#a14b58] transition-colors relative">
            <div className="w-6 h-6 flex items-center justify-center"><CartIcon className="w-5 h-5" /></div>
            <span className="text-[10px] font-bold">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#a14b58] text-white text-[8px] flex items-center justify-center rounded-full font-bold">
                {itemCount}
              </span>
            )}
          </Link>
          <Link to="/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#a14b58] transition-colors">
            <div className="w-6 h-6 flex items-center justify-center"><UserIcon className="w-5 h-5" /></div>
            <span className="text-[10px] font-bold">Profile</span>
          </Link>
        </div>
      )}
    </div>
  );
};

/**
 * Root App Component:
 * Wraps the entire application with React Context Providers in hierarchical order:
 * 1. UserProvider: Manages authentication state and current user profile
 * 2. KYCProvider: Manages KYC verification documents and approval state
 * 3. WishlistProvider: Manages saved items
 * 4. CartProvider: Manages items added to cart
 * 5. Router: Enables client-side page navigation
 */
const App = () => {
  return (
    <UserProvider>
      <KYCProvider>
        <WishlistProvider>
          <CartProvider>
            <Router>
              <AppContent />
            </Router>
          </CartProvider>
        </WishlistProvider>
      </KYCProvider>
    </UserProvider>
  );
};

export default App;