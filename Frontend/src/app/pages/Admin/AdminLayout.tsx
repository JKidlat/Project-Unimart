import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, Users, ShoppingBag, CreditCard, 
  Star, Activity, Menu, X, LogOut, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: ShoppingBag, label: 'Products', path: '/admin/products' },
  { icon: CreditCard, label: 'Orders & Payments', path: '/admin/orders' },
  { icon: Star, label: 'Reviews', path: '/admin/reviews' },
  { icon: Activity, label: 'Live Activity', path: '/admin/activity' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * AdminLayout Component
 * 
 * Provides the admin dashboard layout with:
 * - Sidebar navigation
 * - Mobile-responsive menu
 * - Active page highlighting
 * - Admin branding
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-xl font-black text-gray-900">Admin Panel</h1>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {(isSidebarOpen || window.innerWidth >= 1024) && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 lg:z-auto overflow-y-auto"
            >
              {/* Logo */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#a14b58] to-[#c86371] rounded-2xl flex items-center justify-center">
                    <span className="text-white font-black text-lg">U</span>
                  </div>
                  <div>
                    <h2 className="font-black text-gray-900">Unimart</h2>
                    <p className="text-xs text-gray-500">Admin Panel</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-100 transition-all mb-2"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </Link>
                <Link
                  to="/"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Exit Admin
                </Link>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}
    </div>
  );
};
