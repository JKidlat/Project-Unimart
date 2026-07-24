import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Search, ShoppingCart, User, Menu, X, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../context/UserContext';

/**
 * Navbar Component
 *
 * The main application navigation bar.
 * Handles:
 * - Desktop/Mobile responsive menu
 * - Global search overlay logic
 * - Navigation to key marketplace sections (Home, Shop, Sell)
 * - User session display (Profile with role badge / Sign-in)
 */
export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const { user, setSearchQuery, isLoggedIn } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    setIsSearchOpen(false);
    if (location.pathname !== '/shop') {
      navigate('/shop');
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: 'Sell', path: '/sell' },
    { name: 'Messages', path: '/messages' },
    { name: 'Help', path: '/help-center' },
  ];

  /**
   * Role badge config — Buyer gets teal, Seller gets amber/wine.
   * Renders as a small absolute circle on the avatar.
   */
  const roleBadge = user?.role === 'Seller'
    ? { bg: 'bg-amber-500', icon: <Briefcase className="w-2.5 h-2.5 text-white" /> }
    : { bg: 'bg-teal-500', icon: <User className="w-2.5 h-2.5 text-white" /> };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#a14b58] to-[#6f323d] rounded-xl flex items-center justify-center shadow-lg shadow-[#a14b584d]">
              <span className="text-white font-bold text-2xl">U</span>
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#a14b58] to-[#6f323d]">
              Unimart
            </span>
          </Link>

          {/* Desktop Navigation */}
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

          {/* Action Icons */}
          <div className="flex items-center space-x-2 md:space-x-5">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-gray-600 hover:text-[#a14b58] transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <Link to="/cart" className="p-2 text-gray-600 hover:text-[#a14b58] transition-colors relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-4 h-4 bg-[#a14b58] text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                3
              </span>
            </Link>

            {isLoggedIn && user ? (
              <Link
                to="/profile"
                className="hidden sm:flex items-center space-x-2 p-1 pl-2 border border-gray-100 rounded-full hover:bg-gray-50 transition-all"
              >
                {/* Name + role label */}
                <div className="hidden lg:flex flex-col items-end leading-none">
                  <span className="text-xs font-bold text-gray-700">{user.name.split(' ')[0]}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${
                    user.role === 'Seller' ? 'text-amber-500' : 'text-teal-500'
                  }`}>
                    {user.role}
                  </span>
                </div>
                {/* Avatar with role badge */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-[#fcf6f7] flex items-center justify-center text-[#a14b58] font-bold overflow-hidden border border-[#f3d7db]">
                    {user.profilePic ? (
                      <img src={user.profilePic} alt="P" className="w-full h-full object-cover" />
                    ) : (
                      user.name[0]
                    )}
                  </div>
                  {/* Role indicator dot */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${roleBadge.bg}`}>
                    {roleBadge.icon}
                  </div>
                </div>
              </Link>
            ) : (
              <Link
                to="/signin"
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#a14b58] text-white rounded-xl text-sm font-bold hover:bg-[#863b48] transition-all"
              >
                Sign In
              </Link>
            )}

            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-purple-100 overflow-hidden"
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
                  className="flex items-center justify-between px-3 py-3 text-base font-medium text-gray-600 hover:text-[#a14b58] hover:bg-[#fcf6f7] rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-[#fcf6f7] flex items-center justify-center text-[#a14b58] font-bold border border-[#f3d7db]">
                        {user.name[0]}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${roleBadge.bg}`}>
                        {roleBadge.icon}
                      </div>
                    </div>
                    <span>{user.name.split(' ')[0]}</span>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    user.role === 'Seller'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-teal-100 text-teal-600'
                  }`}>
                    {user.role}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-0 w-full bg-white border-b border-purple-100 p-4 shadow-lg"
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
  );
};
