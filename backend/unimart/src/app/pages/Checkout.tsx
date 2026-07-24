import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { 
  CreditCard, Truck, ShieldCheck, MapPin, 
  ChevronRight, ArrowLeft, CheckCircle2, ShoppingBag, ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { products } from '../data/mockData';

export const Checkout = () => {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('paystack');

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/order-success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                <MapPin className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Delivery Information</h2>
            </div>
            
            <form className="grid sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-700">Full Name</label>
                <input 
                  type="text" 
                  placeholder="E.g. Kofi Mensah" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="024 XXX XXXX" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">University</label>
                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none">
                  <option>University of Ghana (UG)</option>
                  <option>KNUST</option>
                  <option>UCC</option>
                  <option>UPSA</option>
                </select>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-700">Hostel / Hall Name & Room Number</label>
                <textarea 
                  rows={3} 
                  placeholder="E.g. Jean Nelson Hall, Room 304" 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </form>
          </section>

          <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Payment Method</h2>
            </div>

            <div className="space-y-4">
              <label 
                className={`relative flex items-center justify-between p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                  paymentMethod === 'paystack' ? 'border-purple-600 bg-purple-50/50 ring-4 ring-purple-100' : 'border-gray-100 hover:border-purple-200'
                }`}
              >
                <input 
                  type="radio" 
                  name="payment" 
                  value="paystack" 
                  checked={paymentMethod === 'paystack'}
                  onChange={() => setPaymentMethod('paystack')}
                  className="hidden" 
                />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100">
                    <img src="https://paystack.com/favicon.png" alt="Paystack" className="w-8 h-8 object-contain" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Paystack (Momo, Card, Bank)</p>
                    <p className="text-sm text-gray-500">Pay securely with Ghanaian mobile money or cards</p>
                  </div>
                </div>
                {paymentMethod === 'paystack' && <CheckCircle2 className="w-6 h-6 text-purple-600 fill-current text-white" />}
              </label>

              <label 
                className={`relative flex items-center justify-between p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                  paymentMethod === 'cash' ? 'border-purple-600 bg-purple-50/50 ring-4 ring-purple-100' : 'border-gray-100 hover:border-purple-200'
                }`}
              >
                <input 
                  type="radio" 
                  name="payment" 
                  value="cash" 
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="hidden" 
                />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100 text-gray-400">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Pay on Pickup</p>
                    <p className="text-sm text-gray-500">Only available for on-campus meetups</p>
                  </div>
                </div>
                {paymentMethod === 'cash' && <CheckCircle2 className="w-6 h-6 text-purple-600 fill-current text-white" />}
              </label>
            </div>
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl sticky top-28">
            <h2 className="text-xl font-bold text-gray-900 mb-8">Order Summary</h2>
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                  <img src={products[0].image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{products[0].name}</p>
                  <p className="text-xs text-gray-500">Qty: 1 • GH₵{products[0].price}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                  <img src={products[1].image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{products[1].name}</p>
                  <p className="text-xs text-gray-500">Qty: 2 • GH₵{products[1].price}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100 mb-8">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">GH₵8,650</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span>
                <span className="font-bold text-gray-900">GH₵20</span>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-extrabold text-purple-600">GH₵8,670</span>
              </div>
            </div>

            <button 
              onClick={handlePlaceOrder}
              className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-200"
            >
              {paymentMethod === 'paystack' ? 'Pay with Paystack' : 'Place Order'}
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span>SSL Secured & Verified Payment</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                <span>Student Protection Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
