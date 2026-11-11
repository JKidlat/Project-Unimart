/**
 * ==============================================================================
 * ADMIN SUITE SHELL & NAVIGATION LAYOUT (AdminLayout.tsx)
 * ==============================================================================
 * Wraps all administrative pages, loading real pending counts from `/api/admin/dashboard/`,
 * providing clean navigation (including University Management), and handling secure logout.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  CreditCard,
  Star,
  Activity,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
  ChevronLeft,
  ExternalLink,
  KeyRound,
  UserCheck,
  PackagePlus,
  UserCog,
  GraduationCap,
  LifeBuoy,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useUser } from '../../context/UserContext';
import { AdminAccessModal } from '../../components/Admin/AdminAccessModal';
import { api } from '../../../lib/api';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: ShoppingBag, label: 'Products', path: '/admin/products' },
  { icon: PackagePlus, label: 'Ad Approvals', path: '/admin/ad-approvals', badgeKey: 'ads' },
  { icon: UserCheck, label: 'KYC Requests', path: '/admin/kyc', badgeKey: 'kyc' },
  { icon: UserCog, label: 'Role Changes', path: '/admin/role-requests', badgeKey: 'role_requests' },
  { icon: LifeBuoy, label: 'Support', path: '/admin/support', badgeKey: 'support' },
  { icon: CreditCard, label: 'Orders & Payments', path: '/admin/orders' },
  { icon: Star, label: 'Reviews', path: '/admin/reviews' },
  { icon: GraduationCap, label: 'Universities', path: '/admin/universities' },
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
  const navigate = useNavigate();
  const { user, logout } = useUser();

  const [badges, setBadges] = useState<Record<string, number>>({
    kyc: 0,
    ads: 0,
    role_requests: 0,
    support: 0,
  });

  const refreshCounts = useCallback(async () => {
    try {
      const res = await api.get<{ badges?: Record<string, number> }>('/admin/dashboard/');
      if (res?.badges) {
        setBadges({
          kyc: Number(res.badges.kyc || 0),
          ads: Number(res.badges.ads || 0),
          role_requests: Number(res.badges.role_requests || 0),
          support: Number(res.badges.support || 0),
        });
      }
    } catch {
      // Badge poll does not replace main page error banners
    }
  }, []);

  useEffect(() => {
    refreshCounts();
    const interval = setInterval(refreshCounts, 45000);
    return () => clearInterval(interval);
  }, [refreshCounts]);

  const currentItem = navItems.find((item) => item.path === location.pathname) || navItems[0];

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

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
            <span className="text-[10px] text-[#a14b58] font-bold">Admin Suite</span>
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
        <AnimatePresence>
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
                      <span>Admin Suite</span>
                    </div>
                  </div>
                )}
              </div>

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
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/admin' && location.pathname === '/admin/dashboard');
                const badge = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
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
                      <span className="ml-auto min-w-[20px] h-5 px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Card & Actions */}
            <div className="p-3 border-t border-gray-100 space-y-1 bg-white">
              {!isCollapsed && user && (
                <div className="p-3 rounded-2xl bg-[#fcf6f7] border border-[#f3d7db] mb-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#a14b58] text-white font-black text-xs flex items-center justify-center shrink-0">
                    {(user.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{user.name || user.email}</p>
                    <p className="text-[10px] text-green-700 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      {user.is_superuser ? 'Super Admin' : 'Administrator'}
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-gray-700 hover:text-[#a14b58] hover:bg-[#fcf6f7] transition-all cursor-pointer ${
                  isCollapsed ? 'justify-center px-0' : ''
                }`}
                title={isCollapsed ? 'Manage Admins & Passwords' : undefined}
              >
                <KeyRound className="w-4 h-4 shrink-0 text-[#a14b58]" />
                {!isCollapsed && <span>Admin Security & Team</span>}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-red-600 hover:bg-red-50 transition-all cursor-pointer ${
                  isCollapsed ? 'justify-center px-0' : ''
                }`}
                title={isCollapsed ? 'Sign Out' : undefined}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Sign Out</span>}
              </button>
            </div>
          </aside>
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-[#f3d7db] px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Link to="/admin" className="hover:text-[#a14b58] font-medium transition-colors">
                Admin
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-bold text-gray-900">{currentItem.label}</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setIsAccessModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Admin Security</span>
              </button>
            </div>
          </header>

          <main className="flex-1 p-6 sm:p-8">{children}</main>
        </div>
      </div>

      <AdminAccessModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 lg:hidden" />
      )}
    </div>
  );
};
