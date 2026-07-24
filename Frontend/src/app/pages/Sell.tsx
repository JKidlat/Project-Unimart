import React, { useState } from 'react';
import { 
  PackagePlus, Sparkles, ShieldCheck, 
  ArrowRight, Store, UserPlus, 
  Image as ImageIcon, Upload, Info
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Link } from 'react-router';

/**
 * Sell Page Component
 * 
 * Manages the "List an Item" flow. 
 * Features:
 * 1. Role-based access: If user is a 'Buyer', it shows an upgrade prompt.
 * 2. Multi-step form for item photos and details.
 * 3. Form validation and mock submission logic.
 * 4. Automatic university tagging based on user's profile.
 */
export const Sell = () => {
  // Access user session and update methods from context
  const { user, updateProfile } = useUser();
  
  // Local form state for item listing
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: '',
    description: '',
    condition: 'new',
  });

  // Guard: Redirect or handle null user case
  if (!user) return null;

  /**
   * Upgrades the user's role from Buyer to Seller.
   * Updates the global UserContext state and notifies the user.
   */
  const handleUpgrade = () => {
    updateProfile({ role: 'Seller' });
    toast.success("Welcome to the Seller community! You can now post items.");
  };

  /**
   * Handles the item listing form submission.
   * Validates required fields and shows a success toast.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Listing submitted for review!");
    // In a real app, this would call an API to save the product
  };

  if (user.role === 'Buyer') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-[#fcf6f7] rounded-3xl flex items-center justify-center mx-auto mb-8 text-[#a14b58] shadow-lg shadow-[#a14b581a]">
          <Store className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Start Selling on Unimart</h1>
        <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
          Turn your used textbooks, dorm decor, or gadgets into cash. Join 5,000+ student sellers across Ghana.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
          {[
            { icon: Sparkles, title: "Zero Listing Fees", desc: "Post as many items as you want for free." },
            { icon: ShieldCheck, title: "Campus Safe", desc: "Transactions limited to verified students." },
            { icon: ArrowRight, title: "Quick Cash", desc: "Receive payments directly via MoMo." },
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
          className="px-10 py-4 bg-[#a14b58] text-white rounded-2xl font-black text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833] flex items-center gap-3 mx-auto"
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
          <p className="text-gray-500">Sell your stuff to fellow students in <span className="text-[#a14b58] font-bold">{user.university}</span></p>
        </div>
        <div className="hidden sm:block p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-2">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <label className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-[#a14b58] transition-all group">
              <Upload className="w-8 h-8 text-gray-300 group-hover:text-[#a14b58] mb-2" />
              <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#a14b58]">Add Photo</span>
              <input type="file" className="hidden" multiple accept="image/*" />
            </label>
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-square bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-200">
                <ImageIcon className="w-8 h-8" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-4 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Add up to 5 clear photos of your item.
          </p>
        </div>

        {/* Details Form */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-[#a14b58]" />
            Item Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Item Title *</label>
              <input 
                type="text" 
                placeholder="e.g. iPhone 13 Pro Max - 256GB"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
                required
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Price (GH₵) *</label>
              <input 
                type="number" 
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
                required
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Category *</label>
              <select 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
                required
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="">Select Category</option>
                <option value="electronics">Electronics</option>
                <option value="books">Textbooks</option>
                <option value="fashion">Fashion</option>
                <option value="home">Hostel Essentials</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Condition</label>
              <select 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
                onChange={(e) => setFormData({...formData, condition: e.target.value})}
              >
                <option value="new">Brand New</option>
                <option value="used_excellent">Used - Excellent</option>
                <option value="used_good">Used - Good</option>
                <option value="used_fair">Used - Fair</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Description</label>
            <textarea 
              rows={4}
              placeholder="Tell buyers about the item's condition, features, and why you're selling..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none"
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            type="submit"
            className="flex-1 py-4 bg-[#a14b58] text-white rounded-2xl font-black text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833]"
          >
            Post Item
          </button>
          <button 
            type="button"
            className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
          >
            Save Draft
          </button>
        </div>
      </form>
    </div>
  );
};
