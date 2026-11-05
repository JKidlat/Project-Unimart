/**
 * ==============================================================================
 * BUYER WISHLIST PAGE (Wishlist.tsx)
 * ==============================================================================
 * This page presents all items the student has saved for future purchase.
 *
 * Core Features:
 * 1. Persistent Storage Integration:
 *    - Uses `useWishlist()` to load saved items from browser localStorage.
 * 2. Empty State View:
 *    - When the list is empty, displays an inviting prompt and button leading
 *      back to the marketplace catalog.
 * 3. Quick Actions on Each Card:
 *    - "Move to Cart": Adds item to CartContext and removes it from the wishlist.
 *    - "Delete": Removes item from the wishlist immediately.
 * ==============================================================================
 */

import React from 'react';
import { Link } from 'react-router';
import { Heart, ArrowRight, ShoppingCart, Trash2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { ImageWithFallback } from '../components/common/ImageWithFallback';

export const Wishlist: React.FC = () => {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addItem, addToCart } = useCart();
  const cartAdd = addToCart || addItem;

  const handleMoveToCart = (item: any) => {
    addItem({
      id: String(item.id),
      name: item.name,
      price: item.price,
      image: item.image,
      university: item.university || '',
    });
    removeFromWishlist(item.id);
    toast.success(`${item.name} moved to cart!`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Your Wishlist</h1>
          <p className="text-gray-500">
            {wishlist.length === 0 ? "Items you've saved for later" : `${wishlist.length} item${wishlist.length !== 1 ? 's' : ''} saved`}
          </p>
        </div>
        <Link to="/shop" className="text-sm font-bold text-[#a14b58] hover:underline flex items-center gap-1">
          Explore Deals <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {wishlist.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm"
        >
          <div className="w-20 h-20 bg-[#fcf6f7] rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-[#f3d7db]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Tap the heart icon on any product to save it here for later.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833]"
          >
            <ShoppingBag className="w-5 h-5" />
            Browse Products
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence>
            {wishlist.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all group"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-gray-50">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {item.badge && (
                    <span className="absolute top-3 left-3 bg-[#a14b58] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {/* Remove button */}
                  <button
                    onClick={() => { removeFromWishlist(item.id); toast.success('Removed from wishlist'); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm text-[#a14b58] rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-md"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-4">
                  <Link to={`/product/${item.id}`}>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-[#a14b58] transition-colors">
                      {item.name}
                    </h3>
                  </Link>
                  {item.university && (
                    <p className="text-[10px] text-gray-400 mt-1 truncate">{item.university}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-black text-[#a14b58]">GH₵{item.price.toLocaleString()}</span>
                    <button
                      onClick={() => handleMoveToCart(item)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#a14b58] text-white rounded-xl font-bold text-xs hover:bg-[#863b48] transition-all shadow-md shadow-[#a14b581a]"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>
                  </div>
                  {item.condition && (
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2 block">{item.condition}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
