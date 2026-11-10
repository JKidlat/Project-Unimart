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
import { ShieldCheck, Mail, Lock, ChevronRight, UserPlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { resolveUserDashboardPath, useUser } from '../../context/UserContext';

export const Signin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, linkGoogleAccount } = useUser();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [unregisteredEmail, setUnregisteredEmail] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<{ email: string; idToken: string } | null>(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Handle keystroke changes for controlled form inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const navigateAfterLogin = (signedInUser: any) => {
    const returnTo = (location.state as any)?.returnTo;
    const target = resolveUserDashboardPath(signedInUser, returnTo);
    navigate(target, { replace: true });
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setUnregisteredEmail(null);
    setPendingLink(null);
    setGoogleError(null);
    try {
      const signedInUser = await loginWithGoogle();
      toast.success(`Welcome back, ${signedInUser.name}!`);
      navigateAfterLogin(signedInUser);
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_NOT_FOUND') {
        setUnregisteredEmail(err.email || '');
        return;
      }
      if (err?.code === 'ACCOUNT_LINK_VERIFICATION_REQUIRED' && err?.pendingIdToken) {
        setPendingLink({ email: err.email || '', idToken: err.pendingIdToken });
        toast.info('Please confirm your Unimart password once to link Google Sign-In.');
        return;
      }
      const msg = err.message || 'Google sign-in failed';
      setGoogleError(msg);
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleConfirmGoogleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLink || !linkPassword) return;
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const signedInUser = await linkGoogleAccount(linkPassword, pendingLink.idToken);
      setPendingLink(null);
      setLinkPassword('');
      toast.success('Google account verified and linked! Welcome back.');
      navigateAfterLogin(signedInUser);
    } catch (err: any) {
      const msg = err.message || 'Unable to verify password for account linking.';
      setGoogleError(msg);
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Handler: Sign-In Form Submission
  // ----------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const signedInUser = await login(formData);

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

      navigateAfterLogin(signedInUser);
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
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-gray-700 disabled:opacity-60 cursor-pointer"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            {googleLoading ? 'Connecting with Google...' : 'Sign in with Google'}
          </button>

          {unregisteredEmail !== null && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <UserPlus className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Unregistered Google Account</p>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                    You don&apos;t have a Unimart account yet. Please create an account to get started.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/signup', { state: { prefillEmail: unregisteredEmail } })}
                className="w-full py-2.5 px-4 rounded-xl bg-[#a14b58] hover:bg-[#863b48] text-white font-bold text-xs transition-all cursor-pointer"
              >
                Create an account
              </button>
            </div>
          )}

          {pendingLink && (
            <form onSubmit={handleConfirmGoogleLink} className="p-4 rounded-2xl bg-[#fcf6f7] border border-[#f3d7db] space-y-3 text-sm">
              <p className="font-bold text-gray-900 text-xs">
                Confirm password for <span className="text-[#a14b58]">{pendingLink.email}</span> to link Google Sign-In:
              </p>
              <input
                type="password"
                required
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                placeholder="Enter your Unimart password"
                className="w-full px-3.5 py-2.5 bg-white border border-[#f3d7db] rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={googleLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#a14b58] hover:bg-[#863b48] text-white font-bold text-xs transition-all disabled:opacity-60 cursor-pointer"
                >
                  {googleLoading ? 'Linking...' : 'Verify & Link Google'}
                </button>
                <button
                  type="button"
                  onClick={() => { setPendingLink(null); setLinkPassword(''); }}
                  className="px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {googleError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{googleError}</span>
            </div>
          )}
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
