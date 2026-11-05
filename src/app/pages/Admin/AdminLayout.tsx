/**
 * ==============================================================================
 * ADMIN SUITE SHELL & NAVIGATION LAYOUT (AdminLayout.tsx)
 * ==============================================================================
 * This component wraps all administrative pages in the Unimart platform:
 * - /admin (Dashboard metrics & charts)
 * - /admin/users (Student accounts & status)
 * - /admin/products (Marketplace catalog & moderation)
 * - /admin/ad-approvals (Pending seller ads queue)
 * - /admin/kyc (Student identity verification requests)
 * - /admin/role-requests (Buyer/Seller role change requests)
 * - /admin/orders (Transactions, refunds, MoMo payments)
 * - /admin/reviews (Product review moderation)
 * - /admin/activity (Live audit log of platform actions)
 *
 * Core Features:
 * 1. Badge Notifications:
 *    - Automatically calculates pending count for Ad Approvals and KYC submissions.
 *    - Renders attention badge counts next to sidebar navigation items.
 * 2. Responsive Collapsible Sidebar:
 *    - Desktop collapsible sidebar (expand/compact mode).
 *    - Mobile drawer menu with smooth animations via `motion/react`.
 * 3. Security Credentials Modal:
 *    - Direct entry point to `AdminAccessModal` for inviting new admins and
 *      auto-generating credentials.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, Users, ShoppingBag, CreditCard, 
  Star, Activity, Menu, X, LogOut, ChevronRight,
  ShieldCheck, ChevronLeft, ExternalLink, KeyRound,
  UserCheck, PackagePlus, UserCog
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../../context/UserContext';
import { AdminAccessModal } from '../../components/Admin/AdminAccessModal';
import { kycStorage } from '../../../lib/api';

// Admin sidebar navigation items configuration
const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: ShoppingBag, label: 'Products', path: '/admin/products' },
  { icon: PackagePlus, label: 'Ad Approvals', path: '/admin/ad-approvals', badgeKey: 'ads' },
  { icon: UserCheck, label: 'KYC Requests', path: '/admin/kyc', badgeKey: 'kyc' },
  { icon: UserCog, label: 'Role Changes', path: '/admin/role-requests' },
  { icon: CreditCard, label: 'Orders & Payments', path: '/admin/orders' },
  { icon: Star, label: 'Reviews', path: '/admin/reviews' },
  { icon: Activity, label: 'Live Activity', path: '/admin/activity' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const location = useLocation();
  const { user } = useUser();

  // Pending counts for badge indicators
  const [pendingKYC, setPendingKYC] = useState(0);
  const [pendingAds, setPendingAds] = useState(0);

  useEffect(() => {
    const refreshCounts = () => {
      const kyc = kycStorage.getAll().filter((k: any) => k.status === 'pending').length;
      const products = JSON.parse(localStorage.getItem('unimart_products_store') || '[]');
      const ads = products.filter((p: any) => p.status === 'pending_approval').length;
      setPendingKYC(kyc);
      setPendingAds(ads);
    };
    refreshCounts();
    const interval = setInterval(refreshCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const badges: Record<string, number> = { kyc: pendingKYC, ads: pendingAds };

  const currentItem = navItems.find((item) => item.path === location.pathname) || navItems[0];

  return (
    <div className="min-h-screen bg-[#faf8f8] flex flex-col">
      {/* Top Mobile Bar */}
      <div className="lg:hidden bg-white border-b border-[#f3d7db] px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-[#a14b58] to-[#c86371] rounded-xl flex items-center justify-center text-white font-black text-sm">
            U
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 leading-none">Unimart Admin</h1>
            <span className="text-[10px] text-[#a14b58] font-bold">Creator Suite</span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          aria-label="Toggle Navigation"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex flex-1">
        {/* Desktop & Mobile Sidebar */}
        <AnimatePresence>
          {(isSidebarOpen || typeof window === 'undefined' || true) && (
            <aside
              className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-[#f3d7db] z-50 transition-all duration-300 flex flex-col ${
                isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
              } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
            >
              {/* Sidebar Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#a14b58] to-[#c86371] rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                    U
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <h2 className="font-black text-gray-900 text-base leading-tight truncate">Unimart</h2>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#a14b58] font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-3 h-3 text-green-600" />
                        <span>Creator Mode</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop Collapse Toggle */}
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const badge = (item as any).badgeKey ? badges[(item as any).badgeKey] : 0;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold text-sm transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white shadow-lg shadow-[#a14b58]/25'
                          : 'text-gray-600 hover:bg-[#fcf6f7] hover:text-[#a14b58]'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                      {!isCollapsed && badge > 0 && (
                        <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom Creator Card & Exit Actions */}
              <div className="p-3 border-t border-gray-100 space-y-1 bg-white">
                {!isCollapsed && user && (
                  <div className="p-3 rounded-2xl bg-[#fcf6f7] border border-[#f3d7db] mb-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#a14b58] text-white font-black text-xs flex items-center justify-center shrink-0">
                      {(user.name || 'Super Admin').charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">{user.name || 'Super Admin'}</p>
                      <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Super Admin
                      </p>
                    </div>
                  </div>
                )}

                <Link
                  to="/"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-gray-600 hover:text-[#a14b58] hover:bg-[#fcf6f7] transition-all ${
                    isCollapsed ? 'justify-center px-0' : ''
                  }`}
                  title={isCollapsed ? 'View Student Marketplace' : undefined}
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>View Marketplace</span>}
                </Link>

                <button
                  type="button"
                  onClick={() => setIsAccessModalOpen(true)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-gray-700 hover:text-[#a14b58] hover:bg-[#fcf6f7] transition-all ${
                    isCollapsed ? 'justify-center px-0' : ''
                  }`}
                  title={isCollapsed ? 'Manage Admins & Passwords' : undefined}
                >
                  <KeyRound className="w-4 h-4 shrink-0 text-[#a14b58]" />
                  {!isCollapsed && <span>Admin Security & Team</span>}
                </button>


                <Link
                  to="/admin/login"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-red-600 hover:bg-red-50 transition-all ${
                    isCollapsed ? 'justify-center px-0' : ''
                  }`}
                  title={isCollapsed ? 'Switch / Exit Admin' : undefined}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Exit Admin</span>}
                </Link>
              </div>
            </aside>
          )}
        </AnimatePresence>

        {/* Main Content Area with Header & Breadcrumbs */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Admin Header Bar */}
          <header className="bg-white border-b border-[#f3d7db] px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Link to="/admin" className="hover:text-[#a14b58] font-medium transition-colors">
                Admin
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-bold text-gray-900">{currentItem.label}</span>
            </div>

            {/* Quick Status Badges & Admin Access Button */}
            <div className="flex items-center gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setIsAccessModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>+ Add Admin / Security</span>
              </button>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-bold border border-green-200 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Paystack Gateway Live
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fcf6f7] text-[#a14b58] font-bold border border-[#f3d7db] text-[11px]">
                Campus API Online
              </span>
            </div>
          </header>

          <main className="flex-1 p-6 sm:p-8">
            {children}
          </main>
        </div>
      </div>

      {/* Admin Access & Team Modal */}
      <AdminAccessModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
      />

      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}
    </div>
  );
};
