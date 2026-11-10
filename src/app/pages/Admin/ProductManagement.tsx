/**
 * ==============================================================================
 * ADMIN PRODUCT & CATALOG MANAGEMENT (ProductManagement.tsx)
 * ==============================================================================
 * Connected strictly to `/api/admin/products/` and `/api/admin/products/<id>/`.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Eye,
  Trash2,
  Flag,
  AlertTriangle,
  CheckCircle,
  X,
  Store,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  AdminLoadingState,
  AdminErrorState,
  formatAdminDate,
} from '../../components/Admin/AdminStateFeedback';
import { api } from '../../../lib/api';
import { toast } from 'sonner';

interface AdminProductItem {
  id: number;
  name: string;
  title: string;
  category: string;
  price: number;
  condition: string;
  status: 'pending_approval' | 'live' | 'flagged' | 'hidden' | 'rejected';
  is_available: boolean;
  flagReason?: string;
  rejectionReason?: string;
  created_at: string | null;
  image: string;
  description: string;
  university: string;
  seller: {
    id: number;
    name: string;
    email: string;
    university: string;
    verified: boolean;
    phone: string;
  };
}

interface ProductsResponse {
  stats: {
    total: number;
    live: number;
    pending_approval: number;
    flagged: number;
    hidden: number;
    rejected: number;
  };
  results: AdminProductItem[];
}

export const ProductManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'pending_approval' | 'flagged' | 'hidden' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [stats, setStats] = useState<ProductsResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewingProduct, setViewingProduct] = useState<AdminProductItem | null>(null);
  const [viewingSeller, setViewingSeller] = useState<AdminProductItem['seller'] | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ProductsResponse>('/admin/products/');
      setProducts(Array.isArray(res?.results) ? res.results : []);
      setStats(res?.stats || null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load products from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = useMemo(() => {
    const names = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
    return ['All', ...names];
  }, [products]);

  const filteredProducts = products.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.seller.name.toLowerCase().includes(q) ||
      item.university.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleUpdateStatus = async (
    product: AdminProductItem,
    nextStatus: AdminProductItem['status'],
    extra: Record<string, any> = {}
  ) => {
    try {
      const res = await api.patch<{ product: AdminProductItem }>(`/admin/products/${product.id}/`, {
        status: nextStatus,
        ...extra,
      });
      toast.success(`Listing status updated to ${nextStatus.replace('_', ' ')}.`);
      await loadProducts();
      if (viewingProduct?.id === product.id) {
        setViewingProduct(res.product);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update product listing.');
    }
  };

  const handleToggleFlag = async (product: AdminProductItem) => {
    if (product.status === 'flagged') {
      await handleUpdateStatus(product, 'live', { flag_reason: '' });
    } else {
      const reason = window.prompt('Enter flag reason for inspection:', 'Requires policy review');
      if (reason === null) return;
      await handleUpdateStatus(product, 'flagged', { flag_reason: reason.trim() || 'Flagged for inspection' });
    }
  };

  const handleToggleHide = async (product: AdminProductItem) => {
    const nextStatus = product.status === 'hidden' ? 'live' : 'hidden';
    await handleUpdateStatus(product, nextStatus);
  };

  const handleDeleteProduct = async (product: AdminProductItem) => {
    if (!confirm(`Delete or archive listing "${product.name}"?`)) return;
    try {
      const res = await api.delete<{ message: string }>(`/admin/products/${product.id}/`);
      toast.success(res?.message || 'Listing removed.');
      if (viewingProduct?.id === product.id) setViewingProduct(null);
      await loadProducts();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to delete product listing.');
    }
  };

  const statusLabel = (s: string) => {
    if (s === 'live') return 'Live';
    if (s === 'pending_approval') return 'Pending';
    if (s === 'flagged') return 'Flagged';
    if (s === 'hidden') return 'Hidden';
    if (s === 'rejected') return 'Rejected';
    return s;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Product Management</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Audit live listings, moderate flagged items, and manage seller catalog compliance
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(stats?.flagged || 0) > 0 && (
              <button
                onClick={() => setStatusFilter('flagged')}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>{stats?.flagged} Flagged Items</span>
              </button>
            )}
            <button
              onClick={loadProducts}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading && products.length === 0 ? (
          <AdminLoadingState label="Loading marketplace products..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={loadProducts} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Total Products</span>
                  <Store className="w-4 h-4 text-[#a14b58]" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.total ?? products.length}</p>
                <p className="text-[11px] text-gray-500 mt-1">{stats?.pending_approval ?? 0} pending review</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Live in Shop</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.live ?? 0}</p>
                <p className="text-[11px] text-gray-500 mt-1">Approved public listings</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Flagged</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.flagged ?? 0}</p>
                <p className="text-[11px] text-amber-600 font-bold mt-1">Require moderation</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Hidden / Rejected</span>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-black text-gray-900">
                  {(stats?.hidden ?? 0) + (stats?.rejected ?? 0)}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {stats?.hidden ?? 0} hidden • {stats?.rejected ?? 0} rejected
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products by title, seller, or university..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-xs sm:text-sm font-medium"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        Category: {c}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold flex-wrap">
                    {(['all', 'live', 'pending_approval', 'flagged', 'hidden', 'rejected'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          statusFilter === st
                            ? 'bg-[#a14b58] text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {st === 'all' ? 'All' : statusLabel(st)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#faf8f8] border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Listing</th>
                      <th className="px-5 py-3.5">Seller</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Price</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                          No product listings found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0 bg-gray-50"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate max-w-xs">{product.name}</p>
                                <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                                  <span>{product.condition}</span>
                                  <span>•</span>
                                  <span>{formatAdminDate(product.created_at)}</span>
                                </div>
                                {product.flagReason && (
                                  <p className="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    {product.flagReason}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <button
                              onClick={() => setViewingSeller(product.seller)}
                              className="text-left flex flex-col hover:opacity-80 transition-opacity"
                            >
                              <div className="flex items-center gap-1 font-bold text-gray-900 text-xs">
                                <span>{product.seller.name}</span>
                                {product.seller.verified && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                              </div>
                              <p className="text-[11px] text-gray-400">{product.university || product.seller.university}</p>
                            </button>
                          </td>

                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                              {product.category}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-black text-gray-900 text-sm">
                            GH₵{product.price.toLocaleString()}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                                product.status === 'live'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : product.status === 'flagged' || product.status === 'pending_approval'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {statusLabel(product.status)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingProduct(product)}
                                className="p-1.5 hover:bg-[#fcf6f7] text-gray-500 hover:text-[#a14b58] rounded-lg transition-colors"
                                title="Inspect Listing"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleFlag(product)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  product.status === 'flagged'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'
                                }`}
                                title={product.status === 'flagged' ? 'Clear Flag & Restore Live' : 'Flag Listing'}
                              >
                                <Flag className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleHide(product)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  product.status === 'hidden'
                                    ? 'bg-gray-200 text-gray-800'
                                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'
                                }`}
                                title={product.status === 'hidden' ? 'Restore to Live' : 'Hide Listing'}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product)}
                                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

        {/* Seller Modal */}
        {viewingSeller && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setViewingSeller(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a14b58] to-[#c86371] text-white font-black text-2xl flex items-center justify-center mx-auto mb-3">
                  {viewingSeller.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-lg font-black text-gray-900">{viewingSeller.name}</h3>
                <p className="text-xs text-gray-500">{viewingSeller.email}</p>
              </div>
              <div className="space-y-3 bg-[#faf8f8] p-4 rounded-2xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 font-bold block">Campus University</span>
                  <span className="font-bold text-gray-800">{viewingSeller.university}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Phone</span>
                  <span className="font-bold text-gray-800">{viewingSeller.phone || 'Not provided'}</span>
                </div>
              </div>
              <button
                onClick={() => setViewingSeller(null)}
                className="w-full mt-6 py-2.5 bg-[#a14b58] hover:bg-[#863b48] text-white text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Product Inspection Modal */}
        {viewingProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setViewingProduct(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-4 bg-gray-100">
                <img src={viewingProduct.image} alt={viewingProduct.name} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{viewingProduct.name}</h3>
                    <p className="text-xs text-gray-500">
                      {viewingProduct.seller.name} • {viewingProduct.university}
                    </p>
                  </div>
                  <span className="text-xl font-black text-[#a14b58]">GH₵{viewingProduct.price.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700">
                  {viewingProduct.description || 'No description provided.'}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-5 mt-5 border-t border-gray-100">
                <button
                  onClick={() => handleToggleHide(viewingProduct)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                >
                  {viewingProduct.status === 'hidden' ? 'Restore Live' : 'Hide Listing'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleFlag(viewingProduct)}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl"
                  >
                    {viewingProduct.status === 'flagged' ? 'Clear Flag' : 'Flag'}
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(viewingProduct)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
