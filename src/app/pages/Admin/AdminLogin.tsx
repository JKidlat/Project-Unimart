/**
 * ==============================================================================
 * CREATOR & ADMINISTRATOR SECURE PORTAL (AdminLogin.tsx)
 * ==============================================================================
 * This page serves as the dedicated security checkpoint for platform administrators.
 *
 * Security Rules:
 * 1. Dedicated Email Whitelist:
 *    - Only verified admin accounts (seeded with `jansah.klintaps@gmail.com`) are
 *      permitted access.
 *    - Uses `authenticateAdminCredentials` from `adminAuth.ts`.
 * 2. Default Access Credentials:
 *    - Master Admin Email: `jansah.klintaps@gmail.com`
 *    - Initial Password: `unimartadmin1234`
 * 3. Quick-Fill Demo Helper:
 *    - Provides a one-click button for the creator to auto-fill credentials
 *      during development and demonstration.
 * 4. Post-Login Routing:
 *    - Upon successful authentication, directs immediately to `/admin`.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ShieldCheck, Lock, Mail, ArrowRight, KeyRound, Sparkles, AlertCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../../context/UserContext';
import { toast } from 'sonner';
import { 
  authenticateAdminCredentials, 
  MASTER_ADMIN_EMAIL, 
  CO_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  getAuthorizedAdmins
} from '../../../lib/adminAuth';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useUser();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      // 1. Prioritize authentic server-side Django JWT authentication
      try {
        await login({ email: formData.email, password: formData.password });
        const sessionUser = JSON.parse(localStorage.getItem('unimart_user_session') || '{}');
        if (sessionUser?.is_staff || sessionUser?.role === 'Admin') {
          toast.success(`Welcome back, ${sessionUser.name || 'Admin'}! Access granted.`);
          navigate('/admin');
          return;
        } else if (sessionUser?.email) {
          throw new Error('Access denied. This account does not possess administrator credentials.');
        }
      } catch (backendErr: any) {
        // If server explicitly denied credentials due to not being staff, rethrow
        if (backendErr.message?.includes('Access denied')) {
          throw backendErr;
        }

        // 2. Offline / local development fallback verification
        const authResult = authenticateAdminCredentials(formData.email, formData.password);
        if (authResult.success && authResult.admin) {
          await login({
            id: authResult.admin.id,
            name: authResult.admin.name,
            email: authResult.admin.email,
            university: 'Unimart Headquarters (Admin)',
            role: 'Admin',
            profilePic: null,
            joinDate: authResult.admin.createdAt,
            referralCode: 'UNIM-CREATOR-001',
            is_staff: true,
          });
          toast.success(`Welcome back, ${authResult.admin.name}! Access granted.`);
          navigate('/admin');
          return;
        }
        throw new Error(backendErr.message || authResult.error || 'Invalid administrator credentials');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to authenticate admin credentials');
      setErrorMessage(err.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillMaster = () => {
    setFormData({
      email: MASTER_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
    });
    setErrorMessage(null);
    toast.info('Primary Creator credentials populated.');
  };

  const handleQuickFillCoAdmin = () => {
    setFormData({
      email: CO_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
    });
    setErrorMessage(null);
    toast.info('Co-Admin credentials populated.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0e11] via-[#2a1318] to-[#120709] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#a14b58]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#c86371]/15 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/15 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-7">
          <div className="w-16 h-16 bg-gradient-to-br from-[#a14b58] to-[#c86371] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#a14b58]/40 border border-white/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <span className="inline-block px-3 py-1 bg-[#a14b58]/30 text-[#f3d7db] text-[11px] font-extrabold uppercase tracking-widest rounded-full border border-[#a14b58]/40 mb-2">
            Creator Access
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white">Unimart Admin</h1>
          <p className="text-white/60 text-xs mt-1">
            Restricted to authorized administrator email accounts only
          </p>
        </div>

        {/* Authorized Access Notice */}
        <div className="mb-5 p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/70 flex items-start gap-2">
          <Info className="w-4 h-4 text-[#f3d7db] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-white">Authorized Creator Accounts:</p>
            <p className="font-mono text-[#f3d7db]">{MASTER_ADMIN_EMAIL}</p>
            <p className="font-mono text-[#f3d7db]">{CO_ADMIN_EMAIL}</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="leading-tight">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/80">Authorized Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="jansah.klintaps@gmail.com"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#c86371]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-white/80">Admin Password</label>
              <span className="text-[10px] text-white/50">Default: unimartadmin1234</span>
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
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#a14b58]/40 flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
          <button
            type="button"
            onClick={handleQuickFillMaster}
            disabled={isLoading}
            className="w-full py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Quick Fill: jansah.klintaps@gmail.com
          </button>

          <button
            type="button"
            onClick={handleQuickFillCoAdmin}
            disabled={isLoading}
            className="w-full py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-300" />
            Quick Fill: abrahamkwesijames@gmail.com
          </button>

          <div className="text-center">
            <Link to="/" className="text-xs text-white/50 hover:text-white transition-colors">
              ← Return to Student Marketplace
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
