/**
 * ==============================================================================
 * GLOBAL NAVIGATION BAR (Navbar.tsx)
 * ==============================================================================
 * This component provides the primary header navigation across all standard
 * marketplace pages.
 *
 * Core Features:
 * 1. Brand Logo:
 *    - Unimart gradient logo with quick redirect to homepage ('/').
 * 2. Primary Navigation Links:
 *    - Home, Shop, Sell, Messages, Help Center.
 * 3. Search Overlay:
 *    - Toggleable dropdown search input that syncs with `setSearchQuery` in UserContext.
 * 4. Shopping Cart Indicator:
 *    - Displays live item count badge populated from CartContext.
 * 5. Role-Aware Profile Pill:
 *    - Displays user's first name, avatar, and color-coded role badge:
 *        - Teal badge for Buyer
 *        - Amber badge for Seller
 *        - Red button link for Admin Suite
 * 6. Responsive Mobile Hamburger Menu:
 *    - Animated drawer with accessible tap targets for phones and small tablets.
 * ==============================================================================
 */

import React, { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Search, ShoppingCart, User, Menu, X, Briefcase, ShieldCheck, Store, ShoppingBag, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../context/UserContext';
import { useCart } from '../context/CartContext';
import { useChat } from '../context/ChatContext';
import { ChatDrawer } from './Chat/ChatDrawer';

export const Navbar = () => {
  // Local state for mobile menu toggle and search bar overlay
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  // Global user, cart, and chat context
  const { user, setSearchQuery, isLoggedIn } = useUser();
  const { itemCount } = useCart();
  const { unreadCount, toggleDrawer, isDrawerOpen } = useChat();
  const location = useLocation();
  const navigate = useNavigate();

  // ----------------------------------------------------------------------------
  // Handler: Global Search Form Submit
  // ----------------------------------------------------------------------------
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    setIsSearchOpen(false);
    if (location.pathname !== '/shop' && location.pathname !== '/') {
      navigate('/shop');
    }
  };

  /**
   * Role-Aware Navigation Links:
   * - Sellers have the "Sell" button linking directly to their seller studio.
   * - Buyers DO NOT have the "Sell" button to prevent confusion and maintain a clean shopping flow.
   * - Guests see Home, Shop, and Help.
   */
  const navLinks = useMemo(() => {
    if (!isLoggedIn) {
      return [
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/shop' },
        { name: 'Help', path: '/help-center' },
      ];
    }

    if (user?.role === 'Seller') {
      return [
        { name: 'Shop', path: '/' },
        { name: 'Sell', path: '/seller' },
        { name: 'Messages', path: '/messages' },
        { name: 'Help', path: '/help-center' },
      ];
    }

    // Buyer role (or default authenticated student) - strictly NO "Sell" button
    return [
      { name: 'Shop', path: '/' },
      { name: 'Orders', path: '/orders' },
      { name: 'Messages', path: '/messages' },
      { name: 'Help', path: '/help-center' },
    ];
  }, [isLoggedIn, user?.role]);

  /**
   * Clear visual identity configuration for user roles:
   * - Seller: Amber badge with Store icon ("SELLER")
   * - Buyer: Teal badge with User icon ("BUYER")
   * - Admin: Crimson badge with ShieldCheck ("ADMIN")
   */
  const roleConfig = useMemo(() => {
    const isSeller = user?.role === 'Seller';
    const isAdmin = user?.role === 'Admin' || user?.is_staff;

    if (isAdmin) {
      return {
        label: 'ADMIN',
        fullLabel: 'Admin Suite',
        pillBg: 'bg-rose-50 text-rose-700 border-rose-200',
        dotBg: 'bg-rose-600',
        icon: <ShieldCheck className="w-2.5 h-2.5 text-white" />
      };
    }

    if (isSeller) {
      return {
        label: 'SELLER',
        fullLabel: 'Seller Store',
        pillBg: 'bg-amber-50 text-amber-800 border-amber-200',
        dotBg: 'bg-amber-500',
        icon: <Store className="w-2.5 h-2.5 text-white" />
      };
    }

    // Default: Student Buyer
    return {
      label: 'BUYER',
      fullLabel: 'Student Buyer',
      pillBg: 'bg-teal-50 text-teal-700 border-teal-200',
      dotBg: 'bg-teal-500',
      icon: <User className="w-2.5 h-2.5 text-white" />
    };
  }, [user?.role, user?.is_staff]);

  return (
    <>
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#f3d7db]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* ============================================================== */}
          {/* 1. BRAND LOGO                                                  */}
          {/* ============================================================== */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <img
              src="/logo.png"
              alt="Unimart Logo"
              className="w-10 h-10 object-contain rounded-xl shadow-md group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#a14b58] to-[#6f323d] tracking-tight">
              Unimart
            </span>
          </Link>

          {/* ============================================================== */}
          {/* 2. DESKTOP NAVIGATION LINKS                                    */}
          {/* ============================================================== */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-bold transition-colors hover:text-[#a14b58] ${
                  location.pathname === link.path ? 'text-[#a14b58]' : 'text-gray-600'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* ============================================================== */}
          {/* 3. ACTION ICONS & PROFILE PILL                                 */}
          {/* ============================================================== */}
          <div className="flex items-center space-x-2 md:space-x-5">
            {/* Search Icon (Toggles overlay) */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-gray-600 hover:text-[#a14b58] transition-colors"
              aria-label="Toggle search bar"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Cart Icon with Live Item Count Badge */}
            <Link to="/cart" className="p-2 text-gray-600 hover:text-[#a14b58] transition-colors relative" aria-label="Shopping Cart">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-[#a14b58] text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Chat Icon — visible to logged-in buyers and sellers only */}
            {isLoggedIn && (
              <button
                onClick={toggleDrawer}
                className={`p-2 relative transition-colors cursor-pointer ${
                  isDrawerOpen ? 'text-[#a14b58]' : 'text-gray-600 hover:text-[#a14b58]'
                }`}
                aria-label="Open messages"
              >
                <MessageCircle className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-[16px] h-4 px-0.5 bg-[#a14b58] text-white text-[9px] flex items-center justify-center rounded-full font-black border border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Admin Suite Quick Link (Visible only to authenticated admins) */}
            {isLoggedIn && (user?.role === 'Admin' || user?.is_staff) && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#a14b58] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#863b48] transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Suite</span>
              </Link>
            )}

            {/* Authenticated User Profile Pill */}
            {isLoggedIn && user ? (
              <Link
                to="/profile"
                aria-label="Account profile"
                className="hidden sm:flex items-center space-x-2.5 p-1.5 pl-3 border border-gray-100 rounded-full hover:bg-gray-50 transition-all bg-white shadow-xs"
              >
                <div className="hidden lg:flex flex-col items-end leading-none">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${roleConfig.pillBg}`}>
                    {roleConfig.label}
                  </span>
                </div>
                {/* Avatar with role status dot */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-[#fcf6f7] flex items-center justify-center text-[#a14b58] font-bold overflow-hidden border border-[#f3d7db]">
                    {user.profilePic ? (
                      <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${roleConfig.dotBg}`}>
                    {roleConfig.icon}
                  </div>
                </div>
              </Link>
            ) : (
              // Guest Sign-In Button
              <Link
                to="/signin"
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#a14b58] text-white rounded-xl text-sm font-bold hover:bg-[#863b48] transition-all"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. MOBILE DROPDOWN DRAWER                                      */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-[#f3d7db] overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-3 text-base font-medium text-gray-600 hover:text-[#a14b58] hover:bg-[#fcf6f7] rounded-lg transition-colors"
                >
                  {link.name}
                </Link>
              ))}

              {isLoggedIn && user ? (
                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 text-base font-medium text-gray-600 hover:text-[#a14b58] hover:bg-[#fcf6f7] rounded-xl transition-colors border border-gray-100 my-1 bg-gray-50/50"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-[#fcf6f7] flex items-center justify-center text-[#a14b58] font-bold overflow-hidden border border-[#f3d7db]">
                        {user.profilePic ? (
                          <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${roleConfig.dotBg}`}>
                        {roleConfig.icon}
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 block text-sm">My Account</span>
                      <span className="text-[10px] text-gray-400 block">{user.university || 'Unimart Student'}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${roleConfig.pillBg}`}>
                    {roleConfig.label}
                  </span>
                </Link>
              ) : (
                <Link
                  to="/signin"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-3 text-base font-bold text-white bg-[#a14b58] hover:bg-[#863b48] rounded-lg transition-colors text-center mt-2"
                >
                  Sign In
                </Link>
              )}

              {/* Admin Suite Quick Link (Visible only to authenticated admins) */}
              {isLoggedIn && (user?.role === 'Admin' || user?.is_staff) && (
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-xs font-bold text-white bg-[#a14b58] hover:bg-[#863b48] rounded-lg transition-colors text-center"
                  >
                    Admin Suite →
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 5. SEARCH OVERLAY DRAWER                                       */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-0 w-full bg-white border-b border-[#f3d7db] p-4 shadow-lg"
          >
            <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto relative">
              <input
                type="text"
                placeholder="Search for laptops, textbooks, dorm decor..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a14b58] transition-all"
                autoFocus
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#a14b58] uppercase tracking-widest hover:underline">
                Search
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>

    {/* ============================================================== */}
    {/* 6. GLOBAL CHAT DRAWER (slide-in from right, portal-rendered)   */}
    {/* ============================================================== */}
    <ChatDrawer />
    </>
  );
};
