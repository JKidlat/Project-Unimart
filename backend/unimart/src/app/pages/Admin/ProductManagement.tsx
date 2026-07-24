import React, { useState } from 'react';
import { Search, MoreVertical, Eye, Trash2, Flag, Edit, TrendingUp, AlertTriangle } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  seller: string;
  university: string;
  price: number;
  category: string;
  status: 'Active' | 'Flagged' | 'Hidden';
  datePosted: string;
  views: number;
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'MacBook Pro 2019',
    seller: 'Kwame Mensah',
    university: 'UG - Legon',
    price: 3500,
    category: 'Electronics',
    status: 'Active',
    datePosted: '2024-03-01',
    views: 145
  },
  {
    id: '2',
    name: 'Engineering Textbooks Bundle',
    seller: 'Abena Osei',
    university: 'KNUST',
    price: 250,
    category: 'Books',
    status: 'Active',
    datePosted: '2024-03-02',
    views: 89
  },
  {
    id: '3',
    name: 'iPhone 12 Pro',
    seller: 'Emmanuel Boateng',
    university: 'UCC',
    price: 2800,
    category: 'Electronics',
    status: 'Flagged',
    datePosted: '2024-02-28',
    views: 234
  },
  {
    id: '4',
    name: 'Dorm Furniture Set',
    seller: 'Sarah Appiah',
    university: 'UPSA',
    price: 450,
    category: 'Furniture',
    status: 'Hidden',
    datePosted: '2024-02-25',
    views: 67
  }
];

/**
 * ProductManagement Component
 * 
 * Admin interface for managing product listings:
 * - View all products with filters
 * - Flag inappropriate listings
 * - Delete or hide products
 * - View seller information
 */
export const ProductManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Flagged' | 'Hidden'>('All');
  const [products, setProducts] = useState(mockProducts);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.seller.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== productId));
      toast.success('Product deleted successfully');
    }
  };

  const handleToggleStatus = (productId: string) => {
    setProducts(products.map(p => 
      p.id === productId 
        ? { ...p, status: p.status === 'Active' ? 'Hidden' : 'Active' as 'Active' | 'Flagged' | 'Hidden' }
        : p
    ));
    toast.success('Product status updated');
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Product Management</h1>
          <p className="text-gray-600">Monitor and moderate product listings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Total Products</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">3,842</p>
            <p className="text-xs text-green-600 font-bold mt-1">↑ 8% from last week</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Active</span>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
            <p className="text-3xl font-black text-gray-900">3,614</p>
            <p className="text-xs text-gray-500 mt-1">94% of total</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Flagged</span>
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">42</p>
            <p className="text-xs text-yellow-600 font-bold mt-1">Needs review</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Hidden</span>
              <Eye className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">186</p>
            <p className="text-xs text-gray-500 mt-1">Violations removed</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or sellers..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {(['All', 'Active', 'Flagged', 'Hidden'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    statusFilter === status
                      ? 'bg-[#a14b58] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.datePosted}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.seller}</p>
                        <p className="text-xs text-gray-500">{product.university}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{product.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">GH₵{product.price}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        product.status === 'Active' 
                          ? 'bg-green-100 text-green-700' 
                          : product.status === 'Flagged'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{product.views}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                          title="View Product"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(product.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-yellow-600 transition-colors"
                          title={product.status === 'Active' ? 'Hide' : 'Unhide'}
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
