import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { CheckCircle2, Package, Calendar, ArrowRight, Home } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../lib/api';

export const OrderSuccess = () => {
  const location = useLocation();
  const stateOrder = (location.state as any)?.order || null;
  const [order, setOrder] = useState<any>(stateOrder);

  useEffect(() => {
    if (stateOrder) {
      setOrder(stateOrder);
      return;
    }
    api
      .get<{ results?: any[] }>('/orders/?role=buyer')
      .then((res) => {
        const rows = Array.isArray(res?.results) ? res.results : [];
        if (rows.length > 0) setOrder(rows[0]);
      })
      .catch(() => {});
  }, [stateOrder]);

  const itemCount = order?.items
    ? order.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 1), 0)
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600"
      >
        <CheckCircle2 className="w-12 h-12" />
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Order Submitted!</h1>
        <p className="text-lg text-gray-500 mb-12">
          Your order has been sent to the seller. You can track status updates live from your Orders page.
        </p>

        {order && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-left space-y-6 mb-12">
            <div className="flex justify-between items-center pb-6 border-b border-gray-50">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Order Reference</p>
                <p className="text-lg font-bold text-gray-900">Order #{order.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Status</p>
                <span className="bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold px-3 py-1 rounded-full capitalize">
                  {String(order.status || 'pending').replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center text-[#a14b58] shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">
                    {itemCount} Item{itemCount !== 1 ? 's' : ''} • GH₵{Number(order.total_amount || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Inventory updates when seller confirms completion</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center text-[#a14b58] shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">
                    {order.created_at ? new Date(order.created_at).toLocaleString() : 'Just now'}
                  </p>
                  <p className="text-xs text-gray-500">Order timestamp</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/orders"
            className="px-8 py-4 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833] flex items-center justify-center gap-2"
          >
            Track My Orders
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/shop"
            className="px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Continue Shopping
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
