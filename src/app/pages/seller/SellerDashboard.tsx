/**
 * ==============================================================================
 * SELLER DASHBOARD & STORE STUDIO (SellerDashboard.tsx)
 * ==============================================================================
 * This component is the operational command center for student sellers on Unimart.
 *
 * Core Capabilities:
 * 1. Security & KYC Verification Gating:
 *    - If an unverified user visits, checks `user.role` and `kycStatus`.
 *    - Buyers are guided to the `/kyc?mode=buyer_upgrade` flow.
 *    - Pending sellers see a "KYC Under Review" notice.
 *
 * 2. Three Interactive Tabs:
 *    - Tab 1: "Post Ad"
 *      Enforces at least 2 product photos, product condition (New, Used, Refurbished),
 *      and submits ads to the Admin Approval queue with `pending_approval` status.
 *    - Tab 2: "My Listings"
 *      Shows all items listed by this seller, their live status (Live, Pending, Rejected),
 *      and any rejection feedback from administrators.
 *    - Tab 3: "Orders Received"
 *      Displays incoming orders, products bought, buyer contact, and enables the
 *      seller to advance the order status:
 *        `Pending -> Processing -> Ready for Pickup -> Completed`
 *      Updates synchronize directly with the Buyer's Order Tracker in real time!
 * ==============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router';
import {
  PackagePlus, ListOrdered, ShoppingBag, Upload, Image as ImageIcon,
  X, Info, ShieldCheck, CheckCircle2, Clock, XCircle, Package,
  TruckIcon, ChevronDown, Store, AlertTriangle, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../../context/UserContext';
import { useKYC } from '../../context/KYCContext';
import { api } from '../../../lib/api';

type SellerTab = 'post' | 'listings' | 'orders';

const STATUS_STEPS = ['pending', 'processing', 'ready_for_pickup', 'completed'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  processing: <Package className="w-4 h-4" />,
  ready_for_pickup: <TruckIcon className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

export const SellerDashboard: React.FC = () => {
  const { user, updateProfile } = useUser();
  const { kycStatus } = useKYC();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SellerTab>('post');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please sign in.</p>
      </div>
    );
  }

  // ── Buyer trying to access ──
  if (user.role === 'Buyer') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-[#fcf6f7] rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Store className="w-10 h-10 text-[#a14b58]" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">Become a Seller</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Upgrade your account to start selling on Unimart. KYC verification is required.
        </p>
        <button
          onClick={() => navigate('/kyc?mode=buyer_upgrade')}
          className="px-10 py-4 bg-[#a14b58] text-white rounded-2xl font-black text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833]"
        >
          Start Seller Upgrade
        </button>
      </div>
    );
  }

  // ── Seller KYC pending ──
  if (kycStatus === 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">KYC Under Review</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Your identity verification is being reviewed. You'll be able to post ads once approved (typically 24–48 hours).
        </p>
      </div>
    );
  }

  // ── KYC not done yet — redirect ──
  if (kycStatus === 'none') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-[#fcf6f7] rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-10 h-10 text-[#a14b58]" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">Verify Your Identity First</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Complete a one-time KYC verification to start posting ads on Unimart.
        </p>
        <button
          onClick={() => navigate('/kyc')}
          className="px-10 py-4 bg-[#a14b58] text-white rounded-2xl font-black text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833]"
        >
          Complete KYC Verification
        </button>
      </div>
    );
  }

  const tabs: { key: SellerTab; label: string; icon: React.ReactNode }[] = [
    { key: 'post', label: 'Post Ad', icon: <PackagePlus className="w-4 h-4" /> },
    { key: 'listings', label: 'My Listings', icon: <ListOrdered className="w-4 h-4" /> },
    { key: 'orders', label: 'Orders Received', icon: <ShoppingBag className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-[#fcf6f7] rounded-2xl flex items-center justify-center text-[#a14b58]">
          <Store className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Seller Dashboard</h1>
          <p className="text-sm text-gray-500">{user.businessName || user.name}'s Store</p>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-100 text-sm font-bold">
          <ShieldCheck className="w-4 h-4" />
          KYC Verified
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === tab.key
                ? 'bg-white text-[#a14b58] shadow-md border border-[#f3d7db]'
                : 'text-gray-500 hover:text-[#a14b58]'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'post' && <PostAdTab user={user} />}
          {activeTab === 'listings' && <MyListingsTab user={user} />}
          {activeTab === 'orders' && <SellerOrdersTab user={user} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// POST AD TAB
// ════════════════════════════════════════════════════════════════════════════
const PostAdTab: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    price: '',
    oldPrice: '',
    category: '',
    description: '',
    condition: 'New',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - images.length;
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages(prev => [...prev, ...toAdd]);
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length < 2) {
      toast.error('Please upload at least 2 product images.');
      return;
    }
    if (!form.title || !form.price || !form.category) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/products/', {
        title: form.title,
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        category: form.category,
        condition: form.condition,
        description: form.description,
        image: images[0].preview,
        status: 'pending_approval',
        seller_email: user.email,
        seller_name: user.name,
      });
      toast.success('Ad submitted for admin review!');
      setForm({ title: '', price: '', oldPrice: '', category: '', description: '', condition: 'New' });
      setImages([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit ad.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Approval Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
        <p>Your ad will be reviewed by the Unimart admin team before going live. This usually takes a few hours.</p>
      </div>

      {/* Image Upload */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <h2 className="text-lg font-black mb-2 flex items-center gap-2 text-gray-900">
          <ImageIcon className="w-5 h-5 text-[#a14b58]" />
          Product Photos <span className="text-xs font-normal text-gray-400 ml-1">(min. 2 required)</span>
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
          {images.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 group">
              <img src={img.preview} alt="" className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-[#a14b58] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">Cover</span>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <label
              onClick={() => fileRef.current?.click()}
              className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#a14b58] hover:bg-[#fcf6f7] transition-all group"
            >
              <Upload className="w-6 h-6 text-gray-300 group-hover:text-[#a14b58] mb-1" />
              <span className="text-[9px] font-bold text-gray-400 group-hover:text-[#a14b58]">Add Photo</span>
              <input ref={fileRef} type="file" className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
            </label>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <Info className="w-3 h-3" />
          First image will be the cover. At least 2 required.
        </p>
      </div>

      {/* Details */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-5">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <PackagePlus className="w-5 h-5 text-[#a14b58]" />
          Item Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Samsung Galaxy A54 — 128GB"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">Sale Price (GH₵) *</label>
            <input
              type="number"
              required
              min="1"
              placeholder="0.00"
              value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">Original / Regular Price (GH₵) (Optional)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 150 (shows discount banner)"
              value={form.oldPrice}
              onChange={e => setForm(p => ({ ...p, oldPrice: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
            />
            {form.oldPrice && Number(form.oldPrice) > Number(form.price) && (
              <span className="text-[11px] font-bold text-green-600 block mt-1">
                ✓ {Math.round(((Number(form.oldPrice) - Number(form.price)) / Number(form.oldPrice)) * 100)}% OFF Discount Banner will show on this ad
              </span>
            )}
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Category *</label>
            <select
              required
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none appearance-none"
            >
              <option value="">Select Category</option>
              <option value="electronics">Electronics</option>
              <option value="books">Textbooks</option>
              <option value="fashion">Fashion & Clothing</option>
              <option value="home">Hostel Essentials</option>
              <option value="sports">Sports & Fitness</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Condition *</label>
            <div className="grid grid-cols-3 gap-3">
              {['New', 'Used', 'Refurbished'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, condition: c }))}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    form.condition === c
                      ? 'border-[#a14b58] bg-[#fcf6f7] text-[#a14b58]'
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-[#f3d7db]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Description</label>
            <textarea
              rows={4}
              placeholder="Describe the item — condition, features, reason for selling..."
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none resize-none"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-rose-50/70 rounded-2xl border border-[#f3d7db] text-xs text-gray-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#a14b58] shrink-0 mt-0.5" />
        <p>
          Before submitting, confirm that this ad complies with Unimart&apos;s{' '}
          <Link to="/legal/acceptable-use" target="_blank" className="text-[#a14b58] font-bold underline hover:text-[#883d49]">
            Acceptable Use and Prohibited Products Policy
          </Link>{' '}
          and{' '}
          <Link to="/legal/seller-agreement" target="_blank" className="text-[#a14b58] font-bold underline hover:text-[#883d49]">
            Seller Agreement
          </Link>. All listings remain pending until approved by platform administrators.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-[#a14b58] text-white rounded-2xl font-black text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833] disabled:opacity-70 flex items-center justify-center gap-2"
      >
        {submitting
          ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <><PackagePlus className="w-5 h-5" /> Submit Ad for Review</>
        }
      </button>
    </form>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MY LISTINGS TAB
// ════════════════════════════════════════════════════════════════════════════
const MyListingsTab: React.FC<{ user: any }> = ({ user }) => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load products from localStorage, filter by seller email
    try {
      const stored = JSON.parse(localStorage.getItem('unimart_products_store') || '[]');
      const mine = stored.filter((p: any) => p.seller_email === user.email || p.seller?.name === user.name);
      setListings(mine);
    } catch { setListings([]); }
    setLoading(false);
  }, [user]);

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending_approval: { label: 'Pending Review', color: 'bg-amber-50 text-amber-700 border-amber-100' },
    live: { label: 'Live', color: 'bg-green-50 text-green-700 border-green-100' },
    rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-100' },
  };

  if (loading) return <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  if (listings.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
        <ListOrdered className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <h3 className="font-bold text-gray-900 mb-2">No listings yet</h3>
        <p className="text-gray-400 text-sm">Post your first ad using the "Post Ad" tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {listings.map((listing, i) => {
        const cfg = statusConfig[listing.status] || statusConfig['pending_approval'];
        return (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex gap-4 items-start">
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
              <img src={listing.image} alt={listing.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <h3 className="font-black text-gray-900">{listing.name || listing.title}</h3>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-[#a14b58] font-black mt-1">GH₵{listing.price?.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{listing.condition} • {listing.category}</p>
              {listing.rejectionReason && (
                <p className="text-xs text-red-600 mt-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                  Rejection reason: {listing.rejectionReason}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SELLER ORDERS TAB
// ════════════════════════════════════════════════════════════════════════════
const SellerOrdersTab: React.FC<{ user: any }> = ({ user }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadOrders = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('unimart_orders_store') || '[]');
      // Show all orders (in a real app would filter by seller)
      setOrders(stored);
    } catch { setOrders([]); }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    // Poll every 15 seconds for real-time updates
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const stored = JSON.parse(localStorage.getItem('unimart_orders_store') || '[]');
      const updated = stored.map((o: any) =>
        String(o.id) === String(orderId)
          ? {
              ...o,
              status: newStatus,
              statusHistory: [...(o.statusHistory || []), { status: newStatus, timestamp: new Date().toISOString() }]
            }
          : o
      );
      localStorage.setItem('unimart_orders_store', JSON.stringify(updated));
      setOrders(updated);
      toast.success(`Order status updated to "${STATUS_LABELS[newStatus]}"`);
    } catch {
      toast.error('Failed to update order status.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
        <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <h3 className="font-bold text-gray-900 mb-2">No orders yet</h3>
        <p className="text-gray-400 text-sm">Orders from buyers will appear here when they come in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {orders.map((order) => {
        const nextStatus = STATUS_STEPS[STATUS_STEPS.indexOf(order.status) + 1];
        return (
          <div key={order.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <p className="font-black text-gray-900">Order #{order.id}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                  order.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                  order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                  'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {STATUS_ICONS[order.status]}
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 pb-4 border-b border-gray-100 mb-4">
              {(order.items || []).map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.quantity}× {item.product_title || item.name || `Product #${item.product_id}`}</span>
                  <span className="font-bold text-gray-900">GH₵{(item.price_at_purchase * item.quantity || item.total_price || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400">Buyer</p>
                <p className="font-bold text-gray-700 text-sm">{order.buyer_name || order.full_name || 'Student Buyer'}</p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  to={`/help/report?orderId=${order.id}&role=seller`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:text-[#a14b58] hover:border-[#a14b58] text-xs font-semibold transition-colors bg-gray-50/50 hover:bg-rose-50/50"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Report Buyer</span>
                </Link>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-black text-[#a14b58]">GH₵{order.total_amount?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Status Update */}
            {nextStatus && order.status !== 'cancelled' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => updateStatus(String(order.id), nextStatus)}
                  disabled={updating === String(order.id)}
                  className="w-full py-3 bg-[#a14b58] text-white rounded-xl font-bold text-sm hover:bg-[#863b48] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {updating === String(order.id)
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <>Mark as "{STATUS_LABELS[nextStatus]}" <ChevronDown className="w-4 h-4 rotate-[-90deg]" /></>
                  }
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
