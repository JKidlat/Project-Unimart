import React, { useState } from 'react';
import { Gift, Copy, Check, Users, Sparkles, Share2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';

export const Referrals: React.FC = () => {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);

  const referralCode = user?.referralCode || 'UNIM-STUDENT-2026';
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Campus Referral Program</h1>
        <p className="text-gray-500">Invite course mates to Unimart and earn GH₵10 for each friend's first purchase</p>
      </div>

      <div className="bg-gradient-to-br from-[#a14b58] to-[#6f323d] rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Earn GH₵10 per friend</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">Share the savings with your campus circle</h2>
          <p className="text-[#f3d7db] mb-8 leading-relaxed">
            Every time a student from your university joins using your code and makes a purchase, you both get GH₵10 credit directly applied to your next deal.
          </p>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-mono text-lg font-bold truncate max-w-full">{referralLink}</span>
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto px-6 py-3 bg-white text-[#a14b58] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#fcf6f7] transition-all shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-black text-gray-900 mb-1">5</p>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Friends Joined</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-black text-green-600 mb-1">GH₵50</p>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Earned</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-black text-[#a14b58] mb-1">GH₵20</p>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Available Balance</p>
        </div>
      </div>
    </div>
  );
};
