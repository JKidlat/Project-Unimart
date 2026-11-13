import React from 'react';
import { Link } from 'react-router';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Store, MapPin, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { formatStockStatus } from '../../lib/inventory';

export const Cart: React.FC = () => {
  const { items, sellerGroups, updateQuantity, removeFromCart, subtotal, deliveryFee, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-24 h-24 bg-[#fcf6f7] rounded-3xl flex items-center justify-center mx-auto mb-8 text-[#a14b58] shadow-lg shadow-[#a14b581a]">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">Your cart is empty</h1>
        <p className="text-gray-500 mb-10 max-w-md mx-auto">
          Looks like you haven&apos;t added anything to your cart yet. Explore textbooks, laptops, and campus essentials!
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833]"
        >
          Start Shopping
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  const hasStockConflict = items.some(
    (item) => item.stock !== undefined && (item.stock <= 0 || item.quantity > item.stock)
  );

  const isMultiVendor = sellerGroups.length > 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Your Shopping Cart</h1>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} item{items.length === 1 ? '' : 's'} across {sellerGroups.length} campus seller{sellerGroups.length === 1 ? '' : 's'}
          </p>
        </div>
        {isMultiVendor && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-[#a14b58] rounded-xl text-xs font-bold">
            <Store className="w-4 h-4" />
            <span>Multi-Vendor Order — Split into independent seller deliveries</span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {sellerGroups.map((group, groupIdx) => (
            <div
              key={group.sellerId || groupIdx}
              className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm"
            >
              {/* Seller Group Header */}
              <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#a14b58]/10 text-[#a14b58] flex items-center justify-center font-bold text-xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">{group.sellerName}</h2>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{group.sellerUniversity}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-gray-400">Subtotal: </span>
                  <span className="text-sm font-black text-[#a14b58]">GH₵{group.subtotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Items in this seller group */}
              <div className="divide-y divide-gray-100 p-2 sm:p-4 space-y-2">
                {group.items.map((item) => {
                  const stockInfo = formatStockStatus(item.stock);
                  const atLimit = item.stock !== undefined && item.quantity >= item.stock;
                  return (
                    <div key={item.id} className="p-4 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                      <div className="w-20 sm:w-24 aspect-square rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                        <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-bold text-base text-gray-900 hover:text-[#a14b58] transition-colors truncate">
                              <Link to={`/product/${item.id}`}>{item.name}</Link>
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
                            {stockInfo.label && (
                              <span
                                className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  stockInfo.tier === 'empty'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {stockInfo.label}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1.5 hover:bg-gray-50 transition-colors text-gray-600 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 font-bold text-sm text-gray-900 border-x border-gray-200">
                              {item.quantity}
                            </span>
                            <button
                              disabled={atLimit || stockInfo.isOutOfStock}
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1.5 hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-40 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-base font-black text-gray-900">
                            GH₵{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl sticky top-28">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Items Subtotal</span>
                <span className="font-bold text-gray-900">GH₵{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-gray-400" />
                  Estimated Delivery / Collection
                </span>
                <span className="font-bold text-gray-900">Calculated at Checkout</span>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Estimated Total</span>
                <span className="text-2xl font-black text-[#a14b58]">GH₵{subtotal.toLocaleString()}</span>
              </div>
            </div>

            {hasStockConflict && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                One or more items exceed remaining stock. Please adjust quantities before checkout.
              </div>
            )}

            <Link
              to="/checkout"
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
                hasStockConflict
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                  : 'bg-[#a14b58] text-white hover:bg-[#863b48] shadow-[#a14b5833]'
              }`}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <p className="mt-4 text-center text-xs text-gray-400">
              Each seller will coordinate pickup or delivery on campus directly with you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
