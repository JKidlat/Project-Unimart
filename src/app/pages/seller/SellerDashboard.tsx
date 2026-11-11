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
  ChevronDown,
  Store,
  AlertTriangle,
  Edit3,
  RefreshCw,
  LifeBuoy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../../context/UserContext';
import { useKYC } from '../../context/KYCContext';
import { api } from '../../../lib/api';
import { ImageWithFallback } from '../../components/common/ImageWithFallback';
import { ConversationInbox } from '../../components/Chat/ConversationInbox';
import { formatStockStatus, isLegacyBlobUrl, prepareImageForUpload } from '../../../lib/inventory';

type SellerTab = 'post' | 'listings' | 'orders' | 'messages';

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
      <div className="grid grid-cols-4 gap-2 mb-8 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
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
      await api.post('/products/', {
        title: form.title.trim(),
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        stock: stockInt,
        category: form.category,
        condition: form.condition,
        description: form.description.trim(),
        image: uploadedUrls[0],
        images: uploadedUrls,
      });
      toast.success('Ad submitted for admin review! You can track it in My Listings.');
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
      setForm({ title: '', price: '', oldPrice: '', stock: '1', category: '', description: '', condition: 'New' });
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

      const updated = await api.patch(`/products/${editingListing.id}/`, {
        title: editForm.title.trim(),
        price: Number(editForm.price),
        oldPrice: editForm.oldPrice ? Number(editForm.oldPrice) : null,
        stock: stockVal,
        category: editForm.category,
        condition: editForm.condition,
        description: editForm.description.trim(),
        image: finalImages[0],
        images: finalImages,
      });

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
// SELLER ORDERS TAB (Real DB + Atomic Completion Inventory Deduction)
// ==============================================================================
const SellerOrdersTab: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await api.get('/orders/?role=seller');
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

  const updateStatus = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const updated = await api.patch(`/orders/${orderId}/`, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
      if (newStatus === 'completed') {
        toast.success(`Order #${orderId} completed and inventory updated!`);
      } else {
        toast.success(`Order status updated to "${STATUS_LABELS[newStatus] || newStatus}".`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
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
        const normalized = normalizeOrderStatus(order.status);
        const nextStatus = STATUS_STEPS[STATUS_STEPS.indexOf(normalized) + 1];
        const totalAmt = Number(order.total_amount || 0);

        return (
          <div key={order.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <p className="font-black text-gray-900">Order #{order.id}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(order.created_at || Date.now()).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                    order.status === 'completed'
                      ? 'bg-green-50 text-green-700 border-green-100'
                      : order.status === 'cancelled'
                      ? 'bg-red-50 text-red-700 border-red-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}
                >
                  {STATUS_ICONS[order.status] || STATUS_ICONS.pending}
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 pb-4 border-b border-gray-100 mb-4">
              {(order.items || []).map((item: any, i: number) => {
                const lineTotal = Number(
                  item.total_price ?? Number(item.price_at_purchase || item.price || 0) * Number(item.quantity || 1)
                );
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.quantity}× {item.product_title || item.name || `Product #${item.product_id}`}
                    </span>
                    <span className="font-bold text-gray-900">GH₵{lineTotal.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400">Buyer &amp; Drop-off</p>
                <p className="font-bold text-gray-700 text-sm">
                  {order.buyer_name || order.full_name || 'Student Buyer'}
                  {order.phone_number ? ` • ${order.phone_number}` : ''}
                </p>
                {order.hostel_room && (
                  <p className="text-xs text-gray-500">
                    {order.university} • {order.hostel_room}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Link
                  to={`/contact?orderId=${order.id}&category=Order+Problem`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:text-[#a14b58] hover:border-[#a14b58] text-xs font-semibold transition-colors bg-gray-50/70 hover:bg-rose-50/50"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-[#a14b58]" />
                  <span>Order Support</span>
                </Link>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-black text-[#a14b58]">GH₵{totalAmt.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Fulfillment Actions */}
            {nextStatus && order.status !== 'cancelled' && order.status !== 'completed' && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => updateStatus(order.id, nextStatus)}
                  disabled={updatingId === order.id}
                  className="flex-1 py-3 bg-[#a14b58] text-white rounded-xl font-bold text-sm hover:bg-[#863b48] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {updatingId === order.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Mark as &ldquo;{STATUS_LABELS[nextStatus]}&rdquo;
                      <ChevronDown className="w-4 h-4 -rotate-90" />
                    </>
                  )}
                </button>
                {(order.status === 'pending' || order.status === 'processing') && (
                  <button
                    onClick={() => updateStatus(order.id, 'cancelled')}
                    disabled={updatingId === order.id}
                    className="px-4 py-3 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-xl font-bold text-sm transition-colors cursor-pointer disabled:opacity-60"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
