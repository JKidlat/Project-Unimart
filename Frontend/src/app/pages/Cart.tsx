import React, { useState } from 'react';
import { Link } from 'react-router';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { products } from '../data/mockData';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export const Cart = () => {
  const [cartItems, setCartItems] = useState([
    { ...products[0], quantity: 1 },
    { ...products[1], quantity: 2 },
  ]);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(items => items.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const delivery = 20;
  const total = subtotal + delivery;

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShoppingBag className="w-12 h-12 text-purple-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
        <p className="text-gray-500 mb-10 max-w-md mx-auto">
          Looks like you haven't added anything to your cart yet. Check out our student deals!
        </p>
        <Link 
          to="/shop" 
          className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-xl shadow-purple-200"
        >
          Start Shopping
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-10">Your Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {cartItems.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-6">
              <div className="w-full sm:w-32 aspect-square rounded-2xl overflow-hidden bg-gray-50 shrink-0">
                <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 hover:text-purple-600 transition-colors">
                      <Link to={`/product/${item.id}`}>{item.name}</Link>
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">{item.university}</p>
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-2 hover:bg-gray-50 transition-colors text-gray-600"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 font-bold text-gray-900 border-x border-gray-200">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-2 hover:bg-gray-50 transition-colors text-gray-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xl font-bold text-gray-900">GH₵{item.price * item.quantity}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl sticky top-28">
            <h2 className="text-xl font-bold text-gray-900 mb-8">Order Summary</h2>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">GH₵{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery (Standard)</span>
                <span className="font-bold text-gray-900">GH₵{delivery}</span>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-extrabold text-purple-600">GH₵{total}</span>
              </div>
            </div>
            
            <Link 
              to="/checkout"
              className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-200"
            >
              Checkout Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <p className="mt-6 text-center text-xs text-gray-400">
              By proceeding, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
