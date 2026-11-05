import React, { useState } from 'react';
import { useParams, Link } from 'react-router';
import { 
  ShoppingCart, Heart, MessageCircle, Share2, 
  ShieldCheck, Truck, RotateCcw, Star, ChevronRight,
  MapPin, CheckCircle, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { products } from '../data/mockData';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { ProductCard } from '../components/ProductCard';
import { ChatWindow } from '../components/Chat/ChatWindow';
import { ReviewsSection } from '../components/Reviews/ReviewsSection';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';

// Mock reviews data
const mockReviews = [
  {
    id: '1',
    reviewerName: 'Kwame Mensah',
    reviewerUniversity: 'UG - Legon',
    rating: 5,
    reviewText: 'Excellent condition! The MacBook works perfectly and the seller was very professional. Met on campus and everything went smoothly.',
    datePosted: '2 days ago',
    verified: true,
    helpfulCount: 12
  },
  {
    id: '2',
    reviewerName: 'Abena Osei',
    reviewerUniversity: 'KNUST',
    rating: 4,
    reviewText: 'Good quality textbook. A bit worn but still very readable. Great price for students on a budget.',
    datePosted: '1 week ago',
    verified: true,
    helpfulCount: 5
  },
  {
    id: '3',
    reviewerName: 'Emmanuel Boateng',
    reviewerUniversity: 'UCC',
    rating: 5,
    reviewText: 'Fast delivery and great communication. The item was exactly as described. Highly recommend this seller!',
    datePosted: '2 weeks ago',
    verified: false,
    helpfulCount: 8
  }
];

export const ProductDetails = () => {
  const { id } = useParams();
  const product = products.find(p => p.id === id) || products[0];
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState(product.image);
  const [quantity, setQuantity] = useState(1);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      <AnimatePresence>
        {isChatOpen && <ChatWindow seller={product.seller} onClose={() => setIsChatOpen(false)} />}
      </AnimatePresence>

      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
        <Link to="/" className="hover:text-[#a14b58]">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/shop" className="hover:text-[#a14b58]">Shop</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12 mb-20">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
            <ImageWithFallback
              src={selectedImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[product.image, product.image, product.image, product.image].map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                  selectedImage === img ? 'border-[#a14b58] shadow-lg' : 'border-transparent hover:border-[#f3d7db]'
                }`}
              >
                <ImageWithFallback src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-[#fcf6f7] text-[#a14b58] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {product.condition}
              </span>
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-bold text-gray-900">{product.seller.rating}</span>
                <span className="text-sm text-gray-400 font-normal">(12 Reviews)</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{product.name}</h1>
            <div className="flex items-center gap-2 mb-6 text-gray-500">
              <MapPin className="w-4 h-4 text-[#a14b58]" />
              <span className="text-sm font-medium">{product.university}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-4xl font-bold text-gray-900">GH₵{product.price}</span>
              {product.oldPrice && (
                <span className="text-xl text-gray-400 line-through">GH₵{product.oldPrice}</span>
              )}
              {product.oldPrice && product.oldPrice > product.price && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                  {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF
                </span>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-[2rem] p-6 mb-8 border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <div className="flex items-center gap-1 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full border border-green-100">
                <ShieldCheck className="w-3 h-3" />
                VERIFIED STUDENT
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-4">Seller Information</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#fcf6f7] rounded-2xl flex items-center justify-center text-[#a14b58] font-bold text-lg border border-[#f3d7db]">
                  {product.seller.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-gray-900">{product.seller.name}</p>
                    {product.seller.verified && <CheckCircle className="w-4 h-4 text-blue-500 fill-current text-white" />}
                  </div>
                  <p className="text-xs text-gray-500">Student at {product.university}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#f3d7db] rounded-xl text-sm font-bold text-gray-700 hover:bg-[#fcf6f7] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#a14b58]" />
                Chat
              </button>
            </div>
          </div>

          <div className="space-y-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-200 rounded-2xl overflow-hidden bg-white">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors text-gray-600 font-bold"
                >
                  -
                </button>
                <span className="px-6 py-3 font-bold text-gray-900 border-x border-gray-200">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors text-gray-600 font-bold"
                >
                  +
                </button>
              </div>
              <button 
                onClick={() => addToCart(product, quantity)}
                className="flex-1 bg-[#a14b58] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#a14b5833]"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
              <button 
                onClick={() => toast.success(`Saved "${product.name}" to your wishlist!`)}
                className="p-4 border-2 border-[#f3d7db] text-[#a14b58] rounded-2xl hover:bg-[#fcf6f7] transition-all"
              >
                <Heart className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Safe Meetup</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <AlertCircle className="w-5 h-5 text-[#a14b58]" />
                <span className="text-sm font-medium">Report Listing</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8">
            <h3 className="font-bold text-gray-900 mb-4">Description</h3>
            <p className="text-gray-600 leading-relaxed">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mb-20">
        <ReviewsSection 
          productName={product.name}
          reviews={mockReviews}
          canWriteReview={true}
        />
      </div>

      {/* Related Products */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">You might also like</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
};