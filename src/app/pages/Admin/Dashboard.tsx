/**
 * ==============================================================================
 * ADMIN CONTROL DASHBOARD (Dashboard.tsx)
 * ==============================================================================
 * This page provides an executive command overview of the entire Unimart platform.
 *
 * Core Dashboard Analytics:
 * 1. KPI Metric Cards:
 *    - Total Active Students (Registered campus users)
 *    - Monthly Gross Marketplace Volume (GH₵ Revenue & growth %)
 *    - Active Product Listings (Catalog volume)
 *    - Pending Verification Queue (Seller KYCs needing admin attention)
 * 2. Interactive Charts (Recharts):
 *    - Revenue and Order Volume Trends over 7-day, 30-day, and 90-day windows.
 *    - Category breakdown bar chart.
 * 3. Urgent Action Panel:
 *    - Quick action shortcuts to approve pending seller ads, review flagged
 *      reviews, and respond to student support tickets.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { 
  Users, ShoppingBag, DollarSign, TrendingUp, 
  AlertTriangle, CheckCircle2, MoreVertical, Search,
  ArrowUpRight, ArrowDownRight, UserCheck, ShoppingCart,
  Headphones, ShieldAlert, ArrowRight, ExternalLink, Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, 
  CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar
} from 'recharts';
import { Link } from 'react-router';
import { AdminLayout } from './AdminLayout';
import { toast } from 'sonner';

// Chart datasets based on time-range selection
const revenueData7d = [
  { name: 'Mon', revenue: 7400, orders: 18 },
  { name: 'Tue', revenue: 9200, orders: 24 },
  { name: 'Wed', revenue: 14800, orders: 36 },
  { name: 'Thu', revenue: 11200, orders: 28 },
  { name: 'Fri', revenue: 16500, orders: 42 },
  { name: 'Sat', revenue: 18900, orders: 48 },
  { name: 'Sun', revenue: 13200, orders: 32 },
];

const revenueData30d = [
  { name: 'Week 1', revenue: 42000, orders: 110 },
  { name: 'Week 2', revenue: 58000, orders: 145 },
  { name: 'Week 3', revenue: 64500, orders: 168 },
  { name: 'Week 4', revenue: 84200, orders: 215 },
];

const revenueDataYTD = [
  { name: 'Jan', revenue: 32000, orders: 85 },
  { name: 'Feb', revenue: 48000, orders: 120 },
  { name: 'Mar', revenue: 84200, orders: 215 },
];

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: number;
  badgeText?: string;
  color: string;
  bgGradient: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  badgeText = 'vs last period',
  color,
  bgGradient
}) => (
  <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 ${bgGradient} rounded-bl-[3rem] -z-0 opacity-40 group-hover:scale-110 transition-transform`} />
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-3">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-white shadow-xs`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-black ${
          trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <p className="text-gray-500 text-xs font-semibold mb-1 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-gray-900 tracking-tight">{value}</h3>
      <p className="text-[11px] text-gray-400 mt-1 font-medium">{badgeText}</p>
    </div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'ytd'>('7d');
  const [verifications, setVerifications] = useState([
    { id: '1', name: 'Emmanuel Boateng', studentId: 'UG-109482', school: 'UG - Legon', status: 'Pending' },
    { id: '2', name: 'Sarah Mensah', studentId: 'KN-284910', school: 'KNUST', status: 'Approved' },
    { id: '3', name: 'John Appiah', studentId: 'UC-938210', school: 'UCC', status: 'Approved' },
    { id: '4', name: 'Abigail Osei', studentId: 'UP-384910', school: 'UPSA', status: 'Pending' },
  ]);

  const activeChartData = timeRange === '7d' 
    ? revenueData7d 
    : timeRange === '30d' 
    ? revenueData30d 
    : revenueDataYTD;

  const handleVerify = (id: string, action: 'Approved' | 'Rejected') => {
    setVerifications(prev => prev.map(item => item.id === id ? { ...item, status: action } : item));
    toast.success(`Verification status updated to ${action}`);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome Banner & Quick Action Buttons */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-[#1f0e12] via-[#2a1318] to-[#1a0c0e] text-white p-7 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#a14b58]/30 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-[#a14b58]/40 border border-[#c86371]/40 rounded-full text-[11px] font-black uppercase tracking-wider text-[#f3d7db] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Live Creator Control
              </span>
              <span className="text-xs text-white/50">• Campus Session Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Platform Command Center
            </h1>
            <p className="text-white/70 text-xs sm:text-sm mt-1 leading-relaxed">
              Real-time monitoring across University of Ghana, KNUST, UCC, and UPSA student hubs.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <Link
              to="/admin/activity"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live Activity Stream
            </Link>
            <Link
              to="/admin/products"
              className="px-4 py-2.5 bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#a14b58]/40"
            >
              Moderate Listings
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 6 Required Metrics Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-500">Core Marketplace Metrics</h2>
            <span className="text-xs text-gray-400 font-medium">Auto-updated via Paystack & Webhooks</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 1. Total users */}
            <MetricCard 
              title="Total Users" 
              value="12,482" 
              icon={Users} 
              trend={12} 
              badgeText="Across 4 campuses"
              color="bg-[#a14b58]" 
              bgGradient="bg-[#a14b58]"
            />
            {/* 2. Active users */}
            <MetricCard 
              title="Active Users" 
              value="8,940" 
              icon={UserCheck} 
              trend={18} 
              badgeText="Active this week"
              color="bg-emerald-600" 
              bgGradient="bg-emerald-500"
            />
            {/* 3. Total products */}
            <MetricCard 
              title="Total Products" 
              value="3,842" 
              icon={ShoppingBag} 
              trend={8} 
              badgeText="Active dorm listings"
              color="bg-blue-600" 
              bgGradient="bg-blue-500"
            />
            {/* 4. Orders today */}
            <MetricCard 
              title="Orders Today" 
              value="158" 
              icon={ShoppingCart} 
              trend={24} 
              badgeText="GH₵12,450 transacted"
              color="bg-indigo-600" 
              bgGradient="bg-indigo-500"
            />
            {/* 5. Revenue (Paystack) */}
            <MetricCard 
              title="Revenue (Paystack)" 
              value="GH₵84,200" 
              icon={DollarSign} 
              trend={15} 
              badgeText="100% verified payouts"
              color="bg-amber-600" 
              bgGradient="bg-amber-500"
            />
            {/* 6. Open support tickets */}
            <MetricCard 
              title="Open Support" 
              value="6" 
              icon={Headphones} 
              trend={-24} 
              badgeText="Avg reply: 4 mins"
              color="bg-rose-600" 
              bgGradient="bg-rose-500"
            />
          </div>
        </div>

        {/* Charts & Verification Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Revenue Chart Section (2 cols) */}
          <div className="lg:col-span-2 bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Paystack Revenue Growth</h3>
                <p className="text-xs text-gray-500">Gross student volume and marketplace transactions</p>
              </div>
              <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">
                <button
                  onClick={() => setTimeRange('7d')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    timeRange === '7d' ? 'bg-[#a14b58] text-white shadow-xs' : 'hover:text-gray-900'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setTimeRange('30d')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    timeRange === '30d' ? 'bg-[#a14b58] text-white shadow-xs' : 'hover:text-gray-900'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setTimeRange('ytd')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    timeRange === 'ytd' ? 'bg-[#a14b58] text-white shadow-xs' : 'hover:text-gray-900'
                  }`}
                >
                  YTD
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a14b58" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#a14b58" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #f3d7db', 
                      boxShadow: '0 10px 25px -5px rgba(161, 75, 88, 0.15)',
                      backgroundColor: '#ffffff'
                    }}
                    formatter={(value: any) => [`GH₵${value.toLocaleString()}`, 'Revenue']}
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

            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase">Avg Daily Volume</p>
                <p className="text-base font-black text-gray-900 mt-0.5">GH₵12,028</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase">Paystack Success</p>
                <p className="text-base font-black text-green-600 mt-0.5">99.4%</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase">Avg Cart Size</p>
                <p className="text-base font-black text-[#a14b58] mt-0.5">GH₵340</p>
              </div>
            </div>
          </div>

          {/* Student Verifications Sidebar (1 col) */}
          <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Student ID Queue</h3>
                  <p className="text-xs text-gray-500">Verify student university credentials</p>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                  2 Pending
                </span>
              </div>

              <div className="space-y-4">
                {verifications.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-[#faf8f8] border border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#fcf6f7] border border-[#f3d7db] text-[#a14b58] font-black text-sm flex items-center justify-center shrink-0">
                        {item.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-500 font-medium truncate">{item.school} • {item.studentId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => handleVerify(item.id, 'Approved')}
                            className="px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[10px] font-black transition-all"
                            title="Approve student"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerify(item.id, 'Rejected')}
                            className="px-2 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-[10px] font-bold transition-all"
                            title="Reject ID"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          item.status === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/admin/users"
              className="w-full mt-6 py-3 bg-[#fcf6f7] text-[#a14b58] hover:bg-[#f3d7db] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <span>Manage All Student Profiles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Moderation Shortcuts Bar */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h3 className="text-base font-black text-gray-900">Creator Quick Actions</h3>
              <p className="text-xs text-gray-500">Direct shortcuts to high-priority platform workflows</p>
            </div>
            <span className="text-xs text-gray-400 font-semibold">Security Level: Super Administrator</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/admin/reviews"
              className="p-4 rounded-2xl bg-[#faf8f8] hover:bg-[#fcf6f7] border border-gray-100 hover:border-[#f3d7db] transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-900 group-hover:text-[#a14b58]">Reviews Moderation</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <p className="text-[11px] text-gray-500">8 reported reviews awaiting decision</p>
            </Link>

            <Link
              to="/admin/products"
              className="p-4 rounded-2xl bg-[#faf8f8] hover:bg-[#fcf6f7] border border-gray-100 hover:border-[#f3d7db] transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-900 group-hover:text-[#a14b58]">Flagged Products</span>
                <span className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <p className="text-[11px] text-gray-500">42 flagged items need inspection</p>
            </Link>

            <Link
              to="/admin/orders"
              className="p-4 rounded-2xl bg-[#faf8f8] hover:bg-[#fcf6f7] border border-gray-100 hover:border-[#f3d7db] transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-900 group-hover:text-[#a14b58]">Orders & Paystack</span>
                <span className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <p className="text-[11px] text-gray-500">158 orders processed today</p>
            </Link>

            <Link
              to="/admin/activity"
              className="p-4 rounded-2xl bg-[#faf8f8] hover:bg-[#fcf6f7] border border-gray-100 hover:border-[#f3d7db] transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-900 group-hover:text-[#a14b58]">Live Activity Feed</span>
                <span className="w-2 h-2 rounded-full bg-[#a14b58] animate-pulse" />
              </div>
              <p className="text-[11px] text-gray-500">Real-time telemetry and student events</p>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};