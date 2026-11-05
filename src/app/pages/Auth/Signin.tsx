/**
 * ==============================================================================
 * STUDENT SIGN-IN PAGE (Signin.tsx)
 * ==============================================================================
 * This page handles user authentication for returning students and administrators.
 *
 * Core Features:
 * 1. Role-Aware Post-Login Redirection:
 *    - Administrators -> Redirected to `/admin` dashboard.
 *    - Sellers -> Redirected to `/seller` studio (or previous page via `returnTo`).
 *    - Buyers -> Redirected to the page they were previously attempting to visit
 *      (e.g., product page or cart), defaulting to `/`.
 * 2. Form State:
 *    - Controlled inputs for email and password.
 *    - Submits credentials to `login()` in UserContext.
 * 3. Quick Links:
 *    - Sign-in with Google button (Firebase integration).
 *    - Link to create a new student account (`/signup`).
 * ==============================================================================
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { ShieldCheck, Mail, Lock, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../../context/UserContext';

export const Signin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Handle keystroke changes for controlled form inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ----------------------------------------------------------------------------
  // Handler: Sign-In Form Submission
  // ----------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData);

      // Check if account was scheduled for deletion within the 30-day grace period
      try {
        const { accountDeletionStorage } = await import('../../../lib/api');
        const requests = accountDeletionStorage.getAll();
        const pending = requests.find((r: any) => r.userEmail === formData.email && r.status === 'pending');
        if (pending) {
          accountDeletionStorage.updateStatus(pending.id, 'reviewed', 'User logged in within 30-day grace period - deletion cancelled & account restored');
          toast.success("Welcome back! Your pending account deletion has been cancelled and your account is fully restored.", { duration: 6000 });
        } else {
          toast.success("Welcome back to Unimart!");
        }
      } catch {
        toast.success("Welcome back to Unimart!");
      }

      // Role-based routing: Admin -> /admin, Seller -> /seller, Buyer -> / or returnTo
      const user = JSON.parse(localStorage.getItem('unimart_user_session') || 'null');
      const role = user?.role || user?.is_staff ? (user?.is_staff ? 'Admin' : user?.role) : 'Buyer';
      
      if (role === 'Admin' || user?.is_staff) {
        navigate('/admin');
      } else if (role === 'Seller') {
        const returnTo = (location.state as any)?.returnTo;
        navigate(returnTo || '/seller');
      } else {
        const returnTo = (location.state as any)?.returnTo;
        navigate(returnTo || '/');
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password");
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
        {/* Header Icon & Greeting */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#a14b58] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#a14b584d]">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500">Sign in to continue to Unimart</p>
        </div>

        {/* Social Authentication */}
        <div className="space-y-4 mb-8">
          <button 
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-gray-700"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">Or with Email</span></div>
        </div>

        {/* Sign In Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Email or Username</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="email"
                required
                placeholder="you@st.ug.edu.gh"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-bold text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-[#a14b58] font-bold">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                onChange={handleInputChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#a14b58] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b584d] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>

        {/* Sign Up Redirect Footer */}
        <div className="mt-8 text-center pt-8 border-t border-gray-100">
          <p className="text-gray-500">
            New to Unimart? <Link to="/signup" className="text-[#a14b58] font-bold">Create Account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
