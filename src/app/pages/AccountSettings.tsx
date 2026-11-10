import React, { useState } from 'react';
import { 
  User, Bell, Shield, Trash2, LogOut, 
  ChevronRight, Camera, GraduationCap, ArrowLeft,
  ToggleLeft, ToggleRight, AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router';
import { universities } from '../data/mockData';

export const AccountSettings = () => {
  const { user, updateProfile, linkGoogleAccount, notificationSettings, updateNotificationSettings, logout } = useUser();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  if (!user) return null;

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

  const handleUniversityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      await updateProfile({ university: e.target.value });
      toast.success(`Default university updated to ${e.target.value}`);
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

  const handleDeleteAccount = () => {
    toast.info("Account scheduled for deletion with a 30-day grace period. You will be logged out now. Logging in within 30 days will reactivate your account.", { duration: 5000 });
    setTimeout(() => {
      logout();
      navigate('/');
    }, 2500);
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
          
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-[#fcf6f7] flex items-center justify-center text-2xl font-black text-[#a14b58] overflow-hidden border-2 border-[#f3d7db] shadow-inner">
                {user.profilePic ? (
                  <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.name.split(' ').map(n => n[0]).join('')
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-gray-100 text-[#a14b58] cursor-pointer hover:scale-110 transition-all">
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateProfile({ profilePic: reader.result as string });
                        toast.success("Profile picture updated!");
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
            
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Full Name</label>
                <input 
                  type="text" 
                  defaultValue={user.name}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none font-medium"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Email Address</label>
                <input 
                  type="email" 
                  defaultValue={user.email}
                  disabled
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-medium text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>
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
                <p className="text-sm text-gray-500">You are currently a <span className="text-[#a14b58] font-bold">{user.role}</span></p>
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
              <select 
                value={user.university}
                onChange={handleUniversityChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none font-medium"
              >
                {universities.map(uni => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 font-medium italic">This affects the products and deals shown in your feed.</p>
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
                  {value ? <ToggleRight className="w-8 h-8 fill-[#a14b58] text-[#f3d7db]" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-50/30 rounded-[2.5rem] p-8 border border-red-100">
          <h2 className="text-xl font-bold mb-6 text-red-600 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Danger Zone
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

            {/* Privacy Policy Link */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-sm">
              <div>
                <span className="font-bold text-gray-800 block">Privacy & Data Protection</span>
                <span className="text-xs text-gray-500">Learn how your student information is protected under Ghana Act 843</span>
              </div>
              <Link
                to="/legal/privacy"
                target="_blank"
                className="text-xs font-bold text-[#a14b58] hover:underline"
              >
                View Policy
              </Link>
            </div>

            <button 
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-red-500 group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-red-600 block">Request Account Deletion</span>
                  <span className="text-[10px] text-gray-400">Exercise right to erasure under Data Protection Act (Act 843)</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </section>
      </div>

      {/* Account Deletion Request Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Request Account Deletion</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed">
              Under Ghana&apos;s Data Protection Act, 2012 (Act 843), you have the right to request deletion of your account and erasure of personal data.
            </p>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/60 text-xs text-amber-900 mb-6 leading-relaxed space-y-1.5">
              <p><strong>30-Day Grace Period:</strong> Your account will be deactivated and your data safely stored for 30 days before being permanently deleted. If you log in again at any point within the next 30 days, your deletion request will be automatically cancelled and your account fully restored.</p>
              <p className="text-[11px] text-amber-800">Records associated with unresolved transactions or mandatory legal compliance will be handled in accordance with the Ghana Data Protection Act (Act 843).</p>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Reason for closure (optional):
              </label>
              <input
                type="text"
                id="deletionReasonInput"
                placeholder="e.g. Graduated from university, not selling anymore..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3.5 px-6 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const inputEl = document.getElementById('deletionReasonInput') as HTMLInputElement;
                  const reason = inputEl?.value || 'User requested account closure';
                  
                  const { accountDeletionStorage } = await import('../../lib/api');
                  accountDeletionStorage.createRequest({
                    userId: user.id || user.email,
                    userEmail: user.email,
                    userName: user.name,
                    reason,
                  });

                  handleDeleteAccount();
                }}
                className="flex-1 py-3.5 px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 text-sm"
              >
                Submit Deletion Request
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
