import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Lock, CheckCircle2, AlertCircle, ChevronRight, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const missingParams = !uid || !token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/password-reset/confirm/', {
        uid,
        token,
        new_password: password,
      });
      setDone(true);
      toast.success(res.message || 'Password updated successfully!');
      setTimeout(() => navigate('/signin'), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired password reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 flex flex-col items-center justify-center px-4 bg-gradient-to-br from-[#fcf6f7] to-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-[#a14b581a] border border-[#f3d7db] p-8 md:p-12"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#a14b58] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#a14b584d]">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Choose New Password</h1>
          <p className="text-gray-500 text-sm">Enter a strong password for your Unimart account.</p>
        </div>

        {missingParams ? (
          <div className="text-center space-y-5">
            <div className="p-5 bg-red-50 border border-red-200 rounded-2xl text-red-700 space-y-2">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="font-bold">Invalid Reset Link</p>
              <p className="text-xs">This password reset link is missing required security parameters.</p>
            </div>
            <Link
              to="/forgot-password"
              className="w-full inline-flex items-center justify-center py-3.5 rounded-2xl bg-[#a14b58] text-white font-bold hover:bg-[#863b48] transition-all"
            >
              Request a New Link
            </Link>
          </div>
        ) : done ? (
          <div className="text-center space-y-5">
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold">Password Reset Complete</p>
              <p className="text-xs">Redirecting you to sign in with your new password...</p>
            </div>
            <Link
              to="/signin"
              className="w-full inline-flex items-center justify-center py-3.5 rounded-2xl bg-[#a14b58] text-white font-bold hover:bg-[#863b48] transition-all"
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#a14b58] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b584d] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

