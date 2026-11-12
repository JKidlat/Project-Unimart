/**
 * ==============================================================================
 * ADMINISTRATOR SIGN-IN PORTAL (AdminLogin.tsx)
 * ==============================================================================
 * Authenticates authorized platform administrators exclusively against Django
 * backend credentials (`POST /api/auth/login/` or Google Sign-In via
 * `POST /api/auth/google/`). Never falls back to client-side passwords or mock
 * administrator sessions.
 * ==============================================================================
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../../context/UserContext';
import { toast } from 'sonner';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, isLoading: authLoading, login, loginWithGoogle, logout } = useUser();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isLoggedIn && user) {
      const isAdmin = Boolean(user.is_staff || user.is_superuser || user.role === 'Admin');
      if (!isAdmin) {
        toast.error('Access denied. Administrator credentials are required.');
      }
    }
  }, [authLoading, isLoggedIn, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0e11]">
        <div className="w-10 h-10 border-4 border-[#c86371] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoggedIn && user) {
    const isAdmin = Boolean(user.is_staff || user.is_superuser || user.role === 'Admin');
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to={user.role === 'Seller' ? '/seller' : '/'} replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage(null);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const signedInUser = await login({ email: formData.email, password: formData.password });
      const isAdmin = Boolean(signedInUser?.is_staff || signedInUser?.is_superuser || signedInUser?.role === 'Admin');

      if (!isAdmin) {
        logout();
        const msg = 'Access denied. This account does not possess administrator credentials.';
        toast.error(msg);
        setErrorMessage(msg);
        return;
      }

      toast.success(`Welcome back, ${signedInUser.name || 'Admin'}! Access granted.`);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      const msg = err?.message || 'Invalid administrator credentials.';
      toast.error(msg);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      const signedInUser = await loginWithGoogle();
      const isAdmin = Boolean(signedInUser?.is_staff || signedInUser?.is_superuser || signedInUser?.role === 'Admin');
      if (isAdmin) {
        toast.success(`Welcome back, ${signedInUser.name || 'Admin'}! Access granted.`);
        navigate('/admin', { replace: true });
      } else {
        logout();
        const msg = 'Access denied. This Google account does not possess administrator credentials.';
        toast.error(msg);
        setErrorMessage(msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Google administrator sign-in failed.';
      toast.error(msg);
      setErrorMessage(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0e11] via-[#2a1318] to-[#120709] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#a14b58]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#c86371]/15 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/15 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-7">
          <img
            src="/logo.png"
            alt="Unimart Official Logo"
            className="w-20 h-20 object-contain rounded-2xl mx-auto mb-4 shadow-xl shadow-black/50 border border-white/20"
          />
          <span className="inline-block px-3 py-1 bg-[#a14b58]/30 text-[#f3d7db] text-[11px] font-extrabold uppercase tracking-widest rounded-full border border-[#a14b58]/40 mb-2">
            Restricted Access
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white">Unimart Admin</h1>
          <p className="text-white/60 text-xs mt-1">
            Sign in with an authorized administrator account
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="leading-tight">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/80">Administrator Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="admin@unimart.gh"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#c86371]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-white/80">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-[#f3d7db] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#c86371]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || googleLoading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#a14b58]/40 flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
          <button
            type="button"
            onClick={handleGoogleAdminLogin}
            disabled={isLoading || googleLoading}
            className="w-full py-2.5 bg-white text-gray-900 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            {googleLoading ? 'Verifying Google Admin...' : 'Sign in with Google'}
          </button>

          <div className="text-center">
            <Link to="/" className="text-xs text-white/50 hover:text-white transition-colors">
              ← Return to Marketplace
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
