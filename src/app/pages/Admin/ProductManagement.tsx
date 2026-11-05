/**
 * ==============================================================================
 * ADMIN PRODUCT & CATALOG MANAGEMENT (ProductManagement.tsx)
 * ==============================================================================
 * This page allows platform administrators to manage the global marketplace catalog.
 *
 * Core Features:
 * 1. Product Moderation:
 *    - Search and filter items across categories (Electronics, Dorm, Books, etc.).
 *    - Flag inappropriate or prohibited campus items.
 *    - Unflag, hide, or permanently delete items.
 * 2. Deep-Dive Inspection Modal:
 *    - Opens full seller profile, verification badge, and contact details.
 *    - Displays view counts and date posted.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { 
  Search, Eye, Trash2, Flag, AlertTriangle, CheckCircle, 
  X, ExternalLink, ShieldCheck, User, Tag, Calendar, 
  TrendingUp, Store, Filter, RefreshCw
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { toast } from 'sonner';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  condition: 'Brand New' | 'Like New' | 'Fair' | 'Refurbished';
  status: 'Active' | 'Flagged' | 'Hidden';
  flagReason?: string;
  datePosted: string;
  views: number;
  image: string;
  description: string;
  seller: {
    name: string;
    email: string;
    university: string;
    studentId: string;
    verified: boolean;
    rating: number;
    phone: string;
  };
}

const mockProducts: ProductItem[] = [
  {
    id: 'prod-101',
    name: 'MacBook Pro 16" (2019) 16GB RAM',
    category: 'Electronics',
    price: 4500,
    condition: 'Like New',
    status: 'Active',
    datePosted: '28 Oct 2024',
    views: 312,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
    description: 'In pristine condition with charger. Battery health at 92%. Perfect for Computer Science students.',
    seller: {
      name: 'Kwame Mensah',
      email: 'kwame.mensah@ug.edu.gh',
      university: 'University of Ghana - Legon',
      studentId: 'UG-10849201',
      verified: true,
      rating: 4.9,
      phone: '+233 24 123 4567',
    },
  },
  {
    id: 'prod-102',
    name: 'Engineering Thermodynamics & Fluid Mechanics (Bundle)',
    category: 'Books',
    price: 320,
    condition: 'Fair',
    status: 'Active',
    datePosted: '26 Oct 2024',
    views: 184,
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    description: 'Third edition textbooks for Level 200 Engineering students. Minor annotations in pencil.',
    seller: {
      name: 'Abena Osei',
      email: 'abena.osei@knust.edu.gh',
      university: 'KNUST - Kumasi',
      studentId: 'KN-20948192',
      verified: true,
      rating: 4.8,
      phone: '+233 20 890 1234',
    },
  },
  {
    id: 'prod-103',
    name: 'Apple iPhone 12 Pro (Pacific Blue 128GB)',
    category: 'Electronics',
    price: 2800,
    condition: 'Like New',
    status: 'Flagged',
    flagReason: 'Suspiciously low pricing & user report of non-responsiveness',
    datePosted: '25 Oct 2024',
    views: 520,
    image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=400&q=80',
    description: 'Clean phone, no scratches. Cash on pickup at UCC Old Site or mobile money payment.',
    seller: {
      name: 'Emmanuel Boateng',
      email: 'emmanuel.b@ucc.edu.gh',
      university: 'University of Cape Coast (UCC)',
      studentId: 'UC-30194820',
      verified: false,
      rating: 3.2,
      phone: '+233 55 456 7890',
    },
  },
  {
    id: 'prod-104',
    name: 'Dorm Wooden Desk & Ergonomic Study Chair',
    category: 'Furniture',
    price: 450,
    condition: 'Fair',
    status: 'Hidden',
    flagReason: 'Duplicate listing hidden by moderator',
    datePosted: '21 Oct 2024',
    views: 94,
    image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=400&q=80',
    description: 'Solid study desk used for one academic year at UPSA hostels. Moving out after final exams.',
    seller: {
      name: 'Sarah Appiah',
      email: 'sarah.appiah@upsa.edu.gh',
      university: 'UPSA - Accra',
      studentId: 'UP-40192831',
      verified: true,
      rating: 4.1,
      phone: '+233 27 678 9012',
    },
  },
  {
    id: 'prod-105',
    name: 'Mini Refrigerator (Hisense 90L)',
    category: 'Appliances',
    price: 750,
    condition: 'Like New',
    status: 'Active',
    datePosted: '29 Oct 2024',
    views: 260,
    image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=400&q=80',
    description: 'Compact energy-saving fridge for dorm rooms. Chills instantly and operates quietly.',
    seller: {
      name: 'Kwame Mensah',
      email: 'kwame.mensah@ug.edu.gh',
      university: 'University of Ghana - Legon',
      studentId: 'UG-10849201',
      verified: true,
      rating: 4.9,
      phone: '+233 24 123 4567',
    },
  }
];

export const ProductManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Flagged' | 'Hidden'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [products, setProducts] = useState<ProductItem[]>(mockProducts);
  
  // Modals state
  const [viewingProduct, setViewingProduct] = useState<ProductItem | null>(null);
  const [viewingSeller, setViewingSeller] = useState<ProductItem['seller'] | null>(null);

  const categories = ['All', 'Electronics', 'Books', 'Furniture', 'Appliances'];

  const filteredProducts = products.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller.university.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const flaggedCount = products.filter((p) => p.status === 'Flagged').length;

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Permanently remove this listing from Unimart? This action cannot be undone.')) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      if (viewingProduct?.id === productId) setViewingProduct(null);
      toast.success('Listing deleted from catalog.');
    }
  };

  const handleToggleHide = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStatus = p.status === 'Hidden' ? 'Active' : 'Hidden';
          toast.success(`Listing status updated to ${newStatus}.`);
          return { ...p, status: newStatus };
        }
        return p;
      })
    );
  };

  const handleToggleFlag = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStatus = p.status === 'Flagged' ? 'Active' : 'Flagged';
          toast.success(`Listing ${newStatus === 'Flagged' ? 'flagged for inspection' : 'cleared of flags'}.`);
          return { ...p, status: newStatus };
        }
        return p;
      })
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Product Management</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Audit campus listings, moderate flagged items, and manage seller catalog compliance
            </p>
          </div>
          <div className="flex items-center gap-2">
            {flaggedCount > 0 && (
              <button
                onClick={() => setStatusFilter('Flagged')}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>{flaggedCount} Flagged Items Need Review</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Total Products</span>
              <Store className="w-4 h-4 text-[#a14b58]" />
            </div>
            <p className="text-2xl font-black text-gray-900">3,842</p>
            <p className="text-[11px] text-green-600 font-bold mt-1">↑ 8% active listings</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Active</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-2xl font-black text-gray-900">3,614</p>
            <p className="text-[11px] text-gray-500 mt-1">94% live in shop</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Flagged</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-gray-900">42</p>
            <p className="text-[11px] text-amber-600 font-bold mt-1">Require moderation</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Hidden / Removed</span>
              <Trash2 className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-gray-900">186</p>
            <p className="text-[11px] text-gray-500 mt-1">Violations or sold</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by title, seller name, or university..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-xs sm:text-sm font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category selector */}
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

              {/* Status filter tabs */}
              <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold">
                {(['All', 'Active', 'Flagged', 'Hidden'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === status
                        ? 'bg-[#a14b58] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {status}
                    {status === 'Flagged' && flaggedCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 bg-red-500 text-white text-[10px] rounded-full">
                        {flaggedCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#faf8f8] border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Listing</th>
                  <th className="px-5 py-3.5">Seller (Linked)</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                      No products found matching your filter criteria.
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
                              <span>{product.views} views</span>
                              <span>•</span>
                              <span>{product.datePosted}</span>
                            </div>
                            {product.status === 'Flagged' && product.flagReason && (
                              <p className="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {product.flagReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Seller Info (Clickable link to modal) */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setViewingSeller(product.seller)}
                          className="text-left group/seller flex flex-col hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center gap-1 font-bold text-gray-900 group-hover/seller:text-[#a14b58] text-xs">
                            <span>{product.seller.name}</span>
                            {product.seller.verified && (
                              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400">{product.seller.university}</p>
                          <span className="text-[10px] text-[#a14b58] font-bold mt-0.5 underline">
                            View seller profile →
                          </span>
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                          {product.category}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-black text-gray-900 text-sm">GH₵{product.price}</span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                            product.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : product.status === 'Flagged'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              product.status === 'Active'
                                ? 'bg-emerald-500'
                                : product.status === 'Flagged'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                          />
                          {product.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Product */}
                          <button
                            onClick={() => setViewingProduct(product)}
                            className="p-1.5 hover:bg-[#fcf6f7] text-gray-500 hover:text-[#a14b58] rounded-lg transition-colors"
                            title="Inspect Listing"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Flag / Unflag toggle */}
                          <button
                            onClick={() => handleToggleFlag(product.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              product.status === 'Flagged'
                                ? 'bg-amber-100 text-amber-700'
                                : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'
                            }`}
                            title={product.status === 'Flagged' ? 'Clear Flag' : 'Flag Listing'}
                          >
                            <Flag className="w-4 h-4" />
                          </button>

                          {/* Hide / Unhide listing */}
                          <button
                            onClick={() => handleToggleHide(product.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              product.status === 'Hidden'
                                ? 'bg-gray-200 text-gray-800'
                                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'
                            }`}
                            title={product.status === 'Hidden' ? 'Unhide (Make Active)' : 'Hide Listing'}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          {/* Delete listing */}
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
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

        {/* Linked Seller Info Modal */}
        {viewingSeller && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setViewingSeller(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a14b58] to-[#c86371] text-white font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#a14b58]/30">
                  {viewingSeller.name.charAt(0)}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-lg font-black text-gray-900">{viewingSeller.name}</h3>
                  {viewingSeller.verified && (
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500">{viewingSeller.email}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fcf6f7] text-[#a14b58] border border-[#f3d7db]">
                  Seller Rating: {viewingSeller.rating} ★
                </span>
              </div>

              <div className="space-y-3 bg-[#faf8f8] p-4 rounded-2xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 font-bold block">Campus University</span>
                  <span className="font-bold text-gray-800">{viewingSeller.university}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Verified Student ID</span>
                  <span className="font-bold text-gray-800 font-mono">{viewingSeller.studentId}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Contact Phone / WhatsApp</span>
                  <span className="font-bold text-gray-800">{viewingSeller.phone}</span>
                </div>
              </div>

              <button
                onClick={() => setViewingSeller(null)}
                className="w-full mt-6 py-2.5 bg-[#a14b58] hover:bg-[#863b48] text-white text-xs font-bold rounded-xl transition-all"
              >
                Close Seller Card
              </button>
            </div>
          </div>
        )}

        {/* Product Inspection Modal */}
        {viewingProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setViewingProduct(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-4 bg-gray-100 relative">
                <img
                  src={viewingProduct.image}
                  alt={viewingProduct.name}
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-black shadow-md ${
                    viewingProduct.status === 'Active'
                      ? 'bg-emerald-500 text-white'
                      : viewingProduct.status === 'Flagged'
                      ? 'bg-amber-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {viewingProduct.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{viewingProduct.name}</h3>
                    <p className="text-xs text-gray-500">
                      Listed by {viewingProduct.seller.name} • {viewingProduct.seller.university}
                    </p>
                  </div>
                  <span className="text-xl font-black text-[#a14b58] shrink-0">
                    GH₵{viewingProduct.price}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 leading-relaxed">
                  <p className="font-bold text-gray-900 mb-1">Description:</p>
                  {viewingProduct.description}
                </div>

                {viewingProduct.status === 'Flagged' && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    <p className="font-bold flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Flag Report:
                    </p>
                    {viewingProduct.flagReason}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-5 mt-5 border-t border-gray-100">
                <button
                  onClick={() => handleToggleHide(viewingProduct.id)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
                >
                  {viewingProduct.status === 'Hidden' ? 'Make Active' : 'Hide from Public'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleFlag(viewingProduct.id)}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl transition-all"
                  >
                    {viewingProduct.status === 'Flagged' ? 'Clear Flag' : 'Flag Listing'}
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(viewingProduct.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-all"
                  >
                    Delete Listing
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
