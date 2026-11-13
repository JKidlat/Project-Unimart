/**
 * ==============================================================================
 * BUYER MULTI-VENDOR ORDER DASHBOARD (Orders.tsx)
 * ==============================================================================
 * Displays Master Orders and granular Seller Suborders for buyers.
 * Supports:
 * - Master Order overview & status aggregation
 * - Granular Suborder tracking per independent campus seller
 * - 12-hour seller response deadline countdown
 * - Review & Acceptance/Rejection of structured delivery proposals
 * - In-app Chat with seller per suborder
 * - Direct confirmation of order receipt (with atomic stock deduction)
 * - Independent suborder cancellations & issue reporting
 * ==============================================================================
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MessageSquare,
  LifeBuoy,
  RefreshCw,
  Store,
  MapPin,
  Calendar,
  X,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { api } from '../../lib/api';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { toast } from 'sonner';

// Status labels & color themes for suborders
const SUBORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending_response: { label: 'Waiting for Seller', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  accepted: { label: 'Accepted by Seller', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  awaiting_delivery_agreement: { label: 'Delivery Terms Pending', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  preparing: { label: 'Seller Preparing Item', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ready_for_collection: { label: 'Ready for Campus Pickup', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  dispatched: { label: 'Dispatched for Delivery', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  delivered: { label: 'Delivered / Handed Over', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200' },
  rejected: { label: 'Declined by Seller', color: 'bg-red-50 text-red-700 border-red-200' },
  issue_reported: { label: 'Issue Under Review', color: 'bg-rose-50 text-rose-800 border-rose-200' },
};

export const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [cancellingSuborder, setCancellingSuborder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Issue reporting modal state
  const [reportingSuborder, setReportingSuborder] = useState<any | null>(null);
  const [issueType, setIssueType] = useState('item_not_received');
  const [issueDescription, setIssueDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Action loading indicators
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const loadOrders = useCallback(async (silent = false) => {
    if (authLoading) return;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await api.get<any>('/orders/?role=buyer');
      const list = Array.isArray(data) ? data : data.results || [];
      setOrders(list);
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
    const interval = setInterval(() => loadOrders(true), 15000);
    return () => clearInterval(interval);
  }, [loadOrders, user]);

  // Handle confirming receipt (marking suborder as completed)
  const handleConfirmReceipt = async (suborderId: number) => {
    if (!window.confirm('Have you received and inspected this order from the seller?')) return;
    setActionLoadingId(suborderId);
    try {
      await api.patch(`/orders/seller-orders/${suborderId}/update-status/`, { status: 'completed' });
      toast.success('Receipt confirmed! Order marked as completed.');
      loadOrders(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update order status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle accepting a delivery proposal
  const handleAcceptProposal = async (proposalId: number) => {
    setActionLoadingId(proposalId);
    try {
      await api.post(`/orders/delivery-agreements/${proposalId}/accept/`);
      toast.success('Delivery proposal accepted! Fulfilment terms updated.');
      loadOrders(true);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to accept proposal.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle declining a delivery proposal
  const handleDeclineProposal = async (proposalId: number) => {
    const reason = window.prompt('Please provide a reason for declining:') || '';
    setActionLoadingId(proposalId);
    try {
      await api.post(`/orders/delivery-agreements/${proposalId}/reject/`, { reason });
      toast.info('Proposal declined.');
      loadOrders(true);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to decline proposal.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Suborder Cancellation submission
  const submitSuborderCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSuborder || !cancelReason.trim()) {
      toast.error('Please provide a cancellation reason.');
      return;
    }
    setIsCancelling(true);
    try {
      await api.post(`/orders/seller-orders/${cancellingSuborder.id}/cancel/`, {
        reason: cancelReason.trim(),
      });
      toast.success(`Order #${cancellingSuborder.suborder_number} cancelled.`);
      setCancellingSuborder(null);
      setCancelReason('');
      loadOrders(true);
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Suborder Issue Reporting submission
  const submitIssueReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingSuborder || !issueDescription.trim()) {
      toast.error('Please describe the issue in detail.');
      return;
    }
    setIsReporting(true);
    try {
      await api.post(`/orders/seller-orders/${reportingSuborder.id}/report-issue/`, {
        issue_type: issueType,
        description: issueDescription.trim(),
      });
      toast.success('Issue reported. Our support team and seller have been alerted.');
      setReportingSuborder(null);
      setIssueDescription('');
      loadOrders(true);
    } catch (err: any) {
      toast.error(err?.message || 'Could not submit issue report.');
    } finally {
      setIsReporting(false);
    }
  };

  const calculateHoursRemaining = (deadlineStr?: string | null) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr).getTime();
    const diff = deadline - Date.now();
    if (diff <= 0) return 'Deadline expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Your Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Track your campus purchases, delivery arrangements, and handover statuses
          </p>
        </div>
        <Link
          to="/shop"
          className="text-sm font-bold text-[#a14b58] hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {user?.role === 'Seller' && (
        <div className="mb-8 p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100/90 flex items-center justify-center text-amber-800 shrink-0 font-bold">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm">You are logged in as a Campus Seller</p>
              <p className="text-xs text-gray-600 mt-0.5">
                This page shows items you bought as a student buyer. To accept incoming orders and coordinate fulfilments for your store listings, open your Seller Orders dashboard.
              </p>
            </div>
          </div>
          <Link
            to="/seller?tab=orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#a14b58] text-white rounded-xl text-xs font-bold hover:bg-[#863b48] transition-all shrink-0 shadow-md shadow-[#a14b5826] cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Manage Store Orders</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your orders...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-red-100 p-8 shadow-sm">
          <p className="text-red-600 font-bold mb-2">Failed to load your orders</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => loadOrders(false)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all cursor-pointer text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : !user ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to view your orders</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto text-sm">
            Access order updates, seller delivery agreements, and direct handover tracking.
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
          <p className="text-gray-500 mb-8 max-w-sm mx-auto text-sm">
            Explore gadgets, textbooks, and campus essentials listed by students across Ghana.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833]"
          >
            Start Shopping <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => {
            const suborders: any[] = order.seller_orders || [];
            const grandTotal = Number(order.total_amount || 0);
            const overallStatus = order.overall_status || order.status;

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm"
              >
                {/* Master Order Top Bar */}
                <div className="bg-gray-50/90 px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-black text-gray-900 text-base">
                        Master Order #{order.order_number || order.id}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                          overallStatus === 'completed'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : overallStatus === 'cancelled'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : overallStatus === 'partially_accepted'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {overallStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span>Placed on {new Date(order.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{suborders.length} Package{suborders.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Grand Total</span>
                    <span className="text-xl font-black text-[#a14b58]">GH₵{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Suborders List */}
                <div className="p-6 space-y-6">
                  {suborders.length === 0 ? (
                    // Legacy orders without suborder partition
                    <div className="text-xs text-gray-500">
                      Standard order with {(order.items || []).length} item(s).
                    </div>
                  ) : (
                    suborders.map((sub: any) => {
                      const statusConfig = SUBORDER_STATUS_MAP[sub.status] || {
                        label: sub.status,
                        color: 'bg-gray-100 text-gray-700 border-gray-200',
                      };
                      const deadlineText =
                        sub.status === 'pending_response'
                          ? calculateHoursRemaining(sub.seller_response_deadline)
                          : null;
                      const hasPendingProposal =
                        sub.latest_agreement &&
                        sub.latest_agreement.status === 'pending' &&
                        sub.latest_agreement.proposed_by_role === 'seller';

                      return (
                        <div
                          key={sub.id}
                          className="rounded-2xl border border-gray-200 p-5 bg-white space-y-4 hover:border-gray-300 transition-colors"
                        >
                          {/* Suborder Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#a14b58] flex items-center justify-center font-bold text-xs">
                                <Store className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-gray-900 text-sm">
                                    {sub.seller_name}
                                  </h3>
                                  <span className="text-xs text-gray-400">• {sub.seller_university}</span>
                                </div>
                                <span className="text-[11px] font-mono text-gray-400">
                                  Order #{sub.suborder_number}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusConfig.color}`}
                              >
                                {statusConfig.label}
                              </span>
                            </div>
                          </div>

                          {/* 12-Hour Deadline Countdown Banner */}
                          {deadlineText && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>12-Hour Confirmation Window: </span>
                              <span className="font-bold">{deadlineText}</span>
                            </div>
                          )}

                          {/* Items in this suborder */}
                          <div className="space-y-2 py-1">
                            {(sub.items || []).map((item: any) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs sm:text-sm gap-3"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {item.product_image ? (
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                                      <ImageWithFallback
                                        src={item.product_image}
                                        alt={item.product_title}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs shrink-0">
                                      {item.quantity}×
                                    </div>
                                  )}
                                  <span className="font-medium text-gray-800 truncate">
                                    {item.quantity}× {item.product_title}
                                  </span>
                                </div>
                                <span className="font-bold text-gray-900 shrink-0">
                                  GH₵{Number(item.total_price || 0).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Fulfilment & Delivery Information */}
                          <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100 grid sm:grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="text-gray-400 block text-[10px]">Method</span>
                              <span className="font-bold text-gray-800 capitalize">
                                {String(sub.fulfilment_method || 'personal_delivery').replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[10px]">Delivery Fee</span>
                              <span className="font-bold text-[#a14b58]">
                                {Number(sub.confirmed_delivery_fee || sub.advertised_delivery_fee || 0) === 0
                                  ? 'Free / Pickup'
                                  : `GH₵${Number(sub.confirmed_delivery_fee || sub.advertised_delivery_fee).toFixed(2)}`}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[10px]">Location / Meetup</span>
                              <span className="font-medium text-gray-800 truncate block">
                                {sub.delivery_location || 'Campus Handover'}
                              </span>
                            </div>
                          </div>

                          {/* Interactive Delivery Proposal Card (if proposed by seller) */}
                          {hasPendingProposal && (
                            <div className="p-4 rounded-2xl bg-rose-50/80 border-2 border-[#a14b58]/30 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                  <Truck className="w-4 h-4 text-[#a14b58]" />
                                  Delivery Proposal from {sub.seller_name}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  NEEDS YOUR APPROVAL
                                </span>
                              </div>

                              <div className="text-xs text-gray-700 grid sm:grid-cols-2 gap-2">
                                <div>
                                  <span className="text-gray-500">Proposed Fee: </span>
                                  <span className="font-bold text-[#a14b58]">
                                    GH₵{Number(sub.latest_agreement.proposed_fee).toFixed(2)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Meeting Point: </span>
                                  <span className="font-medium text-gray-900">
                                    {sub.latest_agreement.delivery_location}
                                  </span>
                                </div>
                                {sub.latest_agreement.estimated_delivery && (
                                  <div className="sm:col-span-2">
                                    <span className="text-gray-500">Window: </span>
                                    <span className="font-medium text-gray-900">
                                      {sub.latest_agreement.estimated_delivery}
                                    </span>
                                  </div>
                                )}
                                {sub.latest_agreement.notes && (
                                  <p className="sm:col-span-2 text-[11px] italic text-gray-600 bg-white p-2 rounded-lg border border-rose-100">
                                    &ldquo;{sub.latest_agreement.notes}&rdquo;
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  disabled={actionLoadingId === sub.latest_agreement.id}
                                  onClick={() => handleAcceptProposal(sub.latest_agreement.id)}
                                  className="px-4 py-2 bg-[#a14b58] text-white rounded-xl font-bold text-xs hover:bg-[#863b48] transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Accept Terms
                                </button>
                                <button
                                  disabled={actionLoadingId === sub.latest_agreement.id}
                                  onClick={() => handleDeclineProposal(sub.latest_agreement.id)}
                                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Rejection / Cancellation notices */}
                          {sub.status === 'rejected' && sub.rejection_reason && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                              <span className="font-bold">Declined by Seller: </span>
                              <span>{sub.rejection_reason}</span>
                            </div>
                          )}

                          {sub.status === 'cancelled' && sub.cancellation_reason && (
                            <div className="p-3 rounded-xl bg-gray-100 border border-gray-200 text-xs text-gray-700">
                              <span className="font-bold">Cancelled: </span>
                              <span>{sub.cancellation_reason}</span>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <Link
                                to="/messages"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#a14b58] text-gray-700 hover:text-[#a14b58] text-xs font-bold transition-colors cursor-pointer bg-white"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-[#a14b58]" />
                                <span>Chat with Seller</span>
                              </Link>

                              {(sub.status === 'ready_for_collection' ||
                                sub.status === 'dispatched' ||
                                sub.status === 'delivered') && (
                                <button
                                  disabled={actionLoadingId === sub.id}
                                  onClick={() => handleConfirmReceipt(sub.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Confirm Receipt</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {(sub.status === 'pending_response' || sub.status === 'accepted') && (
                                <button
                                  onClick={() => setCancellingSuborder(sub)}
                                  className="px-2.5 py-1.5 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  Cancel Order
                                </button>
                              )}

                              {sub.status !== 'cancelled' && sub.status !== 'rejected' && sub.status !== 'issue_reported' && (
                                <button
                                  onClick={() => setReportingSuborder(sub)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-gray-500 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Report Issue</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Master Order Footer */}
                <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                    <span>Direct campus handover • Pay seller directly upon receipt</span>
                  </div>
                  <Link
                    to={`/contact?orderId=${order.id}&category=Order+Problem`}
                    className="inline-flex items-center gap-1 text-[#a14b58] font-bold hover:underline"
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>Unimart Dispute Support</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancellingSuborder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-900 text-base">
                Cancel Order #{cancellingSuborder.suborder_number}
              </h3>
              <button
                onClick={() => setCancellingSuborder(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              This will cancel the items from <strong>{cancellingSuborder.seller_name}</strong> only. Other items
              in your order will not be cancelled.
            </p>

            <form onSubmit={submitSuborderCancellation} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Reason for Cancellation</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Changed my mind, found another alternative on campus"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingSuborder(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {reportingSuborder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-900 text-base">
                Report Issue with {reportingSuborder.seller_name}
              </h3>
              <button
                onClick={() => setReportingSuborder(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitIssueReport} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                >
                  <option value="item_not_received">Item Not Received</option>
                  <option value="wrong_item">Wrong Item Delivered</option>
                  <option value="damaged">Damaged or Defective Item</option>
                  <option value="seller_unresponsive">Seller Unresponsive</option>
                  <option value="delivery_dispute">Delivery Fee / Location Dispute</option>
                  <option value="other">Other Concern</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Describe the Issue</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide details about what happened..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setReportingSuborder(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReporting}
                  className="px-4 py-2 bg-[#a14b58] hover:bg-[#863b48] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isReporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
