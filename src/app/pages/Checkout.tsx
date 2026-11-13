import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  CreditCard,
  Truck,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  ArrowRight,
  Store,
  Clock,
  ShieldCheck,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { UniversitySelector } from '../components/common/UniversitySelector';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { trackOrderInterest } from '../utils/personalization';
import { ImageWithFallback } from '../components/common/ImageWithFallback';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, sellerGroups, subtotal, clearCart, refreshCart } = useCart();
  const { user, refreshUserProfile } = useUser();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo'>('momo');
  const [loading, setLoading] = useState(false);
  const [savePreferences, setSavePreferences] = useState(true);

  // Per-seller fulfilment method selection: { [sellerId]: 'personal_delivery' | 'collection' | 'courier' | 'custom' }
  const [sellerFulfilment, setSellerFulfilment] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    university: user?.university || '',
    hostelRoom: '',
    deliveryInstructions: '',
  });

  // Pre-load saved buyer delivery preferences
  useEffect(() => {
    async function loadSavedPreferences() {
      try {
        const prefs = await api.get<any>('/orders/buyer-delivery-preferences/');
        if (prefs) {
          setFormData((prev) => ({
            ...prev,
            university: prefs.preferred_university || prev.university,
            hostelRoom: prefs.hostel_room || prev.hostelRoom,
            phone: prefs.contact_phone || prev.phone,
            deliveryInstructions: prefs.special_instructions || prev.deliveryInstructions,
          }));
        }
      } catch {
        // Preferences not set yet, use user defaults
      }
    }
    loadSavedPreferences();
  }, []);

  // Initialize fulfilment method per seller
  useEffect(() => {
    const initialMethods: Record<string, string> = {};
    for (const group of sellerGroups) {
      const sId = group.sellerId;
      if (!sellerFulfilment[sId]) {
        const settings = group.deliverySettings || {};
        if (settings.offers_personal_delivery !== false) {
          initialMethods[sId] = 'personal_delivery';
        } else if (settings.offers_collection) {
          initialMethods[sId] = 'collection';
        } else if (settings.offers_courier) {
          initialMethods[sId] = 'courier';
        } else {
          initialMethods[sId] = 'personal_delivery';
        }
      }
    }
    if (Object.keys(initialMethods).length > 0) {
      setSellerFulfilment((prev) => ({ ...prev, ...initialMethods }));
    }
  }, [sellerGroups]);

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

  // Calculate per-seller delivery fees
  const calculateSellerDeliveryFee = (group: any, method: string): number => {
    const settings = group.deliverySettings || {};
    if (method === 'collection') return 0;
    if (settings.delivery_fee_type === 'free') return 0;
    if (settings.base_delivery_fee !== undefined && settings.base_delivery_fee !== null) {
      return Number(settings.base_delivery_fee);
    }
    return 10.0;
  };

  const totalDeliveryFee = sellerGroups.reduce((acc, group) => {
    const method = sellerFulfilment[group.sellerId] || 'personal_delivery';
    return acc + calculateSellerDeliveryFee(group, method);
  }, 0);

  const grandTotal = subtotal + totalDeliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && user.is_email_verified === false) {
      toast.error("Please verify your email address before placing an order. Click 'Resend Verification Email' in the banner above.");
      return;
    }
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.university.trim()) {
      toast.error('Please fill in your full name, phone number, and campus university.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: formData.fullName.trim(),
        phone_number: formData.phone.trim(),
        university: formData.university,
        hostel_room: formData.hostelRoom.trim(),
        delivery_instructions: formData.deliveryInstructions.trim(),
        save_delivery_preferences: savePreferences,
        payment_method: paymentMethod === 'momo' ? 'mobile_money' : 'cash_on_delivery',
        cart_items: items.map((i) => {
          const sId = String(i.seller_id || i.seller?.id || 'unknown');
          const method = sellerFulfilment[sId] || 'personal_delivery';
          return {
            product_id: Number(i.id) || i.id,
            quantity: i.quantity,
            fulfilment_method: method,
          };
        }),
      };

      const createdOrder = await api.post<any>('/orders/', payload);

      const purchasedCategories = items.map((i) => i.category).filter(Boolean);
      trackOrderInterest(purchasedCategories);
      await clearCart();
      refreshCart().catch(() => {});
      refreshUserProfile().catch(() => {});

      toast.success('Order submitted');
      navigate('/orders');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/cart"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#a14b58] mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>

      <form onSubmit={handlePlaceOrder} className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Multi-Vendor Fulfilment Coordination Section */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-[#a14b58]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Seller Fulfilment Breakdown</h2>
                  <p className="text-xs text-gray-500">
                    Each seller prepares and coordinates their items independently.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                {sellerGroups.length} Suborder{sellerGroups.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-6">
              {sellerGroups.map((group) => {
                const sId = group.sellerId;
                const chosenMethod = sellerFulfilment[sId] || 'personal_delivery';
                const sellerFee = calculateSellerDeliveryFee(group, chosenMethod);
                const settings = group.deliverySettings || {};

                return (
                  <div key={sId} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/80 pb-3">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#a14b58]" />
                        <span className="font-bold text-gray-900 text-sm">{group.sellerName}</span>
                        <span className="text-xs text-gray-500">• {group.sellerUniversity}</span>
                      </div>
                      <span className="text-xs font-bold text-[#a14b58]">
                        Items Subtotal: GH₵{group.subtotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Items miniature */}
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      {group.items.map((i) => (
                        <span key={i.id} className="bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                          {i.quantity}x {i.name}
                        </span>
                      ))}
                    </div>

                    {/* Fulfilment method options for this seller */}
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-bold text-gray-700 block">
                        Select Fulfilment Method for {group.sellerName}:
                      </label>
                      <div className="grid sm:grid-cols-2 gap-2 text-xs">
                        {settings.offers_personal_delivery !== false && (
                          <label
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              chosenMethod === 'personal_delivery'
                                ? 'border-[#a14b58] bg-white ring-2 ring-[#a14b58]/20 text-[#a14b58] font-bold'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`fulfilment_${sId}`}
                              value="personal_delivery"
                              checked={chosenMethod === 'personal_delivery'}
                              onChange={() => setSellerFulfilment((prev) => ({ ...prev, [sId]: 'personal_delivery' }))}
                              className="hidden"
                            />
                            <span>Personal Delivery (Campus)</span>
                            <span className="font-bold">
                              {settings.delivery_fee_type === 'free' ? 'Free' : `GH₵${Number(settings.base_delivery_fee || 10).toFixed(2)}`}
                            </span>
                          </label>
                        )}

                        {settings.offers_collection !== false && (
                          <label
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              chosenMethod === 'collection'
                                ? 'border-[#a14b58] bg-white ring-2 ring-[#a14b58]/20 text-[#a14b58] font-bold'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`fulfilment_${sId}`}
                              value="collection"
                              checked={chosenMethod === 'collection'}
                              onChange={() => setSellerFulfilment((prev) => ({ ...prev, [sId]: 'collection' }))}
                              className="hidden"
                            />
                            <span>Buyer Collection / Meetup</span>
                            <span className="font-bold text-green-600">GH₵0.00</span>
                          </label>
                        )}

                        {settings.offers_courier && (
                          <label
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              chosenMethod === 'courier'
                                ? 'border-[#a14b58] bg-white ring-2 ring-[#a14b58]/20 text-[#a14b58] font-bold'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`fulfilment_${sId}`}
                              value="courier"
                              checked={chosenMethod === 'courier'}
                              onChange={() => setSellerFulfilment((prev) => ({ ...prev, [sId]: 'courier' }))}
                              className="hidden"
                            />
                            <span>3rd-Party Courier</span>
                            <span className="font-bold">GH₵{Number(settings.base_delivery_fee || 15).toFixed(2)}</span>
                          </label>
                        )}
                      </div>

                      {chosenMethod === 'collection' && settings.collection_location && (
                        <p className="text-[11px] text-gray-500 bg-blue-50/70 p-2 rounded-lg border border-blue-100 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Meeting location: {settings.collection_location}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Delivery Details Form */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-[#a14b58]">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your Delivery &amp; Contact Details</h2>
                <p className="text-xs text-gray-500">Shared with sellers to arrange safe campus handoff</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Akua Mansa"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Phone Number (Call / MoMo)</label>
                <input
                  type="tel"
                  required
                  placeholder="024 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Campus Institution</label>
                <UniversitySelector
                  value={formData.university}
                  onChange={(name) => setFormData({ ...formData, university: name })}
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Hall of Residence, Room / Meeting Point</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unity Hall, Room 402, Block C"
                  value={formData.hostelRoom}
                  onChange={(e) => setFormData({ ...formData, hostelRoom: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Delivery Instructions / Hand-off Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Call when outside the hall, available after 4:00 PM"
                  value={formData.deliveryInstructions}
                  onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={savePreferences}
                    onChange={(e) => setSavePreferences(e.target.checked)}
                    className="w-4 h-4 rounded text-[#a14b58] focus:ring-[#a14b58]"
                  />
                  <span>Save this delivery information as default for future purchases</span>
                </label>
              </div>
            </div>
          </section>

          {/* Direct Payment Arrangement Notice */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-[#a14b58]">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Direct Payment Arrangement</h2>
                <p className="text-xs text-gray-500">Pay the seller directly upon meetup or delivery</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 mb-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">Zero Payment Gateway Friction: </span>
                Unimart does not process card or wallet debits on this website. You pay each student seller directly (via
                Cash or Mobile Money) once you inspect and receive your items.
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <label
                className={`p-4 border-2 rounded-2xl cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === 'momo'
                    ? 'border-[#a14b58] bg-[#fcf6f7] ring-2 ring-[#a14b58]/20 font-bold'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="momo"
                  checked={paymentMethod === 'momo'}
                  onChange={() => setPaymentMethod('momo')}
                  className="hidden"
                />
                <div>
                  <p className="font-bold text-gray-900">Direct Mobile Money (MoMo)</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">Pay seller&apos;s MoMo number at handover</p>
                </div>
                {paymentMethod === 'momo' && <CheckCircle2 className="w-5 h-5 text-[#a14b58]" />}
              </label>

              <label
                className={`p-4 border-2 rounded-2xl cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-[#a14b58] bg-[#fcf6f7] ring-2 ring-[#a14b58]/20 font-bold'
                    : 'border-gray-200 hover:border-gray-300'
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
                <div>
                  <p className="font-bold text-gray-900">Cash on Meetup / Delivery</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">Pay physical cash after inspection</p>
                </div>
                {paymentMethod === 'cash' && <CheckCircle2 className="w-5 h-5 text-[#a14b58]" />}
              </label>
            </div>
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl sticky top-28 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>

            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {sellerGroups.map((group) => {
                const sId = group.sellerId;
                const method = sellerFulfilment[sId] || 'personal_delivery';
                const sFee = calculateSellerDeliveryFee(group, method);
                return (
                  <div key={sId} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>{group.sellerName}</span>
                      <span>GH₵{(group.subtotal + sFee).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 mt-1 text-[11px]">
                      <span>Items ({group.items.length})</span>
                      <span>GH₵{group.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-[11px]">
                      <span>Delivery Fee</span>
                      <span>{sFee === 0 ? 'Free / Pickup' : `GH₵${sFee.toFixed(2)}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total Items Subtotal</span>
                <span className="font-bold text-gray-900">GH₵{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Delivery Fees</span>
                <span className="font-bold text-gray-900">GH₵{totalDeliveryFee.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Grand Total</span>
                <span className="text-2xl font-black text-[#a14b58]">GH₵{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#a14b58] text-white py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-[#863b48] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#a14b5833] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Placing Order...</span>
              ) : (
                <>
                  <span>Place Order</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="text-[11px] text-gray-500 space-y-1.5 pt-2">
              <p className="flex items-center gap-1.5 text-gray-600 font-semibold">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                <span>12-Hour Seller Confirmation Guarantee</span>
              </p>
              <p className="text-gray-400 leading-relaxed">
                Each seller receives their suborder instantly and has 12 hours to accept and coordinate delivery with you in chat.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
