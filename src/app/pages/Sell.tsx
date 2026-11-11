import React, { useState, useEffect, useRef } from 'react';
import {
  PackagePlus,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Store,
  UserPlus,
  Image as ImageIcon,
  Upload,
  Info,
  X,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router';
import { api } from '../../lib/api';
import { prepareImageForUpload } from '../../lib/inventory';

export const Sell = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.role === 'Seller') {
      navigate('/seller', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    oldPrice: '',
    stock: '1',
    category: '',
    description: '',
    condition: 'New',
  });

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Sign in required</h2>
        <p className="text-gray-500 mb-6">Please sign in to list items on the student marketplace.</p>
        <Link to="/signin" className="px-8 py-3.5 bg-[#a14b58] text-white rounded-2xl font-bold">
          Sign In
        </Link>
      </div>
    );
  }

  const handleUpgrade = () => {
    navigate('/kyc?mode=buyer_upgrade');
  };

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
    if (user.is_email_verified === false) {
      toast.error('Please verify your email address before listing items.');
      return;
    }
    if (images.length < 1) {
      toast.error('Please upload at least 1 real product image.');
      return;
    }
    const stockInt = Math.floor(Number(formData.stock));
    if (!Number.isFinite(stockInt) || stockInt < 1) {
      toast.error('Available stock must be at least 1 unit.');
      return;
    }
    if (!formData.title.trim() || !formData.price || !formData.category) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const prepared: File[] = [];
      for (const img of images) {
        prepared.push(await prepareImageForUpload(img.file, { maxDimension: 1280, quality: 0.84 }));
      }
      const fd = new FormData();
      prepared.forEach((f) => fd.append('files', f));
      const mediaRes = await api.upload<{ url: string; urls: string[] }>('/media/upload/?kind=product', fd);
      const urls =
        Array.isArray(mediaRes?.urls) && mediaRes.urls.length > 0
          ? mediaRes.urls
          : mediaRes?.url
          ? [mediaRes.url]
          : [];

      if (urls.length === 0) {
        throw new Error('Could not upload product images. Please try again.');
      }

      await api.post('/products/', {
        title: formData.title.trim(),
        price: Number(formData.price),
        oldPrice: formData.oldPrice ? Number(formData.oldPrice) : null,
        stock: stockInt,
        category: formData.category,
        condition: formData.condition,
        description: formData.description.trim(),
        image: urls[0],
        images: urls,
      });

      toast.success('Ad submitted for review! Once approved by an admin, it will be published in the shop.');
      navigate('/seller');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post item');
    } finally {
      setSubmitting(false);
    }
  };

  if (user.role === 'Buyer') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-[#fcf6f7] rounded-3xl flex items-center justify-center mx-auto mb-8 text-[#a14b58] shadow-lg shadow-[#a14b581a]">
          <Store className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Start Selling on Unimart</h1>
        <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
          Turn your used textbooks, dorm decor, or gadgets into cash with verified student buyers across Ghana.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
          {[
            { icon: Sparkles, title: 'Zero Listing Fees', desc: 'Post as many items as you want for free.' },
            { icon: ShieldCheck, title: 'Campus Safe', desc: 'Transactions limited to verified students.' },
            { icon: ArrowRight, title: 'Quick Cash', desc: 'Receive payments directly via MoMo.' },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center text-[#a14b58] mb-4">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleUpgrade}
          className="px-10 py-4 bg-[#a14b58] text-white rounded-2xl font-black text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833] flex items-center gap-3 mx-auto cursor-pointer"
        >
          <UserPlus className="w-6 h-6" />
          Become a Seller Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">List an Item</h1>
          <p className="text-gray-500">
            Sell your stuff to fellow students in{' '}
            <span className="text-[#a14b58] font-bold">{user.university}</span>
          </p>
        </div>
        <div className="hidden sm:flex p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-bold">Verified Seller Mode</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Photo Upload */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#a14b58]" />
            Item Photos
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 group">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-[#a14b58] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-[#a14b58] transition-all group">
                <Upload className="w-8 h-8 text-gray-300 group-hover:text-[#a14b58] mb-2" />
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
          <p className="text-[11px] text-gray-400 font-medium mt-4 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Add up to 5 clear photos of your item. Stored permanently on Unimart servers.
          </p>
        </div>

        {/* Details Form */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-[#a14b58]" />
            Item Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">Item Title *</label>
              <input
                type="text"
                placeholder="e.g. iPhone 13 Pro Max - 256GB"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Sale Price (GH₵) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Available Stock / Units *</label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 5"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
                required
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Original Price (GH₵) (Optional)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 200 (shows discount banner)"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
                value={formData.oldPrice}
                onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
              />
              {formData.oldPrice && Number(formData.oldPrice) > Number(formData.price) && (
                <span className="text-[11px] font-bold text-green-600 block">
                  {Math.round(((Number(formData.oldPrice) - Number(formData.price)) / Number(formData.oldPrice)) * 100)}% Discount Banner will show
                </span>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Category *</label>
              <select
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Select Category</option>
                <option value="groceries">Groceries</option>
                <option value="stationery">Stationery</option>
                <option value="electronics">Electronics</option>
                <option value="fashion">Fashion</option>
                <option value="beauty-cosmetics">Beauty and Cosmetics</option>
                <option value="appliances">Appliances</option>
                <option value="others">Others</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-gray-700">Condition</label>
              <select
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              >
                <option value="New">Brand New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Description</label>
            <textarea
              rows={4}
              placeholder="Tell buyers about the item's condition, features, and why you're selling..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="p-4 bg-rose-50/60 rounded-2xl border border-[#f3d7db] text-xs text-gray-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#a14b58] shrink-0 mt-0.5" />
            <p>
              By posting an item, you certify that you have lawful ownership and that the listing strictly complies with Unimart&apos;s{' '}
              <Link to="/legal/acceptable-use" target="_blank" className="text-[#a14b58] font-bold underline hover:text-[#883d49]">
                Acceptable Use and Prohibited Products Policy
              </Link>{' '}
              and{' '}
              <Link to="/legal/seller-agreement" target="_blank" className="text-[#a14b58] font-bold underline hover:text-[#883d49]">
                Seller Agreement
              </Link>. All student listings require administrative approval before being displayed to buyers.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-[#a14b58] text-white rounded-2xl font-black text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833] disabled:opacity-70 cursor-pointer"
        >
          {submitting ? 'Uploading Photos & Submitting...' : 'Post Item for Review'}
        </button>
      </form>
    </div>
  );
};
