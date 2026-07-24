import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router';
import { Toaster } from 'sonner';
import { 
  Home as HomeIcon, 
  Search as SearchIcon, 
  ShoppingCart as CartIcon, 
  User as UserIcon 
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetails } from './pages/ProductDetails';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { Profile } from './pages/Profile';
import { AccountSettings } from './pages/AccountSettings';
import { Sell } from './pages/Sell';
import { StaticInfoPage } from './pages/StaticInfoPage';
import { Signup } from './pages/Auth/Signup';
import { Signin } from './pages/Auth/Signin';
import { UserProvider } from './context/UserContext';
import { AdminDashboard } from './pages/Admin/Dashboard';
import { UserManagement } from './pages/Admin/UserManagement';
import { LiveActivity } from './pages/Admin/LiveActivity';
import { ProductManagement } from './pages/Admin/ProductManagement';
import { ReviewsModeration } from './pages/Admin/ReviewsModeration';
import { Messages } from './pages/Messages';
import { HelpCenter } from './pages/Help/HelpCenter';
import { ReportIssue } from './pages/Help/ReportIssue';
import { FAQ } from './pages/Help/FAQ';
import { ContactSupport } from './pages/Help/ContactSupport';
import { SystemStatus } from './pages/Help/SystemStatus';

// Scroll to top on route change
/**
 * ScrollToTop Component
 * 
 * A utility component that scrolls the window to the top whenever the route changes.
 * This is essential for a single-page application (SPA) to ensure users don't
 * start at the bottom of a new page.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    // Smooth scroll to the top of the viewport
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

/**
 * Main App Component
 * 
 * The root component of the Unimart application. It handles:
 * 1. User Context initialization
 * 2. Routing logic using react-router
 * 3. Global layout (Navbar, Main Content, Footer, Mobile Nav)
 * 4. Application-wide toaster notifications
 */

const AppContent = () => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#f3d7db] selection:text-[#a14b58]">
      <ScrollToTop />
      <Toaster position="top-center" richColors />
      
      {!isAdminPage && <Navbar />}
      
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<AccountSettings />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          
          {/* Static Informational Pages */}
          <Route path="/how-it-works" element={<StaticInfoPage />} />
          <Route path="/help" element={<StaticInfoPage />} />
          <Route path="/safety" element={<StaticInfoPage />} />
          <Route path="/delivery" element={<StaticInfoPage />} />
          <Route path="/returns" element={<StaticInfoPage />} />
          <Route path="/terms" element={<StaticInfoPage />} />
          <Route path="/privacy" element={<StaticInfoPage />} />
          
          {/* Admin Pages */}
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/activity" element={<LiveActivity />} />
          <Route path="/admin/products" element={<ProductManagement />} />
          <Route path="/admin/reviews" element={<ReviewsModeration />} />
          
          {/* Messages */}
          <Route path="/messages" element={<Messages />} />
          
          {/* Help Pages */}
          <Route path="/help-center" element={<HelpCenter />} />
          <Route path="/help/report" element={<ReportIssue />} />
          <Route path="/help/faq" element={<FAQ />} />
          <Route path="/help/contact" element={<ContactSupport />} />
          <Route path="/help/status" element={<SystemStatus />} />
          
          {/* Fallback routes */}
          <Route path="/categories" element={<Shop />} />
          <Route path="/deals" element={<Shop />} />
          <Route path="/contact" element={<div className="py-20 text-center"><h1 className="text-3xl font-bold font-sans">Contact Page</h1></div>} />
        </Routes>
      </main>

      {!isAdminPage && <Footer />}

      {/* Mobile Bottom Navigation (Mobile-first app feel) */}
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
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#a14b58] text-white text-[8px] flex items-center justify-center rounded-full font-bold">3</span>
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

const App = () => {
  return (
    <UserProvider>
      <Router>
        <AppContent />
      </Router>
    </UserProvider>
  );
};

export default App;