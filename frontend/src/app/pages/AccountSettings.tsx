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
  const { user, updateProfile, notificationSettings, updateNotificationSettings, logout } = useUser();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!user) return null;

  const handleRoleSwitch = () => {
    const newRole = user.role === 'Buyer' ? 'Seller' : 'Buyer';
    updateProfile({ role: newRole });
    toast.success(`Switched to ${newRole} mode!`);
  };

  const handleUniversityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateProfile({ university: e.target.value });
    toast.success(`Default university updated to ${e.target.value}`);
  };

  const handleToggleNotification = (key: keyof typeof notificationSettings) => {
    updateNotificationSettings({ [key]: !notificationSettings[key] });
  };

  const handleDeleteAccount = () => {
    toast.error("Account scheduled for deletion. You will be logged out.");
    setTimeout(() => {
      logout();
      navigate('/');
    }, 2000);
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

            <button 
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-red-500 group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-red-600 block">Delete Account</span>
                  <span className="text-[10px] text-gray-400">Permanently remove all your data</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Delete Account?</h3>
            <p className="text-gray-500 mb-8 leading-relaxed">
              This action cannot be undone. All your listings, orders, and messages will be permanently deleted from Unimart.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-4 px-6 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="flex-1 py-4 px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
