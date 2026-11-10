import React, { useState } from 'react';
import { MailWarning, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useUser } from '../context/UserContext';

export const VerificationBanner: React.FC = () => {
  const { user, isLoggedIn, refreshUserProfile } = useUser();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isLoggedIn || !user || user.is_email_verified !== false || user.role === 'Admin' || user.is_staff) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await api.post('/auth/resend-verification/');
      if (res.already_verified) {
        await refreshUserProfile();
        toast.success('Your email is already verified!');
        return;
      }
      if (res.sent === false) {
        toast.error(res.error || res.message || 'Verification email could not be delivered.');
        return;
      }
      setSent(true);
      toast.success(res.message || 'Verification email sent! Please check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Could not send verification email right now.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-amber-900 text-xs md:text-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MailWarning className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Please verify <strong>{user.email}</strong> to place orders, sell items, or submit KYC verification.
          </span>
        </div>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors disabled:opacity-60 cursor-pointer"
        >
          {sent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
          {sending ? 'Sending...' : sent ? 'Email Sent — Resend' : 'Resend Verification Email'}
        </button>
      </div>
    </div>
  );
};

