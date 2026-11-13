import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
  ShoppingCart, Heart, MessageCircle, ShieldCheck, Star,
  ChevronRight, MapPin, CheckCircle, ArrowRight, Loader2, RefreshCw,
  Truck, AlertCircle, CheckCircle2
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { ProductCard } from '../components/ProductCard';
import { ChatWindow } from '../components/Chat/ChatWindow';
import { ReviewsSection } from '../components/Reviews/ReviewsSection';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useUser } from '../context/UserContext';
import { api } from '../../lib/api';
import { trackProductView } from '../utils/personalization';
import { formatStockStatus } from '../../lib/inventory';

export const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { isLoggedIn, user } = useUser();

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  const loadProduct = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/products/${id}/`);
      setProduct(data);
      const gallery = Array.isArray(data?.images) && data.images.length > 0 ? data.images : [data?.image].filter(Boolean);
      setSelectedImage(gallery[0] || data?.image || '');
      trackProductView(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load product details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadProduct();

    api
      .get('/products/')
      .then((res) => {
        const list = res?.results || res;
        if (active && Array.isArray(list)) setAllProducts(list);
      })
      .catch(() => {});

    api
      .get(`/reviews/?product=${id}`)
      .then((res) => {
        const list = res?.results || res;
        if (active && Array.isArray(list)) {
          setReviews(
            list.map((r: any) => ({
              id: String(r.id),
              reviewerName: r.user_name || 'Student Buyer',
              reviewerUniversity: r.user_university || 'Unimart',
              rating: Number(r.rating || 5),
              reviewText: r.comment || '',
              datePosted: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent',
              verified: Boolean(r.is_verified_purchase),
              helpfulCount: 0,
            }))
          );
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <Loader2 className="w-9 h-9 animate-spin text-[#a14b58] mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-black text-gray-900">Listing unavailable</h2>
        <p className="text-sm text-gray-500">{error || 'This product could not be found.'}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={loadProduct}
            className="px-5 py-2.5 bg-[#a14b58] text-white rounded-xl text-sm font-bold inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <Link to="/shop" className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const title = product.name || product.title;
  const galleryImages: string[] =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : [];
  const stockInfo = formatStockStatus(product.stock);
  const maxSelectableQty = Math.max(1, stockInfo.count);
  const inWishlist = isInWishlist(product.id);

  const sellerRaw = product.seller_details || product.seller || {};
  const sellerObj = {
    id: sellerRaw.id,
    name: sellerRaw.business_name || sellerRaw.name || 'Verified Student',
    university: sellerRaw.university || product.university_short_name || product.university_name || 'Unimart',
    rating: Number(sellerRaw.rating ?? product.average_rating ?? 5.0),
    verified: Boolean(sellerRaw.verified),
  };

  const isOwnListing = Boolean(user?.id && sellerObj.id && Number(user.id) === Number(sellerObj.id));

  const handleToggleWishlist = async () => {
    if (!isLoggedIn) {
      toast.error('Please sign in to save items to your wishlist');
      navigate('/signin', { state: { returnTo: `/product/${product.id}` } });
      return;
    }
    if (inWishlist) {
      await removeFromWishlist(product.id);
      toast.info(`Removed "${title}" from your wishlist`);
    } else {
      await addToWishlist({
        id: product.id,
        name: title,
        price: Number(product.price),
        image: galleryImages[0] || product.image,
        university: product.university_name || product.university || '',
        category: product.category,
        condition: product.condition,
        stock: product.stock,
      });
      toast.success(`Saved "${title}" to your wishlist!`);
    }
  };

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      toast.error('Please sign in to add items to your cart');
      navigate('/signin', { state: { returnTo: `/product/${product.id}` } });
      return;
    }
    if (stockInfo.isOutOfStock) {
      toast.error('This item is currently out of stock.');
      return;
    }
    try {
      await addToCart(
        {
          id: String(product.id),
          name: title,
          price: Number(product.price),
          image: galleryImages[0] || product.image,
          university: product.university_name || product.university || '',
          category: product.category || 'others',
          stock: product.stock,
        },
        quantity
      );
    } catch {
      // Handled in CartContext
    }
  };

  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      toast.error('Please sign in to complete your order');
      navigate('/signin', { state: { returnTo: `/product/${product.id}` } });
      return;
    }
    if (stockInfo.isOutOfStock) {
      toast.error('This item is currently out of stock.');
      return;
    }
    try {
      await addToCart(
        {
          id: String(product.id),
          name: title,
          price: Number(product.price),
          image: galleryImages[0] || product.image,
          university: product.university_name || product.university || '',
          category: product.category || 'others',
          stock: product.stock,
        },
        quantity
      );
      navigate('/checkout');
    } catch {
      // Handled in CartContext
    }
  };

  const handleOpenChat = () => {
    if (!isLoggedIn) {
      toast.error('Please sign in to message the seller');
      navigate('/signin', { state: { returnTo: `/product/${product.id}` } });
      return;
    }
    if (isOwnListing) {
      toast.info('This is your own listing.');
      return;
    }
    setIsChatOpen(true);
  };

  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && String(p.id) !== String(product.id))
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      <AnimatePresence>
        {isChatOpen && (
          <ChatWindow
            productId={product.id}
            seller={{ id: sellerObj.id, name: sellerObj.name, university: sellerObj.university }}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8 flex-wrap">
        <Link to="/" className="hover:text-[#a14b58]">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/shop" className="hover:text-[#a14b58]">Shop</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-400 capitalize">{product.category_name || product.category}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-bold truncate max-w-xs">{title}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12 mb-20">
        {/* Product Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
            <ImageWithFallback src={selectedImage || galleryImages[0]} alt={title} className="w-full h-full object-cover" />
          </div>
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {galleryImages.slice(0, 5).map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedImage === img ? 'border-[#a14b58] shadow-lg' : 'border-transparent hover:border-[#f3d7db]'
                  }`}
                >
                  <ImageWithFallback src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
              <span className="bg-[#fcf6f7] text-[#a14b58] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {product.condition || 'Good'}
              </span>
              <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full capitalize">
                {product.category_name || product.category}
              </span>
              {stockInfo.label && (
                <span
                  className={`text-xs font-black px-3 py-1 rounded-full border ${
                    stockInfo.tier === 'empty'
                      ? 'bg-red-600 text-white border-red-700'
                      : stockInfo.tier === 'critical'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {stockInfo.label}
                </span>
              )}
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-bold text-gray-900">{sellerObj.rating.toFixed(1)}</span>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">{title}</h1>

            <div className="flex items-center gap-2 mb-6 text-gray-500 text-sm">
              <MapPin className="w-4 h-4 text-[#a14b58]" />
              <span className="font-semibold text-gray-700">
                {product.university_name || product.university || 'Campus wide'}
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-4xl font-black text-gray-900">
                GH₵{Number(product.price).toLocaleString()}
              </span>
              {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
                <>
                  <span className="text-xl text-gray-400 line-through">
                    GH₵{Number(product.oldPrice).toLocaleString()}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                    {Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Seller Card (clean inline mobile layout) */}
          <div className="bg-gray-50 rounded-[2rem] p-5 sm:p-6 mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">Seller</h3>
              {sellerObj.verified && (
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-green-100">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Student
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 bg-[#fcf6f7] rounded-2xl flex items-center justify-center text-[#a14b58] font-bold text-lg border border-[#f3d7db] shrink-0">
                  {sellerObj.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-gray-900 truncate">{sellerObj.name}</p>
                    {sellerObj.verified && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{sellerObj.university}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenChat}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#f3d7db] rounded-xl text-sm font-bold text-gray-700 hover:bg-[#fcf6f7] transition-colors shrink-0"
              >
                <MessageCircle className="w-4 h-4 text-[#a14b58]" />
                Chat
              </button>
            </div>
          </div>

          {/* Delivery & Fulfilment Card */}
          {(() => {
            const deliverySettings = product.delivery_settings || {};
            const sellerUni = product.university_name || product.university || sellerObj.university || '';
            const buyerUni = user?.university || '';
            const isSameCampus = Boolean(buyerUni && sellerUni && buyerUni.toLowerCase().trim() === sellerUni.toLowerCase().trim());

            return (
              <div className="bg-gray-50/90 rounded-2xl p-4 sm:p-5 border border-gray-200/80 space-y-3.5 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Truck className="w-4 h-4 text-[#a14b58]" />
                    <span>Delivery &amp; Fulfilment</span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-[#a14b58] border border-rose-100">
                    Seller Arranged
                  </span>
                </div>

                {/* Campus Compatibility Indicator */}
                {user ? (
                  isSameCampus ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-900">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Same Campus ({buyerUni}) — </span>
                        <span>Fast in-person collection and campus meetup available with this student seller!</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Cross-Campus Handoff ({sellerUni || 'Other Campus'} → {buyerUni || 'Your Campus'}) — </span>
                        <span>Coordinated via parcel courier or custom delivery arrangement.</span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>Sign in with your university account to verify campus meetup compatibility.</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Delivery Fee</span>
                    <span className="font-bold text-gray-800">
                      {deliverySettings.delivery_fee_type === 'free'
                        ? 'Free Delivery'
                        : deliverySettings.base_delivery_fee !== undefined
                        ? `GH₵${Number(deliverySettings.base_delivery_fee).toFixed(2)}`
                        : 'From GH₵10.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Prep Lead Time</span>
                    <span className="font-bold text-gray-800">
                      {deliverySettings.preparation_time === 'same_day'
                        ? 'Same Day (Within 12h)'
                        : deliverySettings.preparation_time === '1_2_days'
                        ? '1 - 2 Business Days'
                        : deliverySettings.preparation_time === '3_5_days'
                        ? '3 - 5 Business Days'
                        : 'Same Day'}
                    </span>
                  </div>
                  {deliverySettings.collection_location && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block text-[11px]">Collection / Pickup Location</span>
                      <span className="font-medium text-gray-800">{deliverySettings.collection_location}</span>
                    </div>
                  )}
                  {deliverySettings.available_days_times && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block text-[11px]">Available Hours</span>
                      <span className="font-medium text-gray-700">{deliverySettings.available_days_times}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Quantity, Cart & Instant Buy */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center border border-gray-200 rounded-2xl overflow-hidden bg-white">
                <button
                  type="button"
                  disabled={stockInfo.isOutOfStock || quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors text-gray-600 font-bold disabled:opacity-40"
                >
                  -
                </button>
                <span className="px-5 py-3 font-bold text-gray-900 border-x border-gray-200">
                  {stockInfo.isOutOfStock ? 0 : quantity}
                </span>
                <button
                  type="button"
                  disabled={stockInfo.isOutOfStock || quantity >= maxSelectableQty}
                  onClick={() => setQuantity(Math.min(maxSelectableQty, quantity + 1))}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors text-gray-600 font-bold disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={stockInfo.isOutOfStock}
                onClick={handleAddToCart}
                className={`flex-1 py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                  stockInfo.isOutOfStock
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-[#a14b58] text-white hover:bg-[#863b48] shadow-lg shadow-[#a14b5833]'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {stockInfo.isOutOfStock ? 'Out of stock' : 'Add to Cart'}
              </button>

              <button
                type="button"
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
              type="button"
              disabled={stockInfo.isOutOfStock}
              onClick={handleBuyNow}
              className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-bold text-base hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{stockInfo.isOutOfStock ? 'Currently Out of Stock' : 'Instant Buy & Checkout'}</span>
              {!stockInfo.isOutOfStock && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-bold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">
              {product.description || 'Verified student listing on Unimart. Contact the seller for questions or meetup arrangements.'}
            </p>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mb-20">
        <ReviewsSection productName={title} reviews={reviews} canWriteReview={isLoggedIn} />
      </div>

      {relatedProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                More in {product.category_name || product.category}
              </h2>
              <p className="text-sm text-gray-500">Other student listings from this category</p>
            </div>
            <Link to="/shop" className="text-[#a14b58] font-bold text-sm hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
