import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { CreditCard, Truck, MapPin, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { UniversitySelector } from '../components/common/UniversitySelector';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { trackOrderInterest } from '../utils/personalization';
import { ImageWithFallback } from '../components/common/ImageWithFallback';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, deliveryFee, total, clearCart, refreshCart } = useCart();
  const { user, refreshUserProfile } = useUser();

  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'cash'>('paystack');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    phone: '',
    university: user?.university || '',
    hostelRoom: '',
  });

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Add items to your cart before proceeding to checkout.</p>
        <Link to="/shop" className="px-8 py-3.5 bg-[#a14b58] text-white rounded-2xl font-bold">
          Start Shopping
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && user.is_email_verified === false) {
      toast.error("Please verify your email address before placing an order. Click 'Resend Verification Email' in the banner above.");
      return;
    }
    if (!formData.fullName.trim() || !formData.phone.trim()) {
      toast.error('Please fill in your name and phone number');
      return;
    }

    setLoading(true);
    try {
      const createdOrder = await api.post('/orders/', {
        full_name: formData.fullName.trim(),
        phone_number: formData.phone.trim(),
        university: formData.university,
        hostel_room: formData.hostelRoom.trim(),
        total_amount: total,
        payment_method: paymentMethod,
        cart_items: items.map((i) => ({
          product_id: Number(i.id) || i.id,
          quantity: i.quantity,
        })),
      });

      const purchasedCategories = items.map((i) => i.category).filter(Boolean);
      trackOrderInterest(purchasedCategories);
      await clearCart();
      refreshCart().catch(() => {});
      refreshUserProfile().catch(() => {});
      toast.success('Order placed successfully! Waiting for seller confirmation.');
      navigate('/order-success', { state: { order: createdOrder } });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#a14b58] mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>

      <form onSubmit={handlePlaceOrder} className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center text-[#a14b58]">
                <MapPin className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Campus Delivery Location</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Kofi Mensah"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Phone Number (MoMo Enabled)</label>
                <input
                  type="tel"
                  required
                  placeholder="024 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">University Institution</label>
                <UniversitySelector
                  value={formData.university}
                  onChange={(name) => setFormData({ ...formData, university: name })}
                  required
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-700">Hall of Residence &amp; Room Number</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Jean Nelson Hall, Block B, Room 204"
                  value={formData.hostelRoom}
                  onChange={(e) => setFormData({ ...formData, hostelRoom: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center text-[#a14b58]">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payment Arrangement</h2>
                <p className="text-xs text-gray-500">Coordinate payment directly with the student seller upon meetup/delivery</p>
              </div>
            </div>

            <div className="space-y-4">
              <label
                className={`relative flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all ${
                  paymentMethod === 'paystack'
                    ? 'border-[#a14b58] bg-[#fcf6f7] ring-4 ring-[#f3d7db]'
                    : 'border-gray-100 hover:border-[#f3d7db]'
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
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100 text-[#a14b58] font-bold text-xs">
                    MoMo
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Direct Mobile Money (MTN MoMo / Telecel / AT)</p>
                    <p className="text-xs text-gray-500">Pay directly to the seller&apos;s verified MoMo number</p>
                  </div>
                </div>
                {paymentMethod === 'paystack' && <CheckCircle2 className="w-6 h-6 text-[#a14b58]" />}
              </label>

              <label
                className={`relative flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-[#a14b58] bg-[#fcf6f7] ring-4 ring-[#f3d7db]'
                    : 'border-gray-100 hover:border-[#f3d7db]'
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
                    <Truck className="w-6 h-6 text-[#a14b58]" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Cash on Campus Inspection &amp; Pickup</p>
                    <p className="text-xs text-gray-500">Pay cash in person after inspecting the product</p>
                  </div>
                </div>
                {paymentMethod === 'cash' && <CheckCircle2 className="w-6 h-6 text-[#a14b58]" />}
              </label>
            </div>
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl sticky top-28">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary ({items.length})</h2>

            <div className="space-y-4 mb-6 max-h-56 overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                    <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity} • GH₵{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100 mb-6 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">GH₵{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Estimated Delivery / Handover</span>
                <span className="font-bold text-gray-900">GH₵{deliveryFee.toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Total Payable</span>
                <span className="text-2xl font-black text-[#a14b58]">GH₵{total.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#a14b58] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#863b48] transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#a14b5833] disabled:opacity-50"
            >
              {loading ? 'Submitting Order...' : 'Confirm Order with Seller'}
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="mt-4 text-[11px] text-center text-gray-500 leading-relaxed">
              Direct buyer-seller settlement. By confirming, you acknowledge our{' '}
              <Link to="/legal/refunds-returns" target="_blank" className="text-[#a14b58] underline">
                Refunds
              </Link>
              ,{' '}
              <Link to="/legal/delivery" target="_blank" className="text-[#a14b58] underline">
                Delivery
              </Link>
              , and{' '}
              <Link to="/legal/payments-fees" target="_blank" className="text-[#a14b58] underline">
                Payment
              </Link>{' '}
              policies.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
