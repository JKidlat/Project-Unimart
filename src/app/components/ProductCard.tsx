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
import { formatStockStatus } from '../../lib/inventory';

interface Product {
  id: string | number;
  name: string;
  title?: string;
  price: number;
  oldPrice?: number | null;
  image: string;
  images?: string[];
  university?: string;
  university_name?: string;
  category?: string;
  condition?: string;
  rating?: number;
  average_rating?: number;
  badge?: string;
  stock?: number;
}

interface ProductCardProps {
  product: Product;
  requireAuth?: (target: string) => (e: React.MouseEvent) => void;
}

export const ProductCard = ({ product, requireAuth }: ProductCardProps) => {
  const { addToCart, addItem } = useCart();
  const cartAdd = addToCart || addItem;
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { isLoggedIn } = useUser();
  const navigate = useNavigate();

  const inWishlist = isInWishlist(product.id);
  const title = product.name || product.title || 'Marketplace Item';
  const coverImage = product.image || product.images?.[0] || '';
  const stockInfo = formatStockStatus(product.stock);
  const ratingVal = product.rating ?? product.average_rating;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.error('Please sign in to add items to your cart');
      navigate('/signin', { state: { returnTo: `/product/${product.id}` } });
      return;
    }
    if (stockInfo.isOutOfStock) {
      toast.error(`"${title}" is currently out of stock.`);
      return;
    }
    if (cartAdd) {
      try {
        await cartAdd({
          id: String(product.id),
          name: title,
          price: Number(product.price),
          image: coverImage,
          university: product.university_name || product.university || '',
          category: product.category || 'general',
          stock: product.stock,
        });
        trackCartInterest(product.category);
      } catch {
        // Error already toasted inside CartContext
      }
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.error('Please sign in to save items to your wishlist');
      navigate('/signin', { state: { returnTo: '/wishlist' } });
      return;
    }
    if (inWishlist) {
      await removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      try {
        await addToWishlist({
          id: product.id,
          name: title,
          price: Number(product.price),
          image: coverImage,
          university: product.university_name || product.university,
          category: product.category,
          condition: product.condition,
          rating: ratingVal,
          badge: product.badge,
          stock: product.stock,
        });
        trackWishlistInterest(product.category);
        toast.success('Saved to wishlist!');
      } catch {
        // Error toasted in WishlistContext
      }
    }
  };

  const discount =
    product.oldPrice && Number(product.oldPrice) > Number(product.price)
      ? Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)
      : null;

  return (
    <Link
      to={`/product/${product.id}`}
      onClick={requireAuth ? requireAuth(`/product/${product.id}`) : undefined}
    >
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group h-full flex flex-col"
      >
        <div className="relative h-52 overflow-hidden bg-gray-50">
          <ImageWithFallback
            src={coverImage}
            alt={title}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
              stockInfo.isOutOfStock ? 'opacity-65 grayscale-[30%]' : ''
            }`}
          />

          {product.badge && (
            <div className="absolute top-3 left-3 bg-[#a14b58] text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
              <Zap className="w-3 h-3" />
              {product.badge}
            </div>
          )}

          {discount && !stockInfo.isOutOfStock && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
              -{discount}%
            </div>
          )}

          {/* Inventory Visibility Pill — displayed only when stock < 10 */}
          {stockInfo.label && (
            <div
              className={`absolute bottom-3 left-3 text-[10px] font-black px-2.5 py-1 rounded-full shadow-md border ${
                stockInfo.tier === 'empty'
                  ? 'bg-red-600 text-white border-red-700'
                  : stockInfo.tier === 'critical'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {stockInfo.label}
            </div>
          )}

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

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 flex-1">{title}</h3>
          </div>

          {(product.university_name || product.university || (product as any).seller_details?.university) && (
            <p className="text-[10px] text-gray-400 font-medium mb-2 truncate">
              {product.university_name || product.university || (product as any).seller_details?.university}
            </p>
          )}

          {ratingVal !== undefined && (
            <div className="flex items-center gap-1 mb-3">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold text-gray-700">{Number(ratingVal).toFixed(1)}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-1">
            <div>
              <span className="text-lg font-black text-[#a14b58]">GH₵{Number(product.price).toLocaleString()}</span>
              {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
                <span className="text-xs text-gray-400 line-through ml-2">
                  GH₵{Number(product.oldPrice).toLocaleString()}
                </span>
              )}
            </div>

            <button
              id={`add-to-cart-${product.id}`}
              onClick={handleAddToCart}
              disabled={stockInfo.isOutOfStock}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                stockInfo.isOutOfStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-[#a14b58] text-white hover:bg-[#863b48] hover:scale-110 shadow-[#a14b581a]'
              }`}
              aria-label={stockInfo.isOutOfStock ? 'Out of stock' : 'Add to cart'}
              title={stockInfo.isOutOfStock ? 'Out of stock' : 'Add to cart'}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
