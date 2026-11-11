import React, { useEffect, useState } from 'react';
import {
  User, Bell, Shield, Trash2, LogOut,
  ChevronRight, Camera, GraduationCap, ArrowLeft,
  ToggleLeft, ToggleRight, AlertTriangle, Loader2, Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router';

import { useUser } from '../context/UserContext';
import { UniversitySelector } from '../components/common/UniversitySelector';
import type { UniversityOption } from '../../hooks/useUniversities';
import { api } from '../../lib/api';

export const AccountSettings = () => {
  const {
    user,
    updateProfile,
    uploadAvatar,
    linkGoogleAccount,
    notificationSettings,
    updateNotificationSettings,
    logout,
  } = useUser();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmSecret, setDeleteConfirmSecret] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setFullName(user.name);
    }
  }, [user?.name]);

  if (!user) return null;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = fullName.trim();
    if (!cleaned) {
      toast.error('Full name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ name: cleaned });
      toast.success('Profile details saved.');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save profile details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      toast.success('Profile picture saved!');
    } catch (err: any) {
      const msg = err?.message || 'Failed to upload profile picture. Please use a valid JPG, PNG, WebP, or GIF image under 5 MB.';
      setAvatarError(msg);
      toast.error(msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRoleSwitch = async () => {
    if (user.role === 'Buyer' && user.kyc_status !== 'approved') {
      toast.info('Complete student seller KYC verification to unlock a Seller account.');
      navigate('/kyc?mode=buyer_upgrade');
      return;
    }
    const newRole = user.role === 'Buyer' ? 'Seller' : 'Buyer';
    try {
      await updateProfile({ role: newRole });
      toast.success(`Switched to ${newRole} mode!`);
    } catch (err: any) {
      toast.error(err.message || 'Unable to change role.');
    }
  };

  const handleUniversityChange = async (name: string, uni?: UniversityOption | null) => {
    if (!name) return;
    try {
      await updateProfile({ university: name, universityId: uni?.id ?? undefined });
      toast.success(`Default university updated to ${name}`);
    } catch (err: any) {
      toast.error(err.message || 'Unable to update university.');
    }
  };

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    try {
      await linkGoogleAccount();
      toast.success('Google Sign-In is now linked to your Unimart account!');
    } catch (err: any) {
      toast.error(err.message || 'Unable to link Google account.');
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleToggleNotification = (key: keyof typeof notificationSettings) => {
    updateNotificationSettings({ [key]: !notificationSettings[key] });
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteConfirmSecret.trim()) {
      toast.error('Please enter your password (or account email if you signed up with Google) to confirm deletion.');
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await api.post<{ message: string }>('/auth/delete-account/', {
        password: deleteConfirmSecret,
        confirm_email: deleteConfirmSecret.trim(),
        reason: deleteReason.trim() || 'User requested account deletion',
      });
      toast.success(res?.message || 'Your account has been permanently deleted.');
      setShowDeleteModal(false);
      logout();
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err?.message || 'Unable to authorize account deletion. Please verify your credentials.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/profile" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900">Account Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-[#a14b58]" />
            Profile Information
          </h2>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="flex flex-col items-center gap-2">
              <div className="relative group">
                <div className="w-24 h-24 rounded-3xl bg-[#fcf6f7] flex items-center justify-center text-2xl font-black text-[#a14b58] overflow-hidden border-2 border-[#f3d7db] shadow-inner">
                  {uploadingAvatar ? (
                    <Loader2 className="w-7 h-7 animate-spin text-[#a14b58]" />
                  ) : user.profilePic ? (
                    <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                  )}
                </div>
                <label
                  className={`absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-gray-100 text-[#a14b58] transition-all ${
                    uploadingAvatar ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadingAvatar}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <span className="text-[11px] text-gray-400">JPG, PNG, WebP or GIF (max 5 MB)</span>
              {avatarError && <p className="text-xs text-red-600 text-center max-w-[180px]">{avatarError}</p>}
            </div>

            <form onSubmit={handleSaveName} className="flex-1 w-full space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none font-medium"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email Address</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium text-gray-400 cursor-not-allowed"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile || fullName.trim() === user.name}
                  className="px-5 py-2.5 bg-[#a14b58] text-white rounded-xl text-xs font-bold hover:bg-[#863b48] transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Marketplace Settings */}
        <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#a14b58]" />
            Marketplace Preferences
          </h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">Current Role</p>
                <p className="text-sm text-gray-500">
                  You are currently a <span className="text-[#a14b58] font-bold">{user.role}</span>
                </p>
              </div>
              <button
                onClick={handleRoleSwitch}
                className="px-4 py-2 bg-[#fcf6f7] text-[#a14b58] rounded-xl text-sm font-bold border border-[#f3d7db] hover:bg-[#f3d7db] transition-all"
              >
                Switch to {user.role === 'Buyer' ? 'Seller' : 'Buyer'}
              </button>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-gray-900 block">Default University</label>
              <UniversitySelector value={user.university} onChange={handleUniversityChange} />
              <p className="text-[10px] text-gray-400 font-medium italic">
                This affects the products and deals shown in your feed.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div>
                <p className="font-bold text-gray-900">Google Sign-In</p>
                <p className="text-sm text-gray-500">
                  {user.hasFirebaseLinked
                    ? 'Your Google account is linked for one-click sign-in.'
                    : 'Link your Google identity matching your verified Unimart email.'}
                </p>
              </div>
              {user.hasFirebaseLinked ? (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  Linked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  disabled={linkingGoogle}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {linkingGoogle ? 'Linking...' : 'Link Google Account'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#a14b58]" />
            Notifications
          </h2>

          <div className="space-y-4">
            {Object.entries(notificationSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span className="font-bold text-gray-700 capitalize">{key} Notifications</span>
                <button
                  onClick={() => handleToggleNotification(key as keyof typeof notificationSettings)}
                  className="text-[#a14b58] hover:scale-110 transition-transform"
                >
                  {value ? (
                    <ToggleRight className="w-8 h-8 fill-[#a14b58] text-[#f3d7db]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-50/30 rounded-[2.5rem] p-8 border border-red-100">
          <h2 className="text-xl font-bold mb-6 text-red-600 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security &amp; Danger Zone
          </h2>

          <div className="space-y-4">
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#a14b58] group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-[#a14b58] group-hover:bg-[#fcf6f7]">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-bold text-gray-700">Logout of all sessions</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3 text-sm">
              <div>
                <span className="font-bold text-gray-800 block">Privacy &amp; Data Protection</span>
                <span className="text-xs text-gray-500">
                  Protected under Ghana Data Protection Act, 2012 (Act 843)
                </span>
              </div>
              <Link to="/legal/privacy" target="_blank" className="text-xs font-bold text-[#a14b58] hover:underline shrink-0">
                View Policy
              </Link>
            </div>

            <button
              onClick={() => {
                setDeleteConfirmSecret('');
                setDeleteReason('');
                setShowDeleteModal(true);
              }}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-red-500 group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-red-600 block">Delete Account</span>
                  <span className="text-[10px] text-gray-400">
                    Permanently delete or anonymize your personal data under Act 843
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </section>
      </div>

      {/* Authorized Account Deletion Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <motion.form
            onSubmit={handleDeleteAccount}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Confirm Account Deletion</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed">
              Under Ghana&apos;s Data Protection Act, 2012 (Act 843), deleting your account immediately revokes active sessions, erases personal profile/KYC/wishlist/cart data, and hides any active store listings.
            </p>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/60 text-xs text-amber-900 mb-5 leading-relaxed">
              Where historical order records exist, transaction ledgers are retained in anonymized form for legal and accounting compliance while all identifying personal information is erased.
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Confirm Password (or your account email if registered without a password) *
                </label>
                <input
                  type="password"
                  required
                  value={deleteConfirmSecret}
                  onChange={(e) => setDeleteConfirmSecret(e.target.value)}
                  placeholder="Enter password to authorize deletion"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Reason for closure (optional):</label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Graduated from university, not selling anymore..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                className="flex-1 py-3.5 px-6 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deletingAccount}
                className="flex-1 py-3.5 px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 text-sm disabled:opacity-60"
              >
                {deletingAccount ? 'Deleting Account...' : 'Delete My Account'}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
};
