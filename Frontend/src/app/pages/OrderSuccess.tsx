import React from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Package, Calendar, ArrowRight, Home } from 'lucide-react';
import { motion } from 'motion/react';

export const OrderSuccess = () => {
  const orderNumber = "UNIM-7294-GH";
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15 }}
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600"
      >
        <CheckCircle2 className="w-12 h-12" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Payment Successful!</h1>
        <p className="text-lg text-gray-500 mb-12">
          Your order has been placed and is being processed by the sellers. 
          Check your email for the receipt and next steps.
        </p>

        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-left space-y-6 mb-12">
          <div className="flex justify-between items-center pb-6 border-b border-gray-50">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Order Number</p>
              <p className="text-lg font-bold text-gray-900">{orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Status</p>
              <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full">Processing</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1">3 Items Purchased</p>
                <p className="text-xs text-gray-500">Expect delivery in 1-2 days</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1">Feb 4, 2026</p>
                <p className="text-xs text-gray-500">Order date and time</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/shop" 
            className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-2"
          >
            Continue Shopping
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            to="/" 
            className="px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
