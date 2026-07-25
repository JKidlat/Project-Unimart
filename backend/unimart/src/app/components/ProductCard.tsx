import React, { useState } from 'react';
import { ShoppingCart, Heart, Star, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    oldPrice?: number;
    image: string;
    discount?: number;
    university: string;
    condition: string;
    seller: {
      name: string;
      rating: number;
      verified: boolean;
    }
  }
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <Link to={`/product/${product.id}`} className="block relative aspect-square overflow-hidden bg-gray-50">
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {product.discount && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{product.discount}%
          </div>
        )}
        <button 
          className={`absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md rounded-full transition-colors ${isWishlisted ? 'text-[#a14b58]' : 'text-gray-400 hover:text-[#a14b58]'}`}
          onClick={handleWishlist}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#a14b58]' : ''}`} />
        </button>
        <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {product.university}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a14b58] bg-[#fcf6f7] px-1.5 py-0.5 rounded border border-[#f3d7db]">
            {product.condition}
          </span>
          <div className="ml-auto flex items-center gap-0.5 text-xs text-yellow-500">
            <Star className="w-3 h-3 fill-current" />
            <span className="font-medium">{product.seller.rating}</span>
          </div>
        </div>
        
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 hover:text-[#a14b58] transition-colors mb-2">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">GH₵{product.price}</span>
              {product.oldPrice && (
                <span className="text-xs text-gray-400 line-through">GH₵{product.oldPrice}</span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Seller: {product.seller.name}</p>
          </div>
          
          <button 
            onClick={handleAddToCart}
            className="p-2.5 bg-[#a14b58] text-white rounded-xl hover:bg-[#863b48] transition-colors shadow-lg shadow-[#a14b5833]"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
