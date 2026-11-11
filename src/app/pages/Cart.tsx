import React from 'react';
import { Link } from 'react-router';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { formatStockStatus } from '../../lib/inventory';

export const Cart: React.FC = () => {
  const { items, updateQuantity, removeFromCart, subtotal, deliveryFee, total } = useCart();

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-10">Your Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => {
            const stockInfo = formatStockStatus(item.stock);
            const atLimit = item.stock !== undefined && item.quantity >= item.stock;
            return (
              <div key={item.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-6">
                <div className="w-full sm:w-32 aspect-square rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                  <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 hover:text-[#a14b58] transition-colors">
                        <Link to={`/product/${item.id}`}>{item.name}</Link>
                      </h3>
                      <p className="text-sm text-gray-500">{item.university}</p>
                      {stockInfo.label && (
                        <span
                          className={`inline-block mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
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
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-2 hover:bg-gray-50 transition-colors text-gray-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 font-bold text-gray-900 border-x border-gray-200">{item.quantity}</span>
                      <button
                        disabled={atLimit || stockInfo.isOutOfStock}
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-2 hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-40"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xl font-black text-gray-900">
                      GH₵{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl sticky top-28">
            <h2 className="text-xl font-bold text-gray-900 mb-8">Order Summary</h2>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">GH₵{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery (Campus Meetup)</span>
                <span className="font-bold text-gray-900">GH₵{deliveryFee.toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-black text-[#a14b58]">GH₵{total.toLocaleString()}</span>
              </div>
            </div>

            {hasStockConflict && (
              <p className="text-xs text-red-600 font-bold mb-4">
                Please remove or reduce quantities for items exceeding available stock before checking out.
              </p>
            )}

            <Link
              to="/checkout"
              onClick={(e) => {
                if (hasStockConflict) e.preventDefault();
              }}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                hasStockConflict
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-[#a14b58] text-white hover:bg-[#863b48] shadow-[#a14b5833]'
              }`}
            >
              Proceed to Checkout
              <ArrowRight className="w-5 h-5" />
            </Link>

            <p className="mt-6 text-center text-xs text-gray-400">
              Safe on-campus meetup guarantee included.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
