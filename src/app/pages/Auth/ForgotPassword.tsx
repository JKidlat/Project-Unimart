import React, { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, CheckCircle2, KeyRound, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/password-reset/', { email: email.trim().toLowerCase() });
      setSubmitted(true);
      toast.success(res.message || 'Check your email for password reset instructions.');
    } catch (err: any) {
      toast.error(err.message || 'Unable to send reset email right now.');
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
          <h1 className="text-3xl font-black text-gray-900 mb-2">Forgot Password?</h1>
          <p className="text-gray-500 text-sm">
            Enter your registered email and we will send you a link to choose a new password.
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-6">
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold">Reset Instructions Sent</p>
              <p className="text-xs leading-relaxed">
                If an account matches <span className="font-semibold">{email}</span>, a password reset link is on its way. Please check your inbox and spam folder.
              </p>
            </div>
            <Link
              to="/signin"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#a14b58] text-white font-bold hover:bg-[#863b48] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@st.ug.edu.gh"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#a14b58] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b584d] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="text-center pt-4">
              <Link to="/signin" className="text-sm text-[#a14b58] font-bold inline-flex items-center gap-1 hover:underline">
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
