import React, { useEffect, useState } from 'react';
import {
  Settings, ShoppingBag, Heart, LogOut, Camera, ChevronRight, GraduationCap,
  ShieldCheck, Users, Gift, Copy, Check, Store, ShoppingCart, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';

import { useUser } from '../context/UserContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

export const Profile = () => {
  const { user, logout, isLoggedIn, refreshUserProfile } = useUser();
  const { wishlistCount } = useWishlist();
  const { itemCount: cartCount } = useCart();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      refreshUserProfile().catch(() => {});
    }
  }, [isLoggedIn]);

  if (!isLoggedIn || !user) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Please sign in to view your profile</h2>
        <Link to="/signin" className="px-6 py-3 bg-[#a14b58] text-white rounded-xl font-bold">Sign In</Link>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isSeller = user.role === 'Seller';
  const isAdmin = user.role === 'Admin' || Boolean(user.is_staff);

  const realOrdersCount = Number(user.ordersCount ?? 0);
  const realWishlistCount = Number(wishlistCount ?? user.wishlistCount ?? 0);
  const realCartCount = Number(cartCount ?? user.cartCount ?? 0);
  const realReferralsCount = Number(user.referralsCount ?? 0);
  const realSupportCount = Number(user.supportTicketsCount ?? 0);

  const menuItems = [
    ...(isSeller ? [{ icon: Store, label: 'Seller Dashboard (Post Ads, Inbox & Orders)', path: '/seller', highlight: true }] : []),
    ...(isAdmin ? [{ icon: ShieldCheck, label: 'Admin Control Center', path: '/admin', highlight: true }] : []),
    ...(!isSeller && !isAdmin ? [{ icon: Store, label: 'Become a Seller (KYC Verification)', path: '/kyc?mode=buyer_upgrade' }] : []),
    { icon: ShoppingBag, label: 'Order History & Tracking', count: realOrdersCount, path: '/orders' },
    { icon: ShoppingCart, label: 'Shopping Cart', count: realCartCount, path: '/cart' },
    { icon: Heart, label: 'Wishlist', count: realWishlistCount, path: '/wishlist' },
    { icon: Users, label: 'My Referrals', count: realReferralsCount, path: '/referrals' },
    { icon: MessageSquare, label: 'Customer Support & My Tickets', count: realSupportCount, path: '/contact' },
    { icon: Settings, label: 'Account Settings', path: '/settings' },
    { icon: ShieldCheck, label: 'Verification Center', path: '/verification' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <div className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm">
        <div className="h-32 bg-gradient-to-r from-[#a14b58] to-[#6f323d] relative" />

        <div className="px-8 pb-10">
          <div className="relative flex flex-col sm:flex-row items-end sm:items-center gap-6 -mt-12 mb-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2rem] border-4 border-white bg-[#fcf6f7] flex items-center justify-center text-4xl font-black text-[#a14b58] overflow-hidden shadow-lg border-[#f3d7db]">
                {user.profilePic ? (
                  <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                )}
              </div>
              <Link
                to="/settings"
                title="Update profile picture"
                className="absolute bottom-0 right-0 p-2 bg-white rounded-xl shadow-lg border border-gray-100 text-[#a14b58] hover:scale-110 transition-all"
              >
                <Camera className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex-1 text-center sm:text-left pt-2 sm:pt-12">
              <h1 className="text-3xl font-extrabold text-gray-900">{user.name}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                {user.university && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-[#a14b58] bg-[#fcf6f7] px-3 py-1 rounded-full border border-[#f3d7db]">
                    <GraduationCap className="w-4 h-4" />
                    {user.university}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  <ShieldCheck className="w-4 h-4" />
                  {user.role}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-2">
              {isSeller && (
                <Link to="/seller" className="px-4 py-2.5 bg-[#a14b58] text-white rounded-xl font-bold hover:bg-[#863b48] transition-all shadow-lg shadow-[#a14b581a] flex items-center gap-2 text-sm">
                  <Store className="w-4 h-4" />
                  Seller Studio
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}
              <Link to="/contact" className="px-4 py-2.5 bg-[#fcf6f7] text-[#a14b58] border border-[#f3d7db] rounded-xl font-bold hover:bg-[#f3d7db] transition-all flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4" />
                Support
              </Link>
              <Link to="/settings" className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm">
                Settings
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <Link to="/orders" className="bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl p-4 text-center border border-gray-100">
              <p className="text-2xl font-black text-gray-900">{realOrdersCount}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Orders</p>
            </Link>
            <Link to="/cart" className="bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl p-4 text-center border border-gray-100">
              <p className="text-2xl font-black text-gray-900">{realCartCount}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">In Cart</p>
            </Link>
            <Link to="/wishlist" className="bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl p-4 text-center border border-gray-100">
              <p className="text-2xl font-black text-gray-900">{realWishlistCount}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Wishlist</p>
            </Link>
            <Link to="/referrals" className="bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl p-4 text-center border border-gray-100">
              <p className="text-2xl font-black text-gray-900">{realReferralsCount}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Referrals</p>
            </Link>
          </div>

          <div className="space-y-2">
            {menuItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.path}
                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center text-[#a14b58] group-hover:bg-[#f3d7db] transition-all">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-gray-700">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {item.count !== undefined && (
                    <span className="text-sm font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-md">
                      {item.count}
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#a14b58] transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Referral System */}
      <section className="bg-gradient-to-br from-[#a14b58] to-[#6f323d] rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black">Refer &amp; Earn</h2>
            </div>
            <p className="text-[#f3d7db] text-sm max-w-sm">
              Invite your course mates and friends to join Unimart. You both get GH₵10 when they sign up using your code!
            </p>
          </div>
          <div className="w-full md:w-auto bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#f3d7db] mb-2">Your Referral Code</p>
            <div className="flex items-center gap-3">
              <span className="text-xl font-black font-mono">{user.referralCode}</span>
              <button
                onClick={handleCopy}
                className="p-2 bg-white text-[#a14b58] rounded-lg hover:scale-105 transition-all shadow-lg"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="pt-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-4 p-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all"
        >
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
          Sign Out
        </button>
      </div>
    </div>
  );
};
