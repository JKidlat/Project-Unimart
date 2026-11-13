/**
 * ==============================================================================
 * ADMIN ORDERS & PAYMENTS MANAGEMENT (OrdersManagement.tsx)
 * ==============================================================================
 * Connected strictly to `/api/admin/orders/` and `/api/admin/orders/<id>/`.
 * Displays real database transactions, multi-vendor master orders, child seller
 * suborders, inventory deduction status, and issue report triage.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Store,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  X,
  FileText,
  AlertCircle,
  Phone,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  AdminLoadingState,
  AdminErrorState,
  formatAdminDateTime,
} from '../../components/Admin/AdminStateFeedback';
import { api } from '../../../lib/api';
import { toast } from 'sonner';

interface AdminSuborderItem {
  id: number;
  product_id: number;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface AdminIssueReport {
  id: number;
  issue_type: string;
  description: string;
  status: string;
  admin_notes: string;
  created_at: string | null;
}

interface AdminSuborder {
  id: number;
  suborder_number: string;
  seller_id: number;
  seller_name: string;
  seller_email: string;
  seller_phone: string;
  seller_university: string;
  status: string;
  subtotal: number;
  advertised_delivery_fee: number;
  confirmed_delivery_fee: number;
  fulfilment_method: string;
  delivery_location: string;
  estimated_delivery: string;
  seller_response_deadline: string | null;
  rejection_reason: string;
  cancellation_reason: string;
  inventory_deducted: boolean;
  vendor_confirmed_at: string | null;
  created_at: string | null;
  items: AdminSuborderItem[];
  issue_reports: AdminIssueReport[];
}

interface AdminOrderItem {
  id: number;
  order_number: string;
  full_name: string;
  buyer_email: string;
  phone_number: string;
  university: string;
  hostel_room: string;
  total_product_amount: number;
  total_delivery_fee: number;
  total_amount: number;
  payment_method: string;
  paystack_reference: string;
  status: string;
  overall_status: string;
  refund_status: 'none' | 'requested' | 'refunded';
  created_at: string | null;
  items_count: number;
  seller_orders?: AdminSuborder[];
}

interface OrdersResponse {
  stats: {
    settled_volume: number;
    total_orders: number;
    orders_today: number;
    refund_requests: number;
    refunded_count: number;
  };
  results: AdminOrderItem[];
}

const getSuborderStatusBadge = (status: string) => {
  switch (status) {
    case 'pending_seller_response':
      return { label: 'Pending Seller Response', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'delivery_terms_proposed':
      return { label: 'Delivery Terms Proposed', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'confirmed':
      return { label: 'Confirmed / Accepted', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'ready_for_pickup':
      return { label: 'Ready for Pickup', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    case 'out_for_delivery':
      return { label: 'Out for Delivery', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'handed_over':
      return { label: 'Handed Over', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'completed':
      return { label: 'Fulfilment Completed', bg: 'bg-green-50 text-green-700 border-green-200' };
    case 'rejected_by_seller':
      return { label: 'Rejected by Seller', bg: 'bg-red-50 text-red-700 border-red-200' };
    case 'cancelled_by_buyer':
      return { label: 'Cancelled by Buyer', bg: 'bg-red-50 text-red-700 border-red-200' };
    case 'cancelled_by_seller':
      return { label: 'Cancelled by Seller', bg: 'bg-red-50 text-red-700 border-red-200' };
    case 'cancelled_system_timeout':
      return { label: 'Timed Out (System)', bg: 'bg-gray-100 text-gray-700 border-gray-300' };
    default:
      return { label: status.replace(/_/g, ' '), bg: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
};

const getMasterStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
    case 'pending_seller_confirmation':
      return { label: 'Pending Seller Response', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'partially_accepted':
      return { label: 'Partially Accepted', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'confirmed':
    case 'in_progress':
      return { label: 'In Fulfilment', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'completed':
      return { label: 'Completed', bg: 'bg-green-50 text-green-700 border-green-200' };
    case 'cancelled':
      return { label: 'Cancelled', bg: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { label: status.replace(/_/g, ' '), bg: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
};

export const OrdersManagement: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [stats, setStats] = useState<OrdersResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

  // Issue report resolution modal state
  const [resolvingIssue, setResolvingIssue] = useState<{
    orderId: number;
    suborderId: number;
    suborderCode: string;
    issue: AdminIssueReport;
  } | null>(null);
  const [adminResolutionNotes, setAdminResolutionNotes] = useState('');
  const [resolvingSubmitting, setResolvingSubmitting] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<OrdersResponse>('/admin/orders/');
      const fetched = Array.isArray(res?.results) ? res.results : [];
      setOrders(fetched);
      setStats(res?.stats || null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load orders from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const toggleExpand = (orderId: number) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleSuborderStatusChange = async (orderId: number, suborderId: number, newStatus: string) => {
    try {
      await api.patch(`/admin/orders/${orderId}/`, {
        suborder_id: suborderId,
        suborder_status: newStatus,
      });
      toast.success(`Suborder status updated to ${newStatus.replace(/_/g, ' ')}`);
      await loadOrders();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update suborder status.');
    }
  };

  const handleSaveIssueResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIssue) return;
    setResolvingSubmitting(true);
    try {
      await api.patch(`/admin/orders/${resolvingIssue.orderId}/`, {
        suborder_id: resolvingIssue.suborderId,
        admin_notes: adminResolutionNotes.trim() || 'Reviewed and resolved by administrator.',
      });
      toast.success('Dispute / Issue resolution saved.');
      setResolvingIssue(null);
      setAdminResolutionNotes('');
      await loadOrders();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save issue resolution.');
    } finally {
      setResolvingSubmitting(false);
    }
  };

  const totalDisputes = orders.reduce((acc, o) => {
    const subCount = (o.seller_orders || []).reduce((sAcc, s) => sAcc + (s.issue_reports?.length || 0), 0);
    return acc + subCount;
  }, 0);

  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase();
    const subMatches = (o.seller_orders || []).some(
      (s) =>
        s.suborder_number.toLowerCase().includes(q) ||
        s.seller_name.toLowerCase().includes(q) ||
        s.seller_email.toLowerCase().includes(q) ||
        s.seller_university.toLowerCase().includes(q)
    );

    const matchesSearch =
      String(o.id).includes(search) ||
      (o.order_number && o.order_number.toLowerCase().includes(q)) ||
      o.buyer_email.toLowerCase().includes(q) ||
      o.full_name.toLowerCase().includes(q) ||
      o.paystack_reference.toLowerCase().includes(q) ||
      o.university.toLowerCase().includes(q) ||
      subMatches;

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'disputed') {
      return (o.seller_orders || []).some((s) => (s.issue_reports || []).length > 0);
    }
    const currentOverall = o.overall_status || o.status;
    return currentOverall === statusFilter || o.status === statusFilter;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Orders & Fulfilment</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Live multi-vendor master orders ledger, child seller suborders, delivery agreements, and campus disputes
            </p>
          </div>
          <button
            onClick={loadOrders}
            className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Loading / Error States */}
        {loading && orders.length === 0 ? (
          <AdminLoadingState label="Loading orders and vendor suborders from database..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={loadOrders} />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Gross Volume</span>
                  <DollarSign className="w-4 h-4 text-[#a14b58]" />
                </div>
                <p className="text-2xl font-black text-gray-900">
                  GH₵{(stats?.settled_volume ?? 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-500 font-medium mt-1">Excluding cancelled orders</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Master Orders</span>
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.total_orders ?? orders.length}</p>
                <p className="text-[11px] text-gray-500 mt-1">{stats?.orders_today ?? 0} placed today</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Vendor Suborders</span>
                  <Store className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-2xl font-black text-gray-900">
                  {orders.reduce((acc, o) => acc + (o.seller_orders?.length || 1), 0)}
                </p>
                <p className="text-[11px] text-purple-700 font-bold mt-1">Independent seller packages</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Dispute Reports</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-gray-900">{totalDisputes}</p>
                <p className="text-[11px] text-amber-700 font-bold mt-1">Customer / delivery issues</p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by Order ID (UM-...), suborder, student name, email, or campus..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-xs sm:text-sm font-medium"
                  />
                </div>

                <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold flex-wrap gap-1">
                  {[
                    { id: 'all', label: 'All Orders' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'confirmed', label: 'Confirmed' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'cancelled', label: 'Cancelled' },
                    { id: 'disputed', label: `Disputed (${totalDisputes})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-[#a14b58] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#faf8f8] border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5 w-10"></th>
                      <th className="px-4 py-3.5">Order Number</th>
                      <th className="px-4 py-3.5">Student / Buyer</th>
                      <th className="px-4 py-3.5">Campus / Hostel</th>
                      <th className="px-4 py-3.5">Vendor Packages</th>
                      <th className="px-4 py-3.5">Total Amount</th>
                      <th className="px-4 py-3.5">Master Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-gray-400 font-medium">
                          No orders found matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const isExpanded = Boolean(expandedOrders[order.id]);
                        const suborders = order.seller_orders || [];
                        const statusBadge = getMasterStatusBadge(order.overall_status || order.status);
                        const hasDisputes = suborders.some((s) => (s.issue_reports || []).length > 0);

                        return (
                          <React.Fragment key={order.id}>
                            <tr className={`hover:bg-gray-50/80 transition-colors ${isExpanded ? 'bg-rose-50/20' : ''}`}>
                              {/* Expand/Collapse Toggle */}
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() => toggleExpand(order.id)}
                                  className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
                                  title={isExpanded ? 'Collapse vendor packages' : 'Expand vendor packages'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-[#a14b58]" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                              </td>

                              {/* Order Number & Placed At */}
                              <td className="px-4 py-4 font-black text-gray-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{order.order_number || `UM-${order.id}`}</span>
                                  {hasDisputes && (
                                    <span
                                      className="w-2 h-2 rounded-full bg-red-500"
                                      title="Has open dispute reports"
                                    />
                                  )}
                                </div>
                                <p className="text-[10px] font-normal text-gray-400 mt-0.5">
                                  {formatAdminDateTime(order.created_at)}
                                </p>
                              </td>

                              {/* Buyer Info */}
                              <td className="px-4 py-4">
                                <p className="font-bold text-gray-900">{order.full_name}</p>
                                <p className="text-[11px] text-gray-400">{order.buyer_email}</p>
                                {order.phone_number && (
                                  <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-2.5 h-2.5 text-gray-400" />
                                    {order.phone_number}
                                  </p>
                                )}
                              </td>

                              {/* Campus / Location */}
                              <td className="px-4 py-4">
                                <p className="font-semibold text-gray-800">{order.university}</p>
                                {order.hostel_room && (
                                  <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-2.5 h-2.5 text-gray-400" />
                                    {order.hostel_room}
                                  </p>
                                )}
                              </td>

                              {/* Suborders Count */}
                              <td className="px-4 py-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Store className="w-3 h-3" />
                                  {suborders.length} {suborders.length === 1 ? 'Seller Package' : 'Seller Packages'}
                                </span>
                              </td>

                              {/* Total Amount */}
                              <td className="px-4 py-4">
                                <p className="font-black text-[#a14b58] text-sm">
                                  GH₵{(order.total_amount || 0).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  Items: GH₵{(order.total_product_amount || 0).toLocaleString()} • Delivery: GH₵{(order.total_delivery_fee || 0).toLocaleString()}
                                </p>
                              </td>

                              {/* Master Status */}
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase border ${statusBadge.bg}`}
                                >
                                  {statusBadge.label}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-4 text-right">
                                <button
                                  onClick={() => toggleExpand(order.id)}
                                  className="text-xs font-bold text-[#a14b58] hover:underline cursor-pointer"
                                >
                                  {isExpanded ? 'Hide Details' : 'View Suborders'}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Details: Vendor Suborders Hierarchy */}
                            {isExpanded && (
                              <tr className="bg-gray-50/70 border-b border-gray-200">
                                <td colSpan={8} className="p-4 sm:p-6">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                      <h4 className="font-black text-gray-900 text-xs sm:text-sm flex items-center gap-2">
                                        <Store className="w-4 h-4 text-[#a14b58]" />
                                        Suborders Partitioned for {suborders.length} Campus Seller{suborders.length === 1 ? '' : 's'}
                                      </h4>
                                      <span className="text-[11px] text-gray-500 font-medium">
                                        Settlement: Cash on Delivery / Direct MoMo outside platform
                                      </span>
                                    </div>

                                    {suborders.length === 0 ? (
                                      <p className="text-xs text-gray-400 py-2">No suborders recorded for this master order.</p>
                                    ) : (
                                      <div className="grid grid-cols-1 gap-4">
                                        {suborders.map((sub) => {
                                          const subBadge = getSuborderStatusBadge(sub.status);
                                          const subIssues = sub.issue_reports || [];

                                          return (
                                            <div
                                              key={sub.id}
                                              className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-3"
                                            >
                                              {/* Suborder Header */}
                                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="font-black text-gray-900 text-sm">
                                                    {sub.suborder_number}
                                                  </span>
                                                  <span
                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${subBadge.bg}`}
                                                  >
                                                    {subBadge.label}
                                                  </span>
                                                  {sub.inventory_deducted ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                      <CheckCircle2 className="w-2.5 h-2.5" /> Stock Deducted
                                                    </span>
                                                  ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                                                      Stock Reserved (Pending Fulfilment)
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Admin Suborder Status Controller */}
                                                <div className="flex items-center gap-2">
                                                  <label className="text-[11px] font-bold text-gray-500">Status:</label>
                                                  <select
                                                    value={sub.status}
                                                    onChange={(e) =>
                                                      handleSuborderStatusChange(order.id, sub.id, e.target.value)
                                                    }
                                                    className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-[#a14b58] outline-none cursor-pointer"
                                                  >
                                                    <option value="pending_seller_response">Pending Seller Response</option>
                                                    <option value="delivery_terms_proposed">Delivery Terms Proposed</option>
                                                    <option value="confirmed">Confirmed</option>
                                                    <option value="ready_for_pickup">Ready for Pickup</option>
                                                    <option value="out_for_delivery">Out for Delivery</option>
                                                    <option value="handed_over">Handed Over</option>
                                                    <option value="completed">Completed (Deduct Inventory)</option>
                                                    <option value="rejected_by_seller">Rejected by Seller</option>
                                                    <option value="cancelled_by_buyer">Cancelled by Buyer</option>
                                                    <option value="cancelled_by_seller">Cancelled by Seller</option>
                                                    <option value="cancelled_system_timeout">Cancelled (Timeout)</option>
                                                  </select>
                                                </div>
                                              </div>

                                              {/* Seller and Delivery Details */}
                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                                                <div>
                                                  <span className="font-bold text-gray-400 uppercase text-[10px] block">
                                                    Campus Seller
                                                  </span>
                                                  <p className="font-bold text-gray-900 mt-0.5">{sub.seller_name}</p>
                                                  <p className="text-[11px] text-gray-500">{sub.seller_email}</p>
                                                  {sub.seller_phone && (
                                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                                      Tel: {sub.seller_phone}
                                                    </p>
                                                  )}
                                                  <p className="text-[10px] font-semibold text-[#a14b58]">
                                                    {sub.seller_university}
                                                  </p>
                                                </div>

                                                <div>
                                                  <span className="font-bold text-gray-400 uppercase text-[10px] block">
                                                    Fulfilment & Delivery
                                                  </span>
                                                  <p className="font-semibold text-gray-800 capitalize mt-0.5 flex items-center gap-1">
                                                    <Truck className="w-3 h-3 text-[#a14b58]" />
                                                    {sub.fulfilment_method.replace(/_/g, ' ')}
                                                  </p>
                                                  <p className="text-[11px] text-gray-600 mt-0.5">
                                                    Fee:{' '}
                                                    <span className="font-bold">
                                                      GH₵{sub.confirmed_delivery_fee || sub.advertised_delivery_fee || 0}
                                                    </span>
                                                  </p>
                                                  {sub.delivery_location && (
                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                      <MapPin className="w-2.5 h-2.5" />
                                                      {sub.delivery_location}
                                                    </p>
                                                  )}
                                                </div>

                                                <div>
                                                  <span className="font-bold text-gray-400 uppercase text-[10px] block">
                                                    Package Financials
                                                  </span>
                                                  <p className="text-gray-600 mt-0.5">
                                                    Subtotal: <span className="font-bold text-gray-900">GH₵{sub.subtotal}</span>
                                                  </p>
                                                  <p className="text-gray-600">
                                                    Delivery Fee:{' '}
                                                    <span className="font-bold text-gray-900">
                                                      GH₵{sub.confirmed_delivery_fee || sub.advertised_delivery_fee || 0}
                                                    </span>
                                                  </p>
                                                  <p className="font-black text-[#a14b58] text-sm mt-1">
                                                    Total: GH₵
                                                    {(
                                                      Number(sub.subtotal) +
                                                      Number(sub.confirmed_delivery_fee || sub.advertised_delivery_fee || 0)
                                                    ).toLocaleString()}
                                                  </p>
                                                </div>
                                              </div>

                                              {/* Suborder Items */}
                                              <div>
                                                <span className="font-bold text-gray-500 text-[11px] uppercase tracking-wider block mb-1.5">
                                                  Purchased Items Snapshot ({sub.items.length})
                                                </span>
                                                <div className="border border-gray-100 rounded-xl overflow-hidden">
                                                  <table className="w-full text-left text-xs">
                                                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                                                      <tr>
                                                        <th className="px-3 py-2">Item Title (Snapshot)</th>
                                                        <th className="px-3 py-2 text-center">Qty</th>
                                                        <th className="px-3 py-2 text-right">Unit Price</th>
                                                        <th className="px-3 py-2 text-right">Total</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                      {sub.items.map((it) => (
                                                        <tr key={it.id}>
                                                          <td className="px-3 py-2 font-medium text-gray-900">
                                                            {it.title}
                                                          </td>
                                                          <td className="px-3 py-2 text-center font-bold text-gray-700">
                                                            {it.quantity}
                                                          </td>
                                                          <td className="px-3 py-2 text-right text-gray-600">
                                                            GH₵{it.unit_price}
                                                          </td>
                                                          <td className="px-3 py-2 text-right font-bold text-gray-900">
                                                            GH₵{it.total_price}
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>

                                              {/* Issues / Disputes Section */}
                                              {subIssues.length > 0 && (
                                                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                                                  <div className="flex items-center justify-between">
                                                    <h5 className="font-black text-amber-900 text-xs flex items-center gap-1.5">
                                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                                      Disputes & Issues Reported ({subIssues.length})
                                                    </h5>
                                                  </div>

                                                  <div className="space-y-2">
                                                    {subIssues.map((issue) => (
                                                      <div
                                                        key={issue.id}
                                                        className="bg-white p-3 rounded-lg border border-amber-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                                      >
                                                        <div>
                                                          <span className="font-bold text-gray-900 capitalize">
                                                            {issue.issue_type.replace(/_/g, ' ')}
                                                          </span>
                                                          <p className="text-gray-600 text-[11px] mt-0.5">
                                                            {issue.description}
                                                          </p>
                                                          {issue.admin_notes && (
                                                            <p className="text-[10px] text-green-700 font-semibold mt-1">
                                                              Admin Resolution: {issue.admin_notes}
                                                            </p>
                                                          )}
                                                          <p className="text-[9px] text-gray-400 mt-0.5">
                                                            Reported on {formatAdminDateTime(issue.created_at)}
                                                          </p>
                                                        </div>

                                                        <button
                                                          onClick={() => {
                                                            setResolvingIssue({
                                                              orderId: order.id,
                                                              suborderId: sub.id,
                                                              suborderCode: sub.suborder_number,
                                                              issue,
                                                            });
                                                            setAdminResolutionNotes(issue.admin_notes || '');
                                                          }}
                                                          className="px-3 py-1.5 bg-[#a14b58] text-white rounded-lg font-bold text-[11px] hover:bg-[#863b48] cursor-pointer shrink-0"
                                                        >
                                                          Resolve / Add Notes
                                                        </button>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Dispute Resolution Modal */}
        {resolvingIssue && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setResolvingIssue(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-1">Triage Suborder Issue</h3>
              <p className="text-xs text-gray-500 mb-4">
                Suborder {resolvingIssue.suborderCode} • Issue: {resolvingIssue.issue.issue_type.replace(/_/g, ' ')}
              </p>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs mb-4">
                <span className="font-bold text-gray-700 block mb-1">Customer / Reporter Note:</span>
                <p className="text-gray-600">{resolvingIssue.issue.description}</p>
              </div>

              <form onSubmit={handleSaveIssueResolution} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Administrative Finding / Resolution Notes *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={adminResolutionNotes}
                    onChange={(e) => setAdminResolutionNotes(e.target.value)}
                    placeholder="Document your findings, seller communication, resolution, or mediation outcome..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#a14b58] outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResolvingIssue(null)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resolvingSubmitting}
                    className="flex-1 py-2.5 bg-[#a14b58] hover:bg-[#863b48] text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-60"
                  >
                    {resolvingSubmitting ? 'Saving Resolution...' : 'Save & Mark Resolved'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
