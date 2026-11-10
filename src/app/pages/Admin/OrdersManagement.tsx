/**
 * ==============================================================================
 * ADMIN ORDERS & PAYMENTS MANAGEMENT (OrdersManagement.tsx)
 * ==============================================================================
 * Connected strictly to `/api/admin/orders/` and `/api/admin/orders/<id>/`.
 * Displays real database transactions, order counts, and refund processing.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  Copy,
  RotateCcw,
  DollarSign,
  ShoppingBag,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  AdminLoadingState,
  AdminErrorState,
  formatAdminDateTime,
} from '../../components/Admin/AdminStateFeedback';
import { api } from '../../../lib/api';
import { toast } from 'sonner';

interface AdminOrderItem {
  id: number;
  full_name: string;
  buyer_email: string;
  university: string;
  total_amount: number;
  payment_method: string;
  paystack_reference: string;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  refund_status: 'none' | 'requested' | 'refunded';
  created_at: string | null;
  items_count: number;
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

export const OrdersManagement: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrderItem[]>([]);
  const [stats, setStats] = useState<OrdersResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refundModalOrder, setRefundModalOrder] = useState<AdminOrderItem | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [processingRefund, setProcessingRefund] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<OrdersResponse>('/admin/orders/');
      setOrders(Array.isArray(res?.results) ? res.results : []);
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

  const handleCopyReference = (ref: string) => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    toast.success('Payment reference copied to clipboard');
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleStatusChange = async (orderId: number, newStatus: AdminOrderItem['status']) => {
    try {
      await api.patch(`/admin/orders/${orderId}/`, { status: newStatus });
      toast.success(`Order #${orderId} marked as ${newStatus}`);
      await loadOrders();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update order status.');
    }
  };

  const handleProcessRefund = async (orderId: number) => {
    setProcessingRefund(true);
    try {
      await api.patch(`/admin/orders/${orderId}/`, { action: 'process_refund' });
      setRefundModalOrder(null);
      toast.success(`Refund recorded for Order #${orderId}.`);
      await loadOrders();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process refund.');
    } finally {
      setProcessingRefund(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      String(o.id).includes(search) ||
      o.buyer_email.toLowerCase().includes(q) ||
      o.full_name.toLowerCase().includes(q) ||
      o.paystack_reference.toLowerCase().includes(q) ||
      o.university.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Orders & Payments</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Real-time database ledger of marketplace orders, payment references, and refund requests
            </p>
          </div>
          <button
            onClick={loadOrders}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading && orders.length === 0 ? (
          <AdminLoadingState label="Loading orders from database..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={loadOrders} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Order Volume</span>
                  <DollarSign className="w-4 h-4 text-[#a14b58]" />
                </div>
                <p className="text-2xl font-black text-gray-900">
                  GH₵{(stats?.settled_volume ?? 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-500 font-medium mt-1">Excluding cancelled orders</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Total Orders</span>
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.total_orders ?? orders.length}</p>
                <p className="text-[11px] text-gray-500 mt-1">{stats?.orders_today ?? 0} placed today</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Refund Requests</span>
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.refund_requests ?? 0}</p>
                <p className="text-[11px] text-amber-600 font-bold mt-1">Awaiting admin action</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Refunded</span>
                  <CreditCard className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.refunded_count ?? 0}</p>
                <p className="text-[11px] text-gray-500 mt-1">Completed reversals</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by order ID, student name, email, or payment reference..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-xs sm:text-sm font-medium"
                  />
                </div>

                <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold flex-wrap">
                  {(['all', 'pending', 'paid', 'shipped', 'completed', 'cancelled'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                        statusFilter === status
                          ? 'bg-[#a14b58] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#faf8f8] border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Order ID</th>
                      <th className="px-5 py-3.5">Student / Campus</th>
                      <th className="px-5 py-3.5">Payment Ref</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Refund</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                          No orders found matching your query.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-5 py-4 font-black text-gray-900">
                            #{order.id}
                            <p className="text-[10px] font-normal text-gray-400">
                              {formatAdminDateTime(order.created_at)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-bold text-gray-900">{order.full_name}</p>
                            <p className="text-[11px] text-gray-400">
                              {order.buyer_email} • {order.university}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            {order.paystack_reference ? (
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-700 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 w-fit">
                                <span>{order.paystack_reference}</span>
                                <button
                                  onClick={() => handleCopyReference(order.paystack_reference)}
                                  className="hover:text-[#a14b58] transition-colors"
                                  title="Copy Payment Reference"
                                >
                                  {copiedRef === order.paystack_reference ? (
                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-400">{order.payment_method}</span>
                            )}
                          </td>

                          <td className="px-5 py-4 font-black text-[#a14b58] text-sm">
                            GH₵{order.total_amount.toLocaleString()}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-gray-100 text-gray-700">
                              {order.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {order.refund_status === 'requested' ? (
                              <button
                                onClick={() => setRefundModalOrder(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                Requested
                              </button>
                            ) : order.refund_status === 'refunded' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-red-50 text-red-700 border border-red-200">
                                Refunded
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">None</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                                className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#a14b58]"
                              >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="shipped">Shipped</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              {order.refund_status === 'requested' && (
                                <button
                                  onClick={() => setRefundModalOrder(order)}
                                  className="px-2.5 py-1 bg-[#a14b58] hover:bg-[#863b48] text-white text-[11px] font-bold rounded-lg"
                                >
                                  Process
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {refundModalOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setRefundModalOrder(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-1">Confirm Order Refund</h3>
              <p className="text-xs text-gray-500 mb-4">
                Mark Order #{refundModalOrder.id} as refunded and cancelled in database.
              </p>
              <div className="bg-[#faf8f8] p-4 rounded-2xl border border-gray-100 space-y-2 text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-500">Buyer:</span>
                  <span className="font-bold text-gray-900">{refundModalOrder.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reference:</span>
                  <span className="font-mono text-gray-700">{refundModalOrder.paystack_reference || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-black text-[#a14b58] text-sm">
                    GH₵{refundModalOrder.total_amount.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRefundModalOrder(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  disabled={processingRefund}
                  onClick={() => handleProcessRefund(refundModalOrder.id)}
                  className="flex-1 py-2.5 bg-[#a14b58] hover:bg-[#863b48] text-white font-bold text-xs rounded-xl disabled:opacity-60"
                >
                  {processingRefund ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
