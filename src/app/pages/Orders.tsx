/**
 * ==============================================================================
 * BUYER ORDERS & REAL-TIME ORDER TRACKER (Orders.tsx)
 * ==============================================================================
 * This page displays the logged-in student's order history and provides a live
 * step-by-step Order Status Tracker.
 *
 * Core Features:
 * 1. Order Status Stepper (OrderStatusTracker):
 *    - Visual progress bar showing 4 stages:
 *      1. Order Placed (pending)
 *      2. Processing (seller preparing item)
 *      3. Ready for Pickup (item ready on campus)
 *      4. Completed (order picked up and concluded)
 *    - Displays exact timestamp for each milestone reached.
 * 2. Real-Time Status Synchronization:
 *    - Automatically polls localStorage every 15 seconds.
 *    - When the seller advances an order status in their Seller Studio, the change
 *      reflects live on the buyer's screen without needing a manual browser refresh.
 * 3. Filtered History:
 *    - Filters the orders store by `o.buyer_email === user.email` so students only
 *      see their own transactions.
 * ==============================================================================
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Package,
  TruckIcon,
  CheckCircle2,
  Clock,
  XCircle,
  LifeBuoy,
  RefreshCw,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { api } from '../../lib/api';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { toast } from 'sonner';

// Ordered sequence of statuses used to render the progress stepper
const ORDER_STATUSES = ['pending', 'processing', 'ready_for_pickup', 'completed'];

// Normalize backend/payment aliases onto stepper steps
const normalizeStepperStatus = (status: string) => {
  if (status === 'paid') return 'processing';
  if (status === 'shipped') return 'ready_for_pickup';
  return status;
};

// User-friendly display names for each status step
const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  paid: 'Processing',
  processing: 'Processing',
  shipped: 'Ready for Pickup',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Distinct icon for each milestone
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-5 h-5" />,
  processing: <Package className="w-5 h-5" />,
  ready_for_pickup: <TruckIcon className="w-5 h-5" />,
  completed: <CheckCircle2 className="w-5 h-5" />,
  cancelled: <XCircle className="w-5 h-5" />,
};

// ==============================================================================
// SUB-COMPONENT: ORDER STATUS STEPPER
// ==============================================================================
const OrderStatusTracker: React.FC<{ status: string; statusHistory?: { status: string; timestamp: string }[] }> = ({
  status,
  statusHistory = [],
}) => {
  const normalizedStatus = normalizeStepperStatus(status);
  const isCancelled = normalizedStatus === 'cancelled';
  const currentIdx = ORDER_STATUSES.indexOf(normalizedStatus);

  const getTimestamp = (s: string) => {
    const entry = statusHistory.find(h => normalizeStepperStatus(h.status) === s);
    return entry && entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  };

  return (
    <div className="mt-6 px-2">
      {isCancelled ? (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-3 rounded-xl border border-red-100 text-sm font-bold">
          <XCircle className="w-5 h-5" />
          Order Cancelled
        </div>
      ) : (
        <div className="flex items-start gap-0">
          {ORDER_STATUSES.map((s, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            const ts = getTimestamp(s);

            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      done
                        ? active
                          ? 'bg-[#a14b58] text-white shadow-md shadow-[#a14b581a] scale-110'
                          : 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-300'
                    }`}
                  >
                    {STATUS_ICONS[s]}
                  </div>
                  <p className={`text-[9px] font-bold mt-1.5 text-center leading-tight w-16 ${done ? (active ? 'text-[#a14b58]' : 'text-green-600') : 'text-gray-300'}`}>
                    {STATUS_LABELS[s]}
                  </p>
                  {ts && (
                    <p className="text-[8px] text-gray-400 mt-0.5">{ts}</p>
                  )}
                </div>
                {i < ORDER_STATUSES.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mt-4 transition-all ${i < currentIdx ? 'bg-green-400' : 'bg-gray-100'}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Orders: React.FC = () => {
  const { user, loading: authLoading } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadOrders = useCallback(async (silent = false) => {
    if (authLoading) return;
    if (!user) {
      setOrders([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await api.get('/orders/?role=buyer');
      const list = Array.isArray(data) ? data : data.results || [];
      setOrders(list);
      setError(null);
    } catch (err: any) {
      if (!silent) {
        setError(err?.message || 'Unable to load your orders right now.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    loadOrders(false);
    if (!user) return;
    // Poll every 15 seconds for seller status updates
    const interval = setInterval(() => loadOrders(true), 15000);
    return () => clearInterval(interval);
  }, [loadOrders, user]);

  const handleCancelOrder = async (orderId: number) => {
    setCancellingId(orderId);
    try {
      const updated = await api.patch(`/orders/${orderId}/`, { status: 'cancelled' });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
      toast.success(`Order #${orderId} cancelled.`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel this order.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Your Orders</h1>
          <p className="text-gray-500">Track your campus marketplace purchases</p>
        </div>
        <Link to="/shop" className="text-sm font-bold text-[#a14b58] hover:underline flex items-center gap-1">
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading orders...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-red-100 p-8 shadow-sm">
          <p className="text-red-600 font-bold mb-2">Failed to load your orders</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => loadOrders(false)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : !user ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to view your orders</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Access real-time order updates, pickup codes, and customer support.
          </p>
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833]"
          >
            Sign In <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <div className="w-20 h-20 bg-[#fcf6f7] rounded-3xl flex items-center justify-center text-[#a14b58] mx-auto mb-6">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders placed yet</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Explore gadgets, textbooks, and dorm essentials listed by fellow students.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833]"
          >
            Start Shopping <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const totalAmt = Number(order.total_amount || 0);
            const history: { status: string; timestamp: string }[] = [];
            if (order.created_at) history.push({ status: 'pending', timestamp: order.created_at });
            if (order.vendor_confirmed_at) history.push({ status: 'completed', timestamp: order.vendor_confirmed_at });

            return (
              <div key={order.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                {/* Order Header */}
                <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">Order #{order.id}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        order.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-100' :
                        order.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Placed on {new Date(order.created_at || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Total</span>
                    <span className="text-xl font-black text-[#a14b58]">GH₵{totalAmt.toLocaleString()}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="py-4 space-y-3">
                  {(order.items || []).map((item: any, idx: number) => {
                    const lineTotal = Number(
                      item.total_price ?? Number(item.price_at_purchase || item.price || 0) * Number(item.quantity || 1)
                    );
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.product_image ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                              <ImageWithFallback
                                src={item.product_image}
                                alt={item.product_title || 'Order item'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs shrink-0">
                              {item.quantity}×
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {item.quantity}× {item.product_title || item.name || `Product #${item.product_id}`}
                            </p>
                            {item.seller_name && (
                              <p className="text-[11px] text-gray-400 truncate">Sold by {item.seller_name}</p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-gray-900 shrink-0">
                          GH₵{lineTotal.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Status Tracker */}
                <OrderStatusTracker status={order.status} statusHistory={order.statusHistory || history} />

                {/* Footer with Order Actions & Support Link */}
                <div className="pt-5 mt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Delivery to {order.university || 'Campus'} • {order.hostel_room || 'Room'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {order.payment_method && (
                      <span className="font-semibold uppercase text-gray-600">
                        {String(order.payment_method).replace(/_/g, ' ')}
                      </span>
                    )}
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                    <Link
                      to={`/contact?orderId=${order.id}&category=Order+Problem`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#a14b58] text-gray-700 hover:text-[#a14b58] font-bold text-xs transition-colors bg-gray-50/70 hover:bg-rose-50/50"
                    >
                      <LifeBuoy className="w-3.5 h-3.5 text-[#a14b58]" />
                      <span>Customer Support</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
