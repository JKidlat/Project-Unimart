/**
 * ==============================================================================
 * PRODUCT CARD COMPONENT (ProductCard.tsx)
 * ==============================================================================
 * This component renders an individual product listing in card format.
 * Used on the Home page, Shop catalog, Wishlist page, and Search results.
 *
 * Core Features:
 * 1. Image & Discount Display:
 *    - Uses `ImageWithFallback` to prevent broken image placeholders.
 *    - Calculates percentage savings when `oldPrice` is present (e.g. -15%).
 * 2. Auth Gating:
 *    - Clicking "Add to Cart" or the Heart "Wishlist" icon requires sign-in.
 *    - If an unauthenticated guest clicks, it displays a toast message and
 *      navigates to `/signin` with `returnTo` state.
 * 3. Wishlist Toggle:
 *    - Reads `isInWishlist(id)` from WishlistContext to dynamically color the heart
 *      icon (wine red when saved, outline gray when not saved).
 * 4. Micro-interactions:
 *    - Smooth hover lift effect using `motion.div`.
 * ==============================================================================
 */

import React from 'react';
import { Link, useNavigate } from 'react-router';
import { Heart, ShoppingCart, Star, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ImageWithFallback } from './common/ImageWithFallback';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUser } from '../context/UserContext';
import { trackCartInterest, trackWishlistInterest } from '../utils/personalization';

// Product attributes required by this card
interface Product {
  id: string | number;
  name: string;
  price: number;
  oldPrice?: number | null;
  image: string;
  university?: string;
  category?: string;
  condition?: string;
  rating?: number;
  badge?: string;
}

// Props passed from parent lists (Shop, Home, etc.)
interface ProductCardProps {
  product: Product;
  /** Optional auth gating handler passed down from the Home landing page */
  requireAuth?: (target: string) => (e: React.MouseEvent) => void;
}

export const ProductCard = ({ product, requireAuth }: ProductCardProps) => {
  // Global cart, wishlist, and authentication contexts
  const { addToCart, addItem } = useCart();
  const cartAdd = addToCart || addItem;
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { isLoggedIn } = useUser();
  const navigate = useNavigate();

  // Check if item is already saved in the buyer's wishlist
  const inWishlist = isInWishlist(product.id);

  // ----------------------------------------------------------------------------
  // Handler: Add to Cart (with guest authentication check)
  // ----------------------------------------------------------------------------
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the product details page
    if (!isLoggedIn) {
      toast.error('Please sign in to add items to your cart');
      navigate('/signin', { state: { returnTo: `/product/${product.id}` } });
      return;
    }
    if (cartAdd) {
      cartAdd({
        id: String(product.id),
        name: product.name,
        price: product.price,
        image: product.image,
        university: product.university || '',
        category: product.category || 'general',
      });
      trackCartInterest(product.category);
    }
    toast.success(`${product.name} added to cart!`);
  };

  // ----------------------------------------------------------------------------
  // Handler: Save / Remove from Wishlist (with guest authentication check)
  // ----------------------------------------------------------------------------
  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to product details page
    if (!isLoggedIn) {
      toast.error('Please sign in to save items to your wishlist');
      navigate('/signin', { state: { returnTo: '/wishlist' } });
      return;
    }
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        university: product.university,
        category: product.category,
        condition: product.condition,
        rating: product.rating,
        badge: product.badge,
      });
      trackWishlistInterest(product.category);
      toast.success('Saved to wishlist!');
    }
  };

  // Calculate percentage discount if an older/original price is specified
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : null;

  return (
    <Link
      to={`/product/${product.id}`}
      onClick={requireAuth ? requireAuth(`/product/${product.id}`) : undefined}
    >
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
      >
        {/* ============================================================== */}
        {/* Product Image & Floating Overlay Badges                        */}
        {/* ============================================================== */}
        <div className="relative h-52 overflow-hidden bg-gray-50">
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Promotional Badge (e.g. "Trending", "Hot Deal") */}
          {product.badge && (
            <div className="absolute top-3 left-3 bg-[#a14b58] text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
              <Zap className="w-3 h-3" />
              {product.badge}
            </div>
          )}

          {/* Percentage Discount Pill */}
          {discount && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
              -{discount}%
            </div>
          )}

          {/* Wishlist Heart Toggle Button */}
          <button
            id={`wishlist-${product.id}`}
            onClick={handleWishlist}
            className={`absolute bottom-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-md ${
              inWishlist
                ? 'bg-[#a14b58] text-white scale-110'
                : 'bg-white text-gray-400 hover:text-[#a14b58] hover:scale-110'
            }`}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* ============================================================== */}
        {/* Product Information: Title, Campus, Rating, and Price           */}
        {/* ============================================================== */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 flex-1">
              {product.name}
            </h3>
          </div>

          {/* Campus Tag */}
          {product.university && (
            <p className="text-[10px] text-gray-400 font-medium mb-2 truncate">
              {product.university}
            </p>
          )}

          {/* Star Rating */}
          {product.rating !== undefined && (
            <div className="flex items-center gap-1 mb-3">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold text-gray-700">{product.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Price & Add to Cart Action */}
          <div className="flex items-center justify-between mt-auto">
            <div>
              <span className="text-lg font-black text-[#a14b58]">GH₵{product.price.toLocaleString()}</span>
              {product.oldPrice && (
                <span className="text-xs text-gray-400 line-through ml-2">
                  GH₵{product.oldPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Quick Add-to-Cart Button */}
            <button
              id={`add-to-cart-${product.id}`}
              onClick={handleAddToCart}
              className="w-9 h-9 bg-[#a14b58] text-white rounded-xl flex items-center justify-center hover:bg-[#863b48] transition-all hover:scale-110 shadow-lg shadow-[#a14b581a]"
              aria-label="Add to cart"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
