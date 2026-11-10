import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { 
  ShoppingCart, Heart, MessageCircle, Share2, 
  ShieldCheck, Truck, RotateCcw, Star, ChevronRight,
  MapPin, CheckCircle, AlertCircle, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { products as defaultProducts } from '../data/mockData';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { ProductCard } from '../components/ProductCard';
import { ChatWindow } from '../components/Chat/ChatWindow';
import { ReviewsSection } from '../components/Reviews/ReviewsSection';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { trackProductView } from '../utils/personalization';

// Mock reviews data
const mockReviews = [
  {
    id: '1',
    reviewerName: 'Kwame Mensah',
    reviewerUniversity: 'UG - Legon',
    rating: 5,
    reviewText: 'Excellent condition! Item works perfectly and the seller was very professional. Met on campus and everything went smoothly.',
    datePosted: '2 days ago',
    verified: true,
    helpfulCount: 12
  },
  {
    id: '2',
    reviewerName: 'Abena Osei',
    reviewerUniversity: 'KNUST',
    rating: 4,
    reviewText: 'Good quality item. Great price for students on a budget. Met at the student hall.',
    datePosted: '1 week ago',
    verified: true,
    helpfulCount: 5
  },
  {
    id: '3',
    reviewerName: 'Emmanuel Boateng',
    reviewerUniversity: 'UCC',
    rating: 5,
    reviewText: 'Fast delivery and great communication. The item was exactly as described. Highly recommend this student seller!',
    datePosted: '2 weeks ago',
    verified: false,
    helpfulCount: 8
  }
];

export const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { isLoggedIn } = useUser();

  const [product, setProduct] = useState<any>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('unimart_products_store') || '[]');
      const found = stored.find((p: any) => String(p.id) === String(id));
      if (found) return found;
    } catch {}
    return defaultProducts.find(p => String(p.id) === String(id)) || defaultProducts[0];
  });

  const [selectedImage, setSelectedImage] = useState<string>(product.image);
  const [quantity, setQuantity] = useState<number>(1);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [allProducts, setAllProducts] = useState<any[]>(defaultProducts);

  // Load product dynamically and track view for personalization
  useEffect(() => {
    let active = true;

    api.get(`/products/${id}/`)
      .then((data) => {
        if (active && data && data.name) {
          setProduct(data);
          setSelectedImage(data.image);
          trackProductView(data);
        }
      })
      .catch(() => {
        try {
          const stored = JSON.parse(localStorage.getItem('unimart_products_store') || '[]');
          const found = stored.find((p: any) => String(p.id) === String(id));
          if (active && found) {
            setProduct(found);
            setSelectedImage(found.image);
            trackProductView(found);
            return;
          }
        } catch {}
        const fallback = defaultProducts.find(p => String(p.id) === String(id)) || defaultProducts[0];
        if (active) {
          setProduct(fallback);
          setSelectedImage(fallback.image);
          trackProductView(fallback);
        }
      });

    // Also load catalog for related products
    api.get('/products/')
      .then(res => {
        const list = res.results || res;
        if (active && Array.isArray(list)) setAllProducts(list);
      })
      .catch(() => {});

    return () => { active = false; };
  }, [id]);

  const inWishlist = isInWishlist(product.id);

  const handleToggleWishlist = () => {
    if (!isLoggedIn) {
      toast.error('Please sign in to save items to your wishlist');
      navigate('/signin', { state: { returnTo: `/product/${product.id}` } });
      return;
    }
    if (inWishlist) {
      removeFromWishlist(product.id);
      toast.info(`Removed "${product.name}" from your wishlist`);
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        university: product.university,
        category: product.category,
        condition: product.condition,
      });
      toast.success(`Saved "${product.name}" to your wishlist!`);
    }
  };

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      toast.error('Please sign in to add items to your cart');
      navigate('/signin', { state: { returnTo: `/product/${product.id}` } });
      return;
    }
    addToCart(product, quantity);
    toast.success(`${quantity}x ${product.name} added to your cart!`);
  };

  const handleBuyNow = () => {
    if (!isLoggedIn) {
      toast.error('Please sign in to complete your order');
      navigate('/signin', { state: { returnTo: '/checkout' } });
      return;
    }
    addToCart(product, quantity);
    navigate('/checkout');
  };

  const relatedProducts = allProducts
    .filter(p => p.category === product.category && String(p.id) !== String(product.id))
    .slice(0, 4);

  const sellerObj = product.seller || {
    name: 'Verified Student',
    rating: 4.8,
    verified: true,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      <AnimatePresence>
        {isChatOpen && <ChatWindow seller={sellerObj} onClose={() => setIsChatOpen(false)} />}
      </AnimatePresence>

      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8 flex-wrap">
        <Link to="/" className="hover:text-[#a14b58]">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/shop" className="hover:text-[#a14b58]">Shop</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-400 capitalize">{product.category}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-bold truncate max-w-xs">{product.name}</span>
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
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="bg-[#fcf6f7] text-[#a14b58] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {product.condition || 'Good'}
              </span>
              <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full capitalize">
                {product.category}
              </span>
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-bold text-gray-900">{sellerObj.rating || 5.0}</span>
                <span className="text-sm text-gray-400 font-normal">(Verified Campus Item)</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">{product.name}</h1>
            <div className="flex items-center gap-2 mb-6 text-gray-500 text-sm">
              <MapPin className="w-4 h-4 text-[#a14b58]" />
              <span className="font-semibold text-gray-700">{product.university_name || product.university || 'Campus wide'}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-4xl font-black text-gray-900">GH₵{Number(product.price).toLocaleString()}</span>
              {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
                <>
                  <span className="text-xl text-gray-400 line-through">GH₵{Number(product.oldPrice).toLocaleString()}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                    {Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Seller Card */}
          <div className="bg-gray-50 rounded-[2rem] p-6 mb-8 border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <div className="flex items-center gap-1 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full border border-green-100">
                <ShieldCheck className="w-3 h-3" />
                VERIFIED STUDENT SELLER
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-4 text-xs uppercase tracking-wider text-gray-400">Seller Details</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#fcf6f7] rounded-2xl flex items-center justify-center text-[#a14b58] font-bold text-lg border border-[#f3d7db]">
                  {sellerObj.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-gray-900">{sellerObj.name}</p>
                    {sellerObj.verified && <CheckCircle className="w-4 h-4 text-blue-500 fill-current text-white" />}
                  </div>
                  <p className="text-xs text-gray-500">{product.university}</p>
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

          {/* Quantity, Cart & Buy Now Actions */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-200 rounded-2xl overflow-hidden bg-white">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors text-gray-600 font-bold"
                >
                  -
                </button>
                <span className="px-5 py-3 font-bold text-gray-900 border-x border-gray-200">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors text-gray-600 font-bold"
                >
                  +
                </button>
              </div>

              <button 
                onClick={handleAddToCart}
                className="flex-1 bg-[#a14b58] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#863b48] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#a14b5833]"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>

              <button 
                onClick={handleToggleWishlist}
                className={`p-4 border-2 rounded-2xl transition-all ${
                  inWishlist
                    ? 'border-[#a14b58] bg-[#fcf6f7] text-[#a14b58]'
                    : 'border-gray-200 text-gray-400 hover:border-[#a14b58] hover:text-[#a14b58]'
                }`}
                title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Heart className={`w-6 h-6 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button
              onClick={handleBuyNow}
              className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-bold text-base hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <span>Instant Buy & Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-bold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              {product.description || 'Verified student listing on Unimart. Contact the seller for questions or meetup arrangements.'}
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

      {/* Related Products from same category */}
      {relatedProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">More in {product.category}</h2>
              <p className="text-sm text-gray-500">Other student listings from this category</p>
            </div>
            <Link to="/shop" className="text-[#a14b58] font-bold text-sm hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
