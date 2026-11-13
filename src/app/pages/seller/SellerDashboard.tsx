/**
 * ==============================================================================
 * SELLER DASHBOARD & STORE STUDIO (SellerDashboard.tsx)
 * ==============================================================================
 * Operational command center for verified student sellers backed 100% by Django
 * REST endpoints (`GET/POST/PATCH /api/products/`, `PATCH /api/products/<id>/stock/`,
 * `GET/PATCH /api/orders/?role=seller`, and `/api/messages/`).
 * ==============================================================================
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router';
import {
  PackagePlus,
  ListOrdered,
  ShoppingBag,
  MessageSquare,
  Upload,
  Image as ImageIcon,
  X,
  Info,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  TruckIcon,
  Truck,
  ChevronDown,
  Store,
  AlertTriangle,
  Edit3,
  RefreshCw,
  LifeBuoy,
  MapPin,
  Calendar,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../../context/UserContext';
import { useKYC } from '../../context/KYCContext';
import { api } from '../../../lib/api';
import { ImageWithFallback } from '../../components/common/ImageWithFallback';
import { ConversationInbox } from '../../components/Chat/ConversationInbox';
import { formatStockStatus, isLegacyBlobUrl, prepareImageForUpload } from '../../../lib/inventory';

type SellerTab = 'post' | 'listings' | 'orders' | 'delivery' | 'messages';

const STATUS_STEPS = ['pending', 'processing', 'ready_for_pickup', 'completed'];

const normalizeOrderStatus = (s: string) => {
  if (s === 'paid') return 'processing';
  if (s === 'shipped') return 'ready_for_pickup';
  return s;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Processing',
  processing: 'Processing',
  shipped: 'Ready for Pickup',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  paid: <Package className="w-4 h-4" />,
  processing: <Package className="w-4 h-4" />,
  shipped: <TruckIcon className="w-4 h-4" />,
  ready_for_pickup: <TruckIcon className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

const CATEGORY_OPTIONS = [
  { value: 'groceries', label: 'Groceries' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'beauty-cosmetics', label: 'Beauty and Cosmetics' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'others', label: 'Others' },
];

async function uploadSelectedPhotos(files: File[]): Promise<string[]> {
  const preparedFiles: File[] = [];
  for (const file of files) {
    preparedFiles.push(await prepareImageForUpload(file, { maxDimension: 1280, quality: 0.84 }));
  }
  const fd = new FormData();
  preparedFiles.forEach((f) => fd.append('files', f));
  const res = await api.upload<{ url: string; urls: string[] }>('/media/upload/?kind=product', fd);
  const urls = Array.isArray(res?.urls) && res.urls.length > 0 ? res.urls : res?.url ? [res.url] : [];
  if (urls.length === 0) {
    throw new Error('Server did not return uploaded image URLs.');
  }
  return urls;
}

export const SellerDashboard: React.FC = () => {
  const { user } = useUser();
  const { kycStatus } = useKYC();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SellerTab>('post');
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user || user.role === 'Buyer') return;
    api
      .get<{ unread_count: number }>('/messages/unread-count/')
      .then((res) => {
        if (typeof res?.unread_count === 'number') setUnreadMessages(res.unread_count);
      })
      .catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please sign in.</p>
      </div>
    );
  }

  // Buyer trying to access seller tools
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
          className="px-10 py-4 bg-[#a14b58] text-white rounded-2xl font-black text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833] cursor-pointer"
        >
          Start Seller Upgrade
        </button>
      </div>
    );
  }

  // Seller KYC pending
  if (kycStatus === 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">KYC Under Review</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Your identity verification is being reviewed. You&apos;ll be able to post ads once approved (typically 24–48 hours).
        </p>
      </div>
    );
  }

  // KYC not done yet — redirect
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
          className="px-10 py-4 bg-[#a14b58] text-white rounded-2xl font-black text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833] cursor-pointer"
        >
          Complete KYC Verification
        </button>
      </div>
    );
  }

  const tabs: { key: SellerTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'post', label: 'Post Ad', icon: <PackagePlus className="w-4 h-4" /> },
    { key: 'listings', label: 'My Listings', icon: <ListOrdered className="w-4 h-4" /> },
    { key: 'orders', label: 'Orders', icon: <ShoppingBag className="w-4 h-4" /> },
    { key: 'delivery', label: 'Delivery Settings', icon: <Truck className="w-4 h-4" /> },
    { key: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, badge: unreadMessages },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-[#fcf6f7] rounded-2xl flex items-center justify-center text-[#a14b58] shrink-0">
          <Store className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Seller Dashboard</h1>
          <p className="text-sm text-gray-500">{user.businessName || user.name}&apos;s Store</p>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-100 text-sm font-bold">
          <ShieldCheck className="w-4 h-4" />
          KYC Verified
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer relative ${
              activeTab === tab.key
                ? 'bg-white text-[#a14b58] shadow-md border border-[#f3d7db]'
                : 'text-gray-500 hover:text-[#a14b58]'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge && tab.badge > 0 ? (
              <span className="min-w-[18px] h-[18px] px-1 bg-[#a14b58] text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            ) : null}
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
          {activeTab === 'post' && (
            <PostAdTab
              user={user}
              onCreated={() => setActiveTab('listings')}
            />
          )}
          {activeTab === 'listings' && <MyListingsTab user={user} />}
          {activeTab === 'orders' && <SellerOrdersTab />}
          {activeTab === 'delivery' && <SellerDeliveryTab />}
          {activeTab === 'messages' && (
            <ConversationInbox
              mode="seller"
              emptyTitle="No buyer messages yet"
              emptySubtitle="Messages from interested students about your listings will appear here."
              onUnreadChange={setUnreadMessages}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ==============================================================================
// POST AD TAB
// ==============================================================================
const PostAdTab: React.FC<{ user: any; onCreated: () => void }> = ({ user, onCreated }) => {
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    price: '',
    oldPrice: '',
    stock: '1',
    category: '',
    description: '',
    condition: 'New',
    override_delivery_settings: false,
    delivery_methods: ['personal_delivery', 'buyer_collection'] as string[],
    delivery_coverage: 'same_campus',
    delivery_fee_type: 'fixed',
    base_delivery_fee: '0.00',
    collection_location: '',
    preparation_time: 'Same Day',
    delivery_instructions: '',
  });

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - images.length;
    const accepted: { file: File; preview: string }[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" is not a valid image file.`);
        continue;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
    }
    setImages((prev) => [...prev, ...accepted]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.is_email_verified === false) {
      toast.error('Please verify your email address before posting listings.');
      return;
    }
    if (images.length < 2) {
      toast.error('Please upload at least 2 real product photos.');
      return;
    }
    const stockInt = Math.floor(Number(form.stock));
    if (!Number.isFinite(stockInt) || stockInt < 1) {
      toast.error('Available stock must be at least 1 unit.');
      return;
    }
    if (!form.title.trim() || !form.price || !form.category) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const uploadedUrls = await uploadSelectedPhotos(images.map((i) => i.file));
      const payload: Record<string, any> = {
        title: form.title.trim(),
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        stock: stockInt,
        category: form.category,
        condition: form.condition,
        description: form.description.trim(),
        image: uploadedUrls[0],
        images: uploadedUrls,
        override_delivery_settings: form.override_delivery_settings,
      };

      if (form.override_delivery_settings) {
        payload.delivery_methods = form.delivery_methods;
        payload.delivery_coverage = form.delivery_coverage;
        payload.delivery_fee_type = form.delivery_fee_type;
        payload.base_delivery_fee = Number(form.base_delivery_fee || 0);
        payload.collection_location = form.collection_location.trim();
        payload.preparation_time = form.preparation_time;
        payload.delivery_instructions = form.delivery_instructions.trim();
      }

      await api.post('/products/', payload);
      toast.success('Ad submitted for admin review! You can track it in My Listings.');
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
      setForm({
        title: '',
        price: '',
        oldPrice: '',
        stock: '1',
        category: '',
        description: '',
        condition: 'New',
        override_delivery_settings: false,
        delivery_methods: ['personal_delivery', 'buyer_collection'],
        delivery_coverage: 'same_campus',
        delivery_fee_type: 'fixed',
        base_delivery_fee: '0.00',
        collection_location: '',
        preparation_time: 'Same Day',
        delivery_instructions: '',
      });
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit ad.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Approval Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
        <p>Your ad will be reviewed by the Unimart admin team before going live in the public shop.</p>
      </div>

      {/* Image Upload */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <h2 className="text-lg font-black mb-2 flex items-center gap-2 text-gray-900">
          <ImageIcon className="w-5 h-5 text-[#a14b58]" />
          Product Photos <span className="text-xs font-normal text-gray-400 ml-1">(min. 2 required, up to 5)</span>
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
          {images.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 group">
              <img src={img.preview} alt="" className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-[#a14b58] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center sm:opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <label className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#a14b58] hover:bg-[#fcf6f7] transition-all group">
              <Upload className="w-6 h-6 text-gray-300 group-hover:text-[#a14b58] mb-1" />
              <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#a14b58]">Add Photo</span>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
              />
            </label>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <Info className="w-3 h-3 shrink-0" />
          Photos are uploaded securely so buyers on every device see crisp images.
        </p>
      </div>

      {/* Details */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-5">
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
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">Sale Price (GH₵) *</label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">Available Stock / Units *</label>
            <input
              type="number"
              required
              min="1"
              step="1"
              placeholder="e.g. 5"
              value={form.stock}
              onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
            />
            <p className="text-[11px] text-gray-400">
              Deducted only when you confirm an order as Completed.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">Original Price (GH₵) (Optional)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="e.g. 150 (shows discount banner)"
              value={form.oldPrice}
              onChange={(e) => setForm((p) => ({ ...p, oldPrice: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
            />
            {form.oldPrice && Number(form.oldPrice) > Number(form.price) && (
              <span className="text-[11px] font-bold text-green-600 block mt-1">
                {Math.round(((Number(form.oldPrice) - Number(form.price)) / Number(form.oldPrice)) * 100)}% OFF Discount Banner will show
              </span>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">Category *</label>
            <select
              required
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
            >
              <option value="">Select Category</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-bold text-gray-700">Condition *</label>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {['New', 'Like New', 'Good', 'Fair'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, condition: c }))}
                  className={`py-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all cursor-pointer ${
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
              placeholder="Describe the item — condition, specs, campus pickup spot..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Optional Delivery Settings Override */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#a14b58]" />
              Fulfilment & Delivery Preferences
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              By default, this item uses your store-wide settings from the Delivery Settings tab.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
            <input
              type="checkbox"
              checked={form.override_delivery_settings}
              onChange={(e) => setForm((p) => ({ ...p, override_delivery_settings: e.target.checked }))}
              className="w-4 h-4 text-[#a14b58] rounded border-gray-300 focus:ring-[#a14b58]"
            />
            Custom settings for this item
          </label>
        </div>

        {form.override_delivery_settings && (
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Available Handover Methods *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'personal_delivery', label: 'Personal Delivery (In-Person)' },
                  { id: 'buyer_collection', label: 'Buyer Collection / Pickup' },
                  { id: 'campus_courier', label: 'Campus Courier Service' },
                ].map((m) => {
                  const checked = form.delivery_methods.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setForm((p) => {
                          const exists = p.delivery_methods.includes(m.id);
                          const updated = exists
                            ? p.delivery_methods.filter((x) => x !== m.id)
                            : [...p.delivery_methods, m.id];
                          return { ...p, delivery_methods: updated.length ? updated : [m.id] };
                        });
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        checked
                          ? 'border-[#a14b58] bg-[#fcf6f7] text-[#a14b58]'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Base Delivery Fee (GH₵)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.base_delivery_fee}
                  onChange={(e) => setForm((p) => ({ ...p, base_delivery_fee: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Campus Coverage</label>
                <select
                  value={form.delivery_coverage}
                  onChange={(e) => setForm((p) => ({ ...p, delivery_coverage: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none"
                >
                  <option value="same_campus">My Campus Only</option>
                  <option value="cross_campus">Cross-Campus Allowed</option>
                  <option value="all">Any Campus / All Regions</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Prep / Dispatch Time</label>
                <select
                  value={form.preparation_time}
                  onChange={(e) => setForm((p) => ({ ...p, preparation_time: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none"
                >
                  <option value="Same Day">Same Day</option>
                  <option value="1-2 Days">1-2 Days</option>
                  <option value="3-5 Days">3-5 Days</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Collection / Pickup Location (if applicable)</label>
              <input
                type="text"
                value={form.collection_location}
                onChange={(e) => setForm((p) => ({ ...p, collection_location: e.target.value }))}
                placeholder="e.g. Unity Hall Forecourt / Central Library"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-rose-50/70 rounded-2xl border border-[#f3d7db] text-xs text-gray-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#a14b58] shrink-0 mt-0.5" />
        <p>
          Before submitting, confirm this ad complies with Unimart&apos;s{' '}
          <Link to="/legal/acceptable-use" target="_blank" className="text-[#a14b58] font-bold underline">
            Acceptable Use Policy
          </Link>{' '}
          and{' '}
          <Link to="/legal/seller-agreement" target="_blank" className="text-[#a14b58] font-bold underline">
            Seller Agreement
          </Link>.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-[#a14b58] text-white rounded-2xl font-black text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833] disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
      >
        {submitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <PackagePlus className="w-5 h-5" /> Submit Ad for Review
          </>
        )}
      </button>
    </form>
  );
};

// ==============================================================================
// MY LISTINGS TAB (Real DB + Quick Stock Update + Full Edit Modal)
// ==============================================================================
const MyListingsTab: React.FC<{ user: any }> = ({ user }) => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({});
  const [savingStockId, setSavingStockId] = useState<number | null>(null);

  // Full Edit Listing Modal state
  const [editingListing, setEditingListing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    price: '',
    oldPrice: '',
    stock: '1',
    category: 'others',
    condition: 'Like New',
    description: '',
    override_delivery_settings: false,
    delivery_methods: ['personal_delivery', 'buyer_collection'] as string[],
    delivery_coverage: 'same_campus',
    delivery_fee_type: 'fixed',
    base_delivery_fee: '0.00',
    collection_location: '',
    preparation_time: 'Same Day',
    delivery_instructions: '',
  });
  const [editExistingUrls, setEditExistingUrls] = useState<string[]>([]);
  const [editNewImages, setEditNewImages] = useState<{ file: File; preview: string }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/products/?mine=true');
      const items = Array.isArray(data) ? data : data?.results || [];
      setListings(items);
      const initialStocks: Record<number, string> = {};
      items.forEach((p: any) => {
        initialStocks[p.id] = String(p.stock ?? 0);
      });
      setStockEdits(initialStocks);
    } catch (err: any) {
      setError(err?.message || 'Unable to load your product listings.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleQuickStockSave = async (listingId: number) => {
    const val = Math.floor(Number(stockEdits[listingId]));
    if (!Number.isFinite(val) || val < 0) {
      toast.error('Stock must be 0 or higher.');
      return;
    }
    setSavingStockId(listingId);
    try {
      const updated = await api.patch(`/products/${listingId}/stock/`, { stock: val });
      setListings((prev) => prev.map((p) => (p.id === listingId ? updated : p)));
      toast.success(`Inventory updated to ${val} unit${val === 1 ? '' : 's'}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update stock.');
    } finally {
      setSavingStockId(null);
    }
  };

  const openEditModal = (listing: any) => {
    setEditingListing(listing);
    setEditForm({
      title: listing.title || listing.name || '',
      price: String(listing.price || ''),
      oldPrice: listing.oldPrice ? String(listing.oldPrice) : listing.old_price ? String(listing.old_price) : '',
      stock: String(listing.stock ?? 1),
      category: listing.category || 'others',
      condition: listing.condition || 'Like New',
      description: listing.description || '',
      override_delivery_settings: Boolean(listing.override_delivery_settings),
      delivery_methods: Array.isArray(listing.delivery_methods) && listing.delivery_methods.length > 0 ? listing.delivery_methods : ['personal_delivery', 'buyer_collection'],
      delivery_coverage: listing.delivery_coverage || 'same_campus',
      delivery_fee_type: listing.delivery_fee_type || 'fixed',
      base_delivery_fee: String(listing.base_delivery_fee ?? '0.00'),
      collection_location: listing.collection_location || '',
      preparation_time: listing.preparation_time || 'Same Day',
      delivery_instructions: listing.delivery_instructions || '',
    });
    const rawGallery = Array.isArray(listing.images) && listing.images.length > 0 ? listing.images : [listing.image];
    const validUrls = rawGallery.filter((u: any) => typeof u === 'string' && u.trim() && !isLegacyBlobUrl(u));
    setEditExistingUrls(validUrls);
    setEditNewImages([]);
  };

  const closeEditModal = () => {
    editNewImages.forEach((i) => URL.revokeObjectURL(i.preview));
    setEditNewImages([]);
    setEditingListing(null);
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalCount = editExistingUrls.length + editNewImages.length;
    const remaining = Math.max(0, 5 - totalCount);
    const added = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setEditNewImages((prev) => [...prev, ...added]);
    e.target.value = '';
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    const totalImages = editExistingUrls.length + editNewImages.length;
    if (totalImages === 0) {
      toast.error('Please keep or upload at least 1 valid product photo.');
      return;
    }
    const stockVal = Math.floor(Number(editForm.stock));
    if (!Number.isFinite(stockVal) || stockVal < 0) {
      toast.error('Please enter a valid stock quantity.');
      return;
    }

    setSavingEdit(true);
    try {
      let uploadedNewUrls: string[] = [];
      if (editNewImages.length > 0) {
        uploadedNewUrls = await uploadSelectedPhotos(editNewImages.map((i) => i.file));
      }
      const finalImages = [...editExistingUrls, ...uploadedNewUrls];

      const payload: Record<string, any> = {
        title: editForm.title.trim(),
        price: Number(editForm.price),
        oldPrice: editForm.oldPrice ? Number(editForm.oldPrice) : null,
        stock: stockVal,
        category: editForm.category,
        condition: editForm.condition,
        description: editForm.description.trim(),
        image: finalImages[0],
        images: finalImages,
        override_delivery_settings: editForm.override_delivery_settings,
      };

      if (editForm.override_delivery_settings) {
        payload.delivery_methods = editForm.delivery_methods;
        payload.delivery_coverage = editForm.delivery_coverage;
        payload.delivery_fee_type = editForm.delivery_fee_type;
        payload.base_delivery_fee = Number(editForm.base_delivery_fee || 0);
        payload.collection_location = editForm.collection_location.trim();
        payload.preparation_time = editForm.preparation_time;
        payload.delivery_instructions = editForm.delivery_instructions.trim();
      }

      const updated = await api.patch(`/products/${editingListing.id}/`, payload);

      setListings((prev) => prev.map((p) => (p.id === editingListing.id ? updated : p)));
      setStockEdits((prev) => ({ ...prev, [editingListing.id]: String(updated.stock ?? stockVal) }));
      toast.success('Listing updated and submitted for admin moderation review.');
      closeEditModal();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save listing updates.');
    } finally {
      setSavingEdit(false);
    }
  };

  const getBadgeConfig = (listing: any) => {
    if (listing.status === 'live') {
      return { label: 'Approved / Live', color: 'bg-green-50 text-green-700 border-green-200' };
    }
    if (listing.status === 'pending_approval' && listing.is_resubmitted) {
      return { label: 'Resubmitted / Pending Review', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (listing.status === 'pending_approval') {
      return { label: 'Pending Approval', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (listing.status === 'rejected') {
      return { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' };
    }
    if (listing.status === 'flagged') {
      return { label: 'Flagged', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    }
    return { label: 'Hidden', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-red-100">
        <p className="font-bold text-red-600 mb-2">Unable to load listings</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={loadListings}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#a14b58] text-white rounded-xl text-sm font-bold cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
        <ListOrdered className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <h3 className="font-bold text-gray-900 mb-2">No listings yet</h3>
        <p className="text-gray-400 text-sm">Post your first ad using the &ldquo;Post Ad&rdquo; tab.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {listings.length} Listing{listings.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={loadListings}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#a14b58] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="space-y-4">
        {listings.map((listing) => {
          const cfg = getBadgeConfig(listing);
          const stockStatus = formatStockStatus(listing.stock);
          const hasLegacyBlob = isLegacyBlobUrl(listing.image);

          return (
            <div
              key={listing.id}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-start"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-gray-100 border border-gray-100">
                <ImageWithFallback
                  src={listing.image}
                  alt={listing.title || listing.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h3 className="font-black text-gray-900 text-base">
                    {listing.title || listing.name}
                  </h3>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <p className="text-[#a14b58] font-black">
                    GH₵{Number(listing.price || 0).toLocaleString()}
                  </p>
                  <span className="text-xs text-gray-400">
                    {listing.condition} • {listing.category_name || listing.category}
                  </span>
                  {stockStatus.isOutOfStock ? (
                    <span className="text-[11px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      Out of stock
                    </span>
                  ) : stockStatus.label ? (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {stockStatus.label}
                    </span>
                  ) : null}
                </div>

                {hasLegacyBlob && (
                  <p className="text-xs text-amber-800 mt-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-semibold">
                    Photo needs re-upload: click &ldquo;Edit Ad&rdquo; to attach persistent product photos.
                  </p>
                )}

                {listing.rejection_reason && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 font-semibold">
                    Rejection feedback: {listing.rejection_reason}
                  </p>
                )}

                {listing.flag_reason && (
                  <p className="text-xs text-orange-700 mt-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100 font-semibold">
                    Flag note: {listing.flag_reason}
                  </p>
                )}

                {/* Controls Row: Quick Stock Adjustment + Edit Listing */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-500">Stock:</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={stockEdits[listing.id] ?? String(listing.stock ?? 0)}
                      onChange={(e) =>
                        setStockEdits((prev) => ({ ...prev, [listing.id]: e.target.value }))
                      }
                      className="w-20 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuickStockSave(listing.id)}
                      disabled={savingStockId === listing.id}
                      className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {savingStockId === listing.id ? 'Saving...' : 'Update Stock'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditModal(listing)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#fcf6f7] hover:bg-rose-100 text-[#a14b58] border border-[#f3d7db] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Ad
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Listing Modal */}
      {editingListing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 my-8 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={closeEditModal}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-gray-900 mb-1">Edit Listing</h3>
            <p className="text-xs text-gray-500 mb-5">
              Edited listings are re-checked by administrators before appearing in the public shop.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Images Manager */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">
                  Product Photos ({editExistingUrls.length + editNewImages.length}/5)
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {editExistingUrls.map((url, idx) => (
                    <div key={`ex-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                      <ImageWithFallback src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditExistingUrls((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {editNewImages.map((img, idx) => (
                    <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#a14b58] group">
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(img.preview);
                          setEditNewImages((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {editExistingUrls.length + editNewImages.length < 5 && (
                    <label className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#a14b58]">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-[9px] font-bold text-gray-400 mt-1">Add</span>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleEditImageSelect}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Price (GH₵) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Old Price</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={editForm.oldPrice}
                    onChange={(e) => setEditForm((p) => ({ ...p, oldPrice: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={editForm.stock}
                    onChange={(e) => setEditForm((p) => ({ ...p, stock: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Category *</label>
                  <select
                    required
                    value={editForm.category}
                    onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Condition</label>
                  <select
                    value={editForm.condition}
                    onChange={(e) => setEditForm((p) => ({ ...p, condition: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none"
                  >
                    {['New', 'Like New', 'Good', 'Fair'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] outline-none resize-none"
                />
              </div>

              {/* Fulfilment Settings Override */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#a14b58]" />
                    <span className="text-xs font-bold text-gray-900">Custom Delivery Preferences</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.override_delivery_settings}
                      onChange={(e) => setEditForm((p) => ({ ...p, override_delivery_settings: e.target.checked }))}
                      className="w-3.5 h-3.5 text-[#a14b58] rounded border-gray-300"
                    />
                    Override default settings
                  </label>
                </div>

                {editForm.override_delivery_settings && (
                  <div className="pt-2 space-y-3 border-t border-gray-200 text-xs">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1.5">Handover Methods</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'personal_delivery', label: 'Personal Delivery' },
                          { id: 'buyer_collection', label: 'Buyer Collection' },
                          { id: 'campus_courier', label: 'Campus Courier' },
                        ].map((m) => {
                          const checked = editForm.delivery_methods.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setEditForm((p) => {
                                  const exists = p.delivery_methods.includes(m.id);
                                  const updated = exists
                                    ? p.delivery_methods.filter((x) => x !== m.id)
                                    : [...p.delivery_methods, m.id];
                                  return { ...p, delivery_methods: updated.length ? updated : [m.id] };
                                });
                              }}
                              className={`p-2 rounded-lg border text-[11px] font-bold text-center transition-all cursor-pointer ${
                                checked
                                  ? 'border-[#a14b58] bg-[#fcf6f7] text-[#a14b58]'
                                  : 'border-gray-200 bg-white text-gray-600'
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Base Fee (GH₵)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={editForm.base_delivery_fee}
                          onChange={(e) => setEditForm((p) => ({ ...p, base_delivery_fee: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Coverage</label>
                        <select
                          value={editForm.delivery_coverage}
                          onChange={(e) => setEditForm((p) => ({ ...p, delivery_coverage: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        >
                          <option value="same_campus">Same Campus</option>
                          <option value="cross_campus">Cross Campus</option>
                          <option value="all">Any Campus</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-gray-700 block mb-1">Prep Time</label>
                        <select
                          value={editForm.preparation_time}
                          onChange={(e) => setEditForm((p) => ({ ...p, preparation_time: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                        >
                          <option value="Same Day">Same Day</option>
                          <option value="1-2 Days">1-2 Days</option>
                          <option value="3-5 Days">3-5 Days</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Pickup Location</label>
                      <input
                        type="text"
                        value={editForm.collection_location}
                        onChange={(e) => setEditForm((p) => ({ ...p, collection_location: e.target.value }))}
                        placeholder="e.g. Unity Hall Forecourt"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-3 bg-[#a14b58] hover:bg-[#863b48] text-white font-bold text-sm rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Saving & Resubmitting...' : 'Save & Resubmit Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ==============================================================================
// SELLER DELIVERY & FULFILMENT SETTINGS TAB
// ==============================================================================
const SellerDeliveryTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    offers_personal_delivery: true,
    offers_collection: true,
    offers_courier: false,
    offers_custom: false,
    delivery_coverage: 'within_campus',
    delivery_fee_type: 'fixed',
    base_delivery_fee: '10.00',
    collection_location: '',
    collection_instructions: '',
    available_days_times: '',
    preparation_time: 'same_day',
    custom_prep_time: '',
    delivery_notes: '',
  });

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const data = await api.get<any>('/orders/seller-delivery-settings/');
        if (data) {
          setSettings({
            offers_personal_delivery: data.offers_personal_delivery ?? true,
            offers_collection: data.offers_collection ?? true,
            offers_courier: data.offers_courier ?? false,
            offers_custom: data.offers_custom ?? false,
            delivery_coverage: data.delivery_coverage || 'within_campus',
            delivery_fee_type: data.delivery_fee_type || 'fixed',
            base_delivery_fee: String(data.base_delivery_fee ?? '10.00'),
            collection_location: data.collection_location || '',
            collection_instructions: data.collection_instructions || '',
            available_days_times: data.available_days_times || '',
            preparation_time: data.preparation_time || 'same_day',
            custom_prep_time: data.custom_prep_time || '',
            delivery_notes: data.delivery_notes || '',
          });
        }
      } catch (err: any) {
        toast.error(err?.message || 'Could not load delivery settings.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/orders/seller-delivery-settings/', {
        ...settings,
        base_delivery_fee: Number(settings.base_delivery_fee) || 0,
      });
      toast.success('Store delivery & collection defaults saved successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save delivery settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-xs mt-3">Loading delivery settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-8">
      <div>
        <div className="flex items-center gap-2.5">
          <Truck className="w-5 h-5 text-[#a14b58]" />
          <h2 className="text-xl font-bold text-gray-900">Delivery &amp; Collection Settings</h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Configure how you fulfill orders across your shop. These defaults apply to all your listings unless overridden.
        </p>
      </div>

      {/* Available Fulfilment Methods */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-gray-700 block uppercase tracking-wider">
          Fulfilment Methods Offered
        </label>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.offers_personal_delivery}
              onChange={(e) => setSettings({ ...settings, offers_personal_delivery: e.target.checked })}
              className="w-4 h-4 rounded text-[#a14b58] focus:ring-[#a14b58]"
            />
            <div>
              <span className="font-bold text-gray-900 block">Personal Campus Delivery</span>
              <span className="text-gray-500 text-[11px]">You or an agent deliver directly to buyer on campus</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.offers_collection}
              onChange={(e) => setSettings({ ...settings, offers_collection: e.target.checked })}
              className="w-4 h-4 rounded text-[#a14b58] focus:ring-[#a14b58]"
            />
            <div>
              <span className="font-bold text-gray-900 block">Campus Collection / Pickup</span>
              <span className="text-gray-500 text-[11px]">Buyer meets you at a designated campus location</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.offers_courier}
              onChange={(e) => setSettings({ ...settings, offers_courier: e.target.checked })}
              className="w-4 h-4 rounded text-[#a14b58] focus:ring-[#a14b58]"
            />
            <div>
              <span className="font-bold text-gray-900 block">Third-Party Courier</span>
              <span className="text-gray-500 text-[11px]">Sent via Ghana Post, VIP, or dispatch rider</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.offers_custom}
              onChange={(e) => setSettings({ ...settings, offers_custom: e.target.checked })}
              className="w-4 h-4 rounded text-[#a14b58] focus:ring-[#a14b58]"
            />
            <div>
              <span className="font-bold text-gray-900 block">Custom Arrangement</span>
              <span className="text-gray-500 text-[11px]">Coordinated with buyer on a case-by-case basis</span>
            </div>
          </label>
        </div>
      </div>

      {/* Coverage & Fee Structure */}
      <div className="grid sm:grid-cols-3 gap-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">Delivery Reach</label>
          <select
            value={settings.delivery_coverage}
            onChange={(e) => setSettings({ ...settings, delivery_coverage: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
          >
            <option value="within_campus">Within Campus / Local Campus Area</option>
            <option value="inter_campus">Between Campuses / Tertiary Institutions</option>
            <option value="outside_campus">Outside Campus / Surrounding Metro Area</option>
            <option value="nationwide">Nationwide (Courier Delivery)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">Delivery Pricing Structure</label>
          <select
            value={settings.delivery_fee_type}
            onChange={(e) => setSettings({ ...settings, delivery_fee_type: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
          >
            <option value="fixed">Fixed Rate</option>
            <option value="free">Free Delivery</option>
            <option value="negotiable">Negotiable / Agreed in Chat</option>
            <option value="depends_on_location">Depends on Destination</option>
            <option value="buyer_arranges">Buyer Arranges / Collects Only</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">Standard Base Fee (GH₵)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={settings.base_delivery_fee}
            onChange={(e) => setSettings({ ...settings, base_delivery_fee: e.target.value })}
            disabled={settings.delivery_fee_type === 'free'}
            className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* Campus Pickup Details */}
      <div className="grid sm:grid-cols-2 gap-5 pt-2 border-t border-gray-100">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">Designated Campus Meeting Point</label>
          <input
            type="text"
            placeholder="e.g. Commercial Area / Main Library Entrance"
            value={settings.collection_location}
            onChange={(e) => setSettings({ ...settings, collection_location: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">Available Pickup Days &amp; Hours</label>
          <input
            type="text"
            placeholder="e.g. Mon-Fri 2:00 PM - 6:00 PM"
            value={settings.available_days_times}
            onChange={(e) => setSettings({ ...settings, available_days_times: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">Pickup &amp; Handover Instructions</label>
          <input
            type="text"
            placeholder="e.g. Call or message when arriving; bring exact cash or pay MoMo on spot"
            value={settings.collection_instructions}
            onChange={(e) => setSettings({ ...settings, collection_instructions: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
          />
        </div>
      </div>

      {/* Preparation Time & Terms */}
      <div className="grid sm:grid-cols-2 gap-5 pt-2 border-t border-gray-100">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">Standard Preparation Lead Time</label>
          <select
            value={settings.preparation_time}
            onChange={(e) => setSettings({ ...settings, preparation_time: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
          >
            <option value="same_day">Same Day (Within 12 hours)</option>
            <option value="1_2_days">1 - 2 Business Days</option>
            <option value="3_5_days">3 - 5 Business Days</option>
            <option value="custom">Custom / On Demand</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">Additional Notes or Terms</label>
          <input
            type="text"
            placeholder="e.g. No delivery during lecture hours (9am - 12pm)"
            value={settings.delivery_notes}
            onChange={(e) => setSettings({ ...settings, delivery_notes: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[#a14b58] hover:bg-[#863b48] text-white rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-[#a14b5833] disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving Settings...' : 'Save Delivery Settings'}
        </button>
      </div>
    </form>
  );
};

// ==============================================================================
// SELLER ORDERS TAB (Multi-Vendor Suborders + 12h Deadline + Fulfilment Actions)
// ==============================================================================
const SellerOrdersTab: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Modals state
  const [rejectingSuborder, setRejectingSuborder] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [cancellingSuborder, setCancellingSuborder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [proposingSuborder, setProposingSuborder] = useState<any | null>(null);
  const [proposalData, setProposalData] = useState({
    fulfilment_method: 'personal_delivery',
    proposed_fee: '10.00',
    delivery_location: '',
    estimated_delivery: '',
    notes: '',
  });

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await api.get<any>('/orders/seller-orders/');
      const list = Array.isArray(data) ? data : data?.results || [];
      setOrders(list);
      setError(null);
    } catch (err: any) {
      if (!silent) {
        setError(err?.message || 'Unable to load received orders.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(false);
    const interval = setInterval(() => loadOrders(true), 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Handle Accept Order (within 12h deadline)
  const handleAcceptOrder = async (suborderId: number) => {
    setActionLoadingId(suborderId);
    try {
      await api.post(`/orders/seller-orders/${suborderId}/accept/`);
      toast.success('Order accepted! You can now prepare items and agree on delivery.');
      loadOrders(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept order.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject Order submission
  const submitRejectOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingSuborder || !rejectReason.trim()) {
      toast.error('Please provide a reason for declining.');
      return;
    }
    setActionLoadingId(rejectingSuborder.id);
    try {
      await api.post(`/orders/seller-orders/${rejectingSuborder.id}/reject/`, {
        reason: rejectReason.trim(),
      });
      toast.info(`Order #${rejectingSuborder.suborder_number} declined.`);
      setRejectingSuborder(null);
      setRejectReason('');
      loadOrders(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decline order.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Cancel Order submission
  const submitCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSuborder || !cancelReason.trim()) {
      toast.error('Please provide a cancellation reason.');
      return;
    }
    setActionLoadingId(cancellingSuborder.id);
    try {
      await api.post(`/orders/seller-orders/${cancellingSuborder.id}/cancel/`, {
        reason: cancelReason.trim(),
      });
      toast.info(`Order #${cancellingSuborder.suborder_number} cancelled.`);
      setCancellingSuborder(null);
      setCancelReason('');
      loadOrders(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel order.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Propose Delivery Terms submission
  const submitDeliveryProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingSuborder || !proposalData.delivery_location.trim()) {
      toast.error('Please specify the delivery / meeting location.');
      return;
    }
    setActionLoadingId(proposingSuborder.id);
    try {
      await api.post(`/orders/seller-orders/${proposingSuborder.id}/propose-delivery/`, {
        fulfilment_method: proposalData.fulfilment_method,
        proposed_fee: Number(proposalData.proposed_fee) || 0,
        delivery_location: proposalData.delivery_location.trim(),
        estimated_delivery: proposalData.estimated_delivery.trim(),
        notes: proposalData.notes.trim(),
      });
      toast.success('Delivery proposal sent to buyer! Terms posted to order chat.');
      setProposingSuborder(null);
      loadOrders(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to propose delivery terms.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle status advance (e.g. preparing, ready_for_collection, dispatched, completed)
  const handleUpdateStatus = async (suborderId: number, nextStatus: string) => {
    setActionLoadingId(suborderId);
    try {
      await api.patch(`/orders/seller-orders/${suborderId}/update-status/`, { status: nextStatus });
      toast.success(`Order status updated to "${nextStatus.replace(/_/g, ' ')}"!`);
      loadOrders(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update order status.');
    } finally {
      setActionLoadingId(null);
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

  // Filter orders
  const filteredOrders = orders.filter((sub) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return sub.status === 'pending_response';
    if (filterStatus === 'active') {
      return ['accepted', 'awaiting_delivery_agreement', 'preparing', 'ready_for_collection', 'dispatched', 'delivered'].includes(sub.status);
    }
    if (filterStatus === 'completed') return sub.status === 'completed';
    if (filterStatus === 'cancelled') return ['cancelled', 'rejected', 'issue_reported'].includes(sub.status);
    return true;
  });

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-xs mt-3">Loading your seller orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-red-100 shadow-sm">
        <p className="font-bold text-red-600 mb-2">Unable to load orders</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => loadOrders(false)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#a14b58] text-white rounded-xl text-sm font-bold cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Suborders Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {[
            { key: 'all', label: `All (${orders.length})` },
            { key: 'pending', label: `Pending Response (${orders.filter((o) => o.status === 'pending_response').length})` },
            { key: 'active', label: 'Preparing / Active' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled / Declined' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterStatus === tab.key
                  ? 'bg-[#a14b58] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => loadOrders(false)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
          title="Refresh orders"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-1">No orders found</h3>
          <p className="text-gray-400 text-xs">Orders matching this filter will appear here.</p>
        </div>
      ) : (
        filteredOrders.map((sub) => {
          const deadlineText =
            sub.status === 'pending_response'
              ? calculateHoursRemaining(sub.seller_response_deadline)
              : null;
          const statusConfig = SUBORDER_STATUS_MAP[sub.status] || {
            label: sub.status,
            color: 'bg-gray-100 text-gray-700 border-gray-200',
          };

          return (
            <div
              key={sub.id}
              className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4 hover:border-gray-300 transition-colors"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-gray-900 text-base">
                      Order #{sub.suborder_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Received on {new Date(sub.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-gray-400 block">Order Total</span>
                  <span className="text-xl font-black text-[#a14b58]">
                    GH₵{Number(sub.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 12-Hour Deadline Timer */}
              {deadlineText && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Response Deadline: </span>
                    <span className="font-bold">{deadlineText}</span>
                  </div>
                  <span className="text-[11px] text-amber-700">Please accept or decline within 12h</span>
                </div>
              )}

              {/* Items List */}
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
                      <div>
                        <p className="font-bold text-gray-900 truncate">
                          {item.quantity}× {item.product_title}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Unit: GH₵{Number(item.price_at_purchase || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 shrink-0">
                      GH₵{Number(item.total_price || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Buyer & Handover Details */}
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 grid sm:grid-cols-3 gap-3 text-xs text-gray-700">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Buyer</span>
                  <span className="font-bold text-gray-900 block truncate">{sub.buyer_name}</span>
                  <span className="text-gray-500 text-[11px] block">{sub.buyer_phone || 'Phone upon chat'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Campus / Hall</span>
                  <span className="font-medium text-gray-900 block truncate">{sub.buyer_university}</span>
                  <span className="text-gray-500 text-[11px] block truncate">{sub.hostel_room || 'Room not specified'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Fulfilment</span>
                  <span className="font-bold text-gray-900 block capitalize">
                    {String(sub.fulfilment_method || 'personal_delivery').replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-500 text-[11px] block">
                    Fee: GH₵{Number(sub.confirmed_delivery_fee || sub.advertised_delivery_fee || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Latest Agreement Banner if pending or active */}
              {sub.latest_agreement && (
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Agreement: GH₵{Number(sub.latest_agreement.proposed_fee).toFixed(2)} at {sub.latest_agreement.delivery_location}
                    </span>
                  </div>
                  <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-white border border-blue-200">
                    {sub.latest_agreement.status}
                  </span>
                </div>
              )}

              {/* Status Stepper & Action Controls */}
              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/messages"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#a14b58]" />
                    <span>Chat with Buyer</span>
                  </Link>

                  {/* Accept / Reject when pending response */}
                  {sub.status === 'pending_response' && (
                    <>
                      <button
                        disabled={actionLoadingId === sub.id}
                        onClick={() => handleAcceptOrder(sub.id)}
                        className="px-4 py-2 bg-[#a14b58] hover:bg-[#863b48] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {actionLoadingId === sub.id ? 'Accepting...' : 'Accept Order'}
                      </button>
                      <button
                        onClick={() => setRejectingSuborder(sub)}
                        className="px-3 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {/* Delivery proposal & status advancement when active */}
                  {(sub.status === 'accepted' || sub.status === 'awaiting_delivery_agreement' || sub.status === 'preparing') && (
                    <>
                      <button
                        onClick={() => {
                          setProposingSuborder(sub);
                          setProposalData({
                            fulfilment_method: sub.fulfilment_method || 'personal_delivery',
                            proposed_fee: String(sub.confirmed_delivery_fee || sub.advertised_delivery_fee || '10.00'),
                            delivery_location: sub.delivery_location || sub.hostel_room || '',
                            estimated_delivery: sub.estimated_delivery || '',
                            notes: '',
                          });
                        }}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-[#a14b58] border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Propose / Agree Delivery
                      </button>

                      {sub.status !== 'preparing' && (
                        <button
                          disabled={actionLoadingId === sub.id}
                          onClick={() => handleUpdateStatus(sub.id, 'preparing')}
                          className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Start Preparing
                        </button>
                      )}

                      {sub.status === 'preparing' && sub.fulfilment_method === 'collection' && (
                        <button
                          disabled={actionLoadingId === sub.id}
                          onClick={() => handleUpdateStatus(sub.id, 'ready_for_collection')}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Mark Ready for Pickup
                        </button>
                      )}

                      {sub.status === 'preparing' && sub.fulfilment_method !== 'collection' && (
                        <button
                          disabled={actionLoadingId === sub.id}
                          onClick={() => handleUpdateStatus(sub.id, 'dispatched')}
                          className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Mark as Dispatched
                        </button>
                      )}
                    </>
                  )}

                  {/* Complete order when ready or dispatched */}
                  {(sub.status === 'ready_for_collection' || sub.status === 'dispatched' || sub.status === 'delivered') && (
                    <button
                      disabled={actionLoadingId === sub.id}
                      onClick={() => handleUpdateStatus(sub.id, 'completed')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoadingId === sub.id ? 'Completing...' : 'Mark as Completed'}
                    </button>
                  )}
                </div>

                {/* Cancel suborder button */}
                {sub.status !== 'completed' && sub.status !== 'cancelled' && sub.status !== 'rejected' && (
                  <button
                    onClick={() => setCancellingSuborder(sub)}
                    className="text-xs text-gray-400 hover:text-red-600 font-semibold cursor-pointer"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Propose Delivery Terms Modal */}
      {proposingSuborder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-900 text-base">
                Propose Delivery for Order #{proposingSuborder.suborder_number}
              </h3>
              <button
                onClick={() => setProposingSuborder(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitDeliveryProposal} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Fulfilment Method</label>
                <select
                  value={proposalData.fulfilment_method}
                  onChange={(e) => setProposalData({ ...proposalData, fulfilment_method: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                >
                  <option value="personal_delivery">Personal Campus Delivery</option>
                  <option value="collection">Buyer Pickup / Meetup</option>
                  <option value="courier">Third-Party Courier</option>
                  <option value="custom">Custom Arrangement</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Delivery Fee (GH₵)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={proposalData.proposed_fee}
                  onChange={(e) => setProposalData({ ...proposalData, proposed_fee: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Delivery / Handover Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brunei Hall Porter's Lodge or Faculty Square"
                  value={proposalData.delivery_location}
                  onChange={(e) => setProposalData({ ...proposalData, delivery_location: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Estimated Time Window</label>
                <input
                  type="text"
                  placeholder="e.g. Tomorrow between 2:00 PM and 4:00 PM"
                  value={proposalData.estimated_delivery}
                  onChange={(e) => setProposalData({ ...proposalData, estimated_delivery: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">Notes for Buyer</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Call me 10 mins before you arrive"
                  value={proposalData.notes}
                  onChange={(e) => setProposalData({ ...proposalData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setProposingSuborder(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className="px-4 py-2 bg-[#a14b58] hover:bg-[#863b48] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Send Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Order Modal */}
      {rejectingSuborder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-900 text-base">
                Decline Order #{rejectingSuborder.suborder_number}
              </h3>
              <button
                onClick={() => setRejectingSuborder(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Provide a clear reason for declining this order so the student buyer understands.
            </p>

            <form onSubmit={submitRejectOrder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Decline Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Item already sold offline, temporarily out of stock, away from campus"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingSuborder(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Decline Order
                </button>
              </div>
            </form>
          </div>
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

            <form onSubmit={submitCancelOrder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">Reason for Cancellation</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Unable to fulfill delivery at this time"
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
                  disabled={actionLoadingId !== null}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

