/**
 * ==============================================================================
 * ADMIN AD APPROVALS QUEUE (AdApprovals.tsx)
 * ==============================================================================
 * This page allows platform administrators to review seller-submitted ads
 * before they become visible in the public marketplace.
 *
 * Workflow:
 * 1. When a verified seller posts a new ad in their Seller Studio, it enters
 *    the product store with `status: 'pending_approval'`.
 * 2. This page lists all pending ads with photos, condition, price, and seller name.
 * 3. Review Actions:
 *    - "Approve & Go Live": Sets `status: 'live'` and `is_available: true`.
 *      The product is immediately published into `/shop` and search results.
 *    - "Reject": Prompts the admin to provide a rejection reason (e.g. "Price
 *      seems inaccurate" or "Blurry photos"). The reason is surfaced to the seller
 *      in their "My Listings" tab so they can revise and re-submit.
 * ==============================================================================
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PackagePlus, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from './AdminLayout';
import { api } from '../../../lib/api';

export const AdApprovals: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'pending_approval' | 'live' | 'rejected' | 'all'>('pending_approval');

  const load = async () => {
    try {
      const res = await api.get('/products/?status=all');
      const items = res.results || res;
      if (Array.isArray(items) && items.length > 0) {
        setProducts(items);
        return;
      }
    } catch {}

    try {
      const stored = JSON.parse(localStorage.getItem('unimart_products_store') || '[]');
      setProducts(stored);
    } catch { setProducts([]); }
  };

  useEffect(() => { load(); }, []);

  const approve = async (product: any) => {
    setProcessing(true);
    try {
      await api.patch(`/products/${product.id}/`, { status: 'live', is_available: true });
    } catch {}

    const stored = JSON.parse(localStorage.getItem('unimart_products_store') || '[]');
    const updated = stored.map((p: any) =>
      String(p.id) === String(product.id) ? { ...p, status: 'live', is_available: true } : p
    );
    localStorage.setItem('unimart_products_store', JSON.stringify(updated));
    toast.success(`"${product.name || product.title}" is now approved and live in the shop!`);
    setSelected(null);
    await load();
    setProcessing(false);
  };

  const reject = async (product: any) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setProcessing(true);
    try {
      await api.patch(`/products/${product.id}/`, {
        status: 'rejected',
        is_available: false,
        rejectionReason: rejectionReason.trim(),
      });
    } catch {}

    const stored = JSON.parse(localStorage.getItem('unimart_products_store') || '[]');
    const updated = stored.map((p: any) =>
      String(p.id) === String(product.id)
        ? { ...p, status: 'rejected', is_available: false, rejectionReason: rejectionReason.trim() }
        : p
    );
    localStorage.setItem('unimart_products_store', JSON.stringify(updated));
    toast.success('Ad rejected with feedback saved for seller.');
    setRejectionReason('');
    setSelected(null);
    await load();
    setProcessing(false);
  };

  const filtered = products.filter(p => filter === 'all' || p.status === filter);
  const counts = {
    all: products.length,
    pending_approval: products.filter(p => p.status === 'pending_approval').length,
    live: products.filter(p => p.status === 'live').length,
    rejected: products.filter(p => p.status === 'rejected').length,
  };

  const statusBadge = (s: string) => {
    if (s === 'live') return 'bg-green-50 text-green-700 border-green-100';
    if (s === 'rejected') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-amber-50 text-amber-700 border-amber-100';
  };
  const statusLabel = (s: string) => {
    if (s === 'pending_approval') return 'Pending Review';
    if (s === 'live') return 'Live';
    if (s === 'rejected') return 'Rejected';
    return s;
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center">
          <PackagePlus className="w-5 h-5 text-[#a14b58]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Ad Approvals</h1>
          <p className="text-sm text-gray-500">Review and publish or reject seller-submitted product listings</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['pending_approval', 'all', 'live', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              filter === f ? 'bg-[#a14b58] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {statusLabel(f)} ({counts[f]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
          <PackagePlus className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-bold">No {statusLabel(filter)} ads</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex gap-4 items-start"
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h3 className="font-black text-gray-900">{p.name || p.title}</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusBadge(p.status || 'pending_approval')}`}>
                    {statusLabel(p.status || 'pending_approval')}
                  </span>
                </div>
                <p className="text-[#a14b58] font-black mt-1">GH₵{p.price?.toLocaleString()}</p>
                <div className="flex gap-3 text-xs text-gray-400 mt-1">
                  <span>{p.condition}</span>
                  <span>•</span>
                  <span>{p.category}</span>
                  {p.seller_name && <><span>•</span><span>by {p.seller_name}</span></>}
                </div>
                {p.rejectionReason && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                    Rejection reason: {p.rejectionReason}
                  </p>
                )}
              </div>
              {(p.status === 'pending_approval' || !p.status) && (
                <button
                  onClick={() => setSelected(p)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#a14b58] text-white rounded-xl font-bold text-sm hover:bg-[#863b48] transition-all shrink-0"
                >
                  <Eye className="w-4 h-4" /> Review
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-black text-gray-900 mb-6">Review Ad</h2>
            <div className="h-48 rounded-2xl overflow-hidden bg-gray-100 mb-6">
              {selected.image && <img src={selected.image} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm mb-6">
              <div className="flex justify-between"><span className="text-gray-500">Title</span><span className="font-bold">{selected.name || selected.title}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-bold text-[#a14b58]">GH₵{selected.price?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Condition</span><span className="font-bold">{selected.condition}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-bold capitalize">{selected.category}</span></div>
              {selected.seller_name && <div className="flex justify-between"><span className="text-gray-500">Seller</span><span className="font-bold">{selected.seller_name}</span></div>}
            </div>
            {selected.description && (
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.description}</p>
              </div>
            )}

            <div className="space-y-2 mb-6">
              <label className="text-sm font-bold text-gray-700">Rejection Reason (required to reject)</label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Images are low quality, description is misleading..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none resize-none text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => reject(selected)}
                disabled={processing}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button
                onClick={() => approve(selected)}
                disabled={processing}
                className="flex-[2] py-3 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve & Go Live
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
};
