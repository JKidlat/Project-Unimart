/**
 * ==============================================================================
 * ADMIN CONTROL DASHBOARD (Dashboard.tsx)
 * ==============================================================================
 * Database-driven executive command center backed strictly by `GET /api/admin/dashboard/`.
 * Displays real user/buyer/seller/product/order/revenue/university metrics,
 * real revenue time series, pending KYC verification actions, and recent signups.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShoppingBag,
  DollarSign,
  UserCheck,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Clock,
  GraduationCap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Link } from 'react-router';
import { AdminLayout } from './AdminLayout';
import {
  AdminLoadingState,
  AdminErrorState,
  formatAdminDate,
} from '../../components/Admin/AdminStateFeedback';
import { api } from '../../../lib/api';
import { toast } from 'sonner';

interface DashboardStats {
  total_users: number;
  active_users: number;
  suspended_users: number;
  total_buyers: number;
  total_sellers: number;
  total_admins: number;
  verified_students: number;
  verified_emails: number;
  recent_registrations_7d: number;
  total_products: number;
  live_products: number;
  pending_ads: number;
  flagged_products: number;
  hidden_products: number;
  rejected_products: number;
  pending_kyc: number;
  pending_role_requests: number;
  total_orders: number;
  orders_today: number;
  today_revenue: number;
  total_revenue: number;
  paid_revenue: number;
  avg_order_value: number;
  refund_requests: number;
  total_reviews: number;
  pending_reviews: number;
  flagged_reviews: number;
  total_universities: number;
  active_universities: number;
  open_support_tickets?: number;
}

interface DashboardResponse {
  stats: DashboardStats;
  revenue_series: { name: string; revenue: number; orders: number }[];
  pending_kyc_queue: {
    id: number;
    name: string;
    email: string;
    school: string;
    business_name: string;
    mode: string;
    status: string;
    submitted_at: string | null;
  }[];
  recent_registrations: {
    id: number;
    name: string;
    email: string;
    role: string;
    university: string;
    is_active: boolean;
    is_email_verified: boolean;
    date_joined: string | null;
  }[];
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText: string;
  subBadge?: string;
  color: string;
  bgGradient: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  badgeText,
  subBadge,
  color,
  bgGradient,
}) => (
  <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
    <div
      className={`absolute top-0 right-0 w-24 h-24 ${bgGradient} rounded-bl-[3rem] -z-0 opacity-30 group-hover:scale-110 transition-transform`}
    />
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-3">
        <div className={`p-3 rounded-2xl ${color} text-white shadow-xs`}>
          <Icon className="w-5 h-5" />
        </div>
        {subBadge && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-700">
            {subBadge}
          </span>
        )}
      </div>
      <p className="text-gray-500 text-xs font-semibold mb-1 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-gray-900 tracking-tight">{value}</h3>
      <p className="text-[11px] text-gray-500 mt-1 font-medium">{badgeText}</p>
    </div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'ytd'>('7d');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingKycId, setUpdatingKycId] = useState<number | null>(null);

  const loadDashboard = useCallback(async (range: '7d' | '30d' | 'ytd') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DashboardResponse>(`/admin/dashboard/?range=${range}`);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load dashboard metrics.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(timeRange);
  }, [timeRange, loadDashboard]);

  const handleKycDecision = async (kycId: number, action: 'approved' | 'rejected') => {
    setUpdatingKycId(kycId);
    try {
      await api.patch(`/kyc/${kycId}/`, {
        status: action,
        rejectionReason: action === 'rejected' ? 'Rejected from dashboard queue' : undefined,
      });
      toast.success(`KYC status updated to ${action}.`);
      await loadDashboard(timeRange);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update KYC submission.');
    } finally {
      setUpdatingKycId(null);
    }
  };

  const stats = data?.stats;
  const chartData = data?.revenue_series || [];
  const kycQueue = data?.pending_kyc_queue || [];
  const recentRegistrations = data?.recent_registrations || [];
  const pendingApprovalsTotal =
    (stats?.pending_kyc || 0) + (stats?.pending_ads || 0) + (stats?.pending_role_requests || 0);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Banner */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-[#1f0e12] via-[#2a1318] to-[#1a0c0e] text-white p-7 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#a14b58]/30 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#a14b58]/40 border border-[#c86371]/40 rounded-full text-[11px] font-black uppercase tracking-wider text-[#f3d7db] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Live Database Command
              </span>
              <span className="text-xs text-white/60">
                • {stats ? `${stats.active_universities} active institutions` : 'Production sync'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Platform Command Center
            </h1>
            <p className="text-white/70 text-xs sm:text-sm mt-1 leading-relaxed">
              Live database metrics, approvals, and user telemetry across all accredited Ghanaian institutions.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => loadDashboard(timeRange)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              to="/admin/activity"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              Live Activity Stream
            </Link>
            <Link
              to="/admin/ad-approvals"
              className="px-4 py-2.5 bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#a14b58]/40"
            >
              Moderate Listings
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {loading && !data ? (
          <AdminLoadingState label="Loading platform dashboard from database..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={() => loadDashboard(timeRange)} />
        ) : stats ? (
          <>
            {/* 6 Summary Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-gray-500">
                  Core Platform Metrics
                </h2>
                <span className="text-xs text-gray-400 font-medium">
                  Calculated directly from database records
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <MetricCard
                  title="Total Users"
                  value={stats.total_users.toLocaleString()}
                  icon={Users}
                  subBadge={`${stats.recent_registrations_7d} new (7d)`}
                  badgeText={`${stats.active_users} active • ${stats.suspended_users} suspended`}
                  color="bg-[#a14b58]"
                  bgGradient="bg-[#a14b58]"
                />
                <MetricCard
                  title="Buyers / Sellers"
                  value={`${stats.total_buyers} / ${stats.total_sellers}`}
                  icon={UserCheck}
                  subBadge={`${stats.verified_students} verified IDs`}
                  badgeText={`${stats.total_admins} admins • ${stats.verified_emails} verified emails`}
                  color="bg-emerald-600"
                  bgGradient="bg-emerald-500"
                />
                <MetricCard
                  title="Total Products"
                  value={stats.total_products.toLocaleString()}
                  icon={ShoppingBag}
                  subBadge={`${stats.live_products} live`}
                  badgeText={`${stats.pending_ads} pending • ${stats.flagged_products} flagged`}
                  color="bg-blue-600"
                  bgGradient="bg-blue-500"
                />
                <MetricCard
                  title="Pending Approvals"
                  value={pendingApprovalsTotal.toLocaleString()}
                  icon={Clock}
                  subBadge={`${stats.pending_kyc} KYC`}
                  badgeText={`${stats.pending_ads} ads • ${stats.pending_role_requests} role requests`}
                  color="bg-amber-600"
                  bgGradient="bg-amber-500"
                />
                <MetricCard
                  title="Total Orders"
                  value={stats.total_orders.toLocaleString()}
                  icon={ShoppingCart}
                  subBadge={`${stats.orders_today} today`}
                  badgeText={`Today: GH₵${stats.today_revenue.toLocaleString()}`}
                  color="bg-indigo-600"
                  bgGradient="bg-indigo-500"
                />
                <MetricCard
                  title="Order Volume"
                  value={`GH₵${stats.total_revenue.toLocaleString()}`}
                  icon={DollarSign}
                  subBadge={`${stats.refund_requests} refunds`}
                  badgeText={`Paid/Settled: GH₵${stats.paid_revenue.toLocaleString()}`}
                  color="bg-rose-600"
                  bgGradient="bg-rose-500"
                />
              </div>
            </div>

            {/* Chart & KYC Queue Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-xs flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Order Volume & Revenue</h3>
                    <p className="text-xs text-gray-500">Actual order totals excluding cancelled orders</p>
                  </div>
                  <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">
                    {(['7d', '30d', 'ytd'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          timeRange === r ? 'bg-[#a14b58] text-white shadow-xs' : 'hover:text-gray-900'
                        }`}
                      >
                        {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'YTD'}
                      </button>
                    ))}
                  </div>
                </div>

                {chartData.every((pt) => pt.revenue === 0 && pt.orders === 0) ? (
                  <div className="h-72 flex flex-col items-center justify-center bg-[#faf8f8] rounded-2xl border border-dashed border-gray-200 text-center p-6">
                    <ShoppingCart className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm font-bold text-gray-600">No orders recorded for this period yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Real transaction volume will appear here as student buyers place orders.
                    </p>
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a14b58" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#a14b58" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '16px',
                            border: '1px solid #f3d7db',
                            boxShadow: '0 10px 25px -5px rgba(161, 75, 88, 0.15)',
                            backgroundColor: '#ffffff',
                          }}
                          formatter={(value: any) => [`GH₵${Number(value).toLocaleString()}`, 'Volume']}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#a14b58"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase">Total Orders</p>
                    <p className="text-base font-black text-gray-900 mt-0.5">{stats.total_orders}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase">Orders Today</p>
                    <p className="text-base font-black text-green-600 mt-0.5">{stats.orders_today}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase">Avg Order Value</p>
                    <p className="text-base font-black text-[#a14b58] mt-0.5">
                      GH₵{stats.avg_order_value.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* KYC Queue */}
              <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">Seller KYC Queue</h3>
                      <p className="text-xs text-gray-500">Verification requests from database</p>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                      {stats.pending_kyc} Pending
                    </span>
                  </div>

                  {kycQueue.length === 0 ? (
                    <div className="py-10 text-center text-xs text-gray-400 bg-[#faf8f8] rounded-2xl border border-gray-100">
                      No KYC submissions in the database yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {kycQueue.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-[#faf8f8] border border-gray-100 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#fcf6f7] border border-[#f3d7db] text-[#a14b58] font-black text-sm flex items-center justify-center shrink-0">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                              <p className="text-[11px] text-gray-500 font-medium truncate">
                                {item.school} • {item.business_name || item.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  disabled={updatingKycId === item.id}
                                  onClick={() => handleKycDecision(item.id, 'approved')}
                                  className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-black transition-all disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingKycId === item.id}
                                  onClick={() => handleKycDecision(item.id, 'rejected')}
                                  className="px-2 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span
                                className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                  item.status === 'approved'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {item.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  to="/admin/kyc"
                  className="w-full mt-6 py-3 bg-[#fcf6f7] text-[#a14b58] hover:bg-[#f3d7db] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Review All KYC Submissions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Recent Registrations */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900">Recent Registrations</h3>
                  <p className="text-xs text-gray-500">Latest registered accounts from the database</p>
                </div>
                <Link to="/admin/users" className="text-xs font-bold text-[#a14b58] hover:underline flex items-center gap-1">
                  Manage All Users <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentRegistrations.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No registered users yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentRegistrations.map((u) => (
                    <div key={u.id} className="p-3.5 rounded-2xl bg-[#faf8f8] border border-gray-100 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{u.university}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-[#fcf6f7] text-[#a14b58] border border-[#f3d7db]">
                          {u.role}
                        </span>
                        <p className="text-[10px] text-gray-400">{formatAdminDate(u.date_joined)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Moderation Shortcuts */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900">Admin Quick Actions</h3>
                  <p className="text-xs text-gray-500">Direct workflows backed by live database counts</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Link
                  to="/admin/support"
                  className="p-4 rounded-2xl bg-[#faf8f8] hover:bg-[#fcf6f7] border border-gray-100 hover:border-[#f3d7db] transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#a14b58]">Customer Support</span>
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {stats.open_support_tickets ?? 0} open / in progress tickets
                  </p>
                </Link>

                <Link
                  to="/admin/reviews"
                  className="p-4 rounded-2xl bg-[#faf8f8] hover:bg-[#fcf6f7] border border-gray-100 hover:border-[#f3d7db] transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#a14b58]">Reviews Moderation</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {stats.flagged_reviews} flagged • {stats.pending_reviews} pending ({stats.total_reviews} total)
                  </p>
                </Link>

                <Link
                  to="/admin/products"
                  className="p-4 rounded-2xl bg-[#faf8f8] hover:bg-[#fcf6f7] border border-gray-100 hover:border-[#f3d7db] transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#a14b58]">Product Catalog</span>
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {stats.flagged_products} flagged • {stats.pending_ads} awaiting approval
                  </p>
                </Link>

                <Link
                  to="/admin/universities"
                  className="p-4 rounded-2xl bg-[#faf8f8] hover:bg-[#fcf6f7] border border-gray-100 hover:border-[#f3d7db] transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#a14b58]">Universities</span>
                    <GraduationCap className="w-3.5 h-3.5 text-[#a14b58]" />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {stats.active_universities} active / {stats.total_universities} total institutions
                  </p>
                </Link>

                <Link
                  to="/admin/orders"
                  className="p-4 rounded-2xl bg-[#faf8f8] hover:bg-[#fcf6f7] border border-gray-100 hover:border-[#f3d7db] transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#a14b58]">Orders & Payments</span>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {stats.orders_today} orders today • {stats.refund_requests} refund requests
                  </p>
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};
