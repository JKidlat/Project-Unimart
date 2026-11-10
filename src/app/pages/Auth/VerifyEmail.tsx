import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, MailCheck, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useUser } from '../../context/UserContext';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { refreshUserProfile, isLoggedIn } = useUser();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'error'
  );
  const [message, setMessage] = useState(
    token ? 'Verifying your email address...' : 'Missing verification token in the link.'
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    api.post('/auth/verify-email/', { token })
      .then(async (res) => {
        if (cancelled) return;
        setStatus('success');
        setMessage(res.message || 'Your email address has been verified!');
        await refreshUserProfile();
      })
      .catch((err: any) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(err.message || 'Verification link is invalid or has expired.');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen pt-20 pb-12 flex flex-col items-center justify-center px-4 bg-gradient-to-br from-[#fcf6f7] to-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-[#a14b581a] border border-[#f3d7db] p-8 md:p-12 text-center"
      >
        <div className="w-16 h-16 bg-[#a14b58] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#a14b584d]">
          <MailCheck className="w-8 h-8 text-white" />
        </div>

        {status === 'verifying' && (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 text-[#a14b58] animate-spin mx-auto" />
            <h1 className="text-2xl font-black text-gray-900">Verifying Email</h1>
            <p className="text-gray-500 text-sm">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Email Verified!</h1>
              <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
            </div>
            <Link
              to={isLoggedIn ? '/shop' : '/signin'}
              className="w-full inline-flex items-center justify-center py-3.5 rounded-2xl bg-[#a14b58] text-white font-bold hover:bg-[#863b48] transition-all shadow-lg shadow-[#a14b584d]"
            >
              {isLoggedIn ? 'Continue to Marketplace' : 'Sign In to Unimart'}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Verification Failed</h1>
              <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
            </div>
            <Link
              to={isLoggedIn ? '/shop' : '/signin'}
              className="w-full inline-flex items-center justify-center py-3.5 rounded-2xl bg-[#a14b58] text-white font-bold hover:bg-[#863b48] transition-all"
            >
              {isLoggedIn ? 'Return to Shop (Resend from Banner)' : 'Sign In to Request a New Link'}
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

