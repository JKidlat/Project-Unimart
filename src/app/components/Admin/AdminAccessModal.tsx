/**
 * ==============================================================================
 * ADMIN ACCESS & SECURITY MODAL (AdminAccessModal.tsx)
 * ==============================================================================
 * This modal dialog allows administrators to manage platform access privileges:
 *
 * Tab 1: "Add Administrator"
 * - Enter an email address to grant admin privileges.
 * - Auto-generates a secure temporary password (e.g. `unimart_a8K2mX`).
 * - Provides a one-click "Copy Credentials" button to share with the new admin.
 * - Displays the roster of active administrators with remove buttons (protecting
 *   the master creator account).
 *
 * Tab 2: "Change Password"
 * - Allows the currently logged-in administrator to change their own password.
 * - Verifies current password before saving new credentials.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { 
  X, UserPlus, KeyRound, Lock, ShieldCheck, Copy, 
  Check, Trash2, RefreshCw, AlertCircle, Sparkles, UserCheck 
} from 'lucide-react';
import { 
  getAuthorizedAdmins, 
  addAdminAccount, 
  changeAdminPassword, 
  removeAdminAccount, 
  generateAutoPassword,
  MASTER_ADMIN_EMAIL,
  type AdminAccount 
} from '../../../lib/adminAuth';
import { useUser } from '../../context/UserContext';
import { toast } from 'sonner';

// Props passed from AdminLayout
interface AdminAccessModalProps {
  isOpen: boolean;      // Whether modal is visible on screen
  onClose: () => void;  // Callback to dismiss the modal
}

export const AdminAccessModal: React.FC<AdminAccessModalProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'addAdmin' | 'changePassword'>('addAdmin');
  
  // Add Admin state
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [generatedPass, setGeneratedPass] = useState(generateAutoPassword());
  const [copiedKey, setCopiedKey] = useState(false);
  const [adminsList, setAdminsList] = useState<AdminAccount[]>(getAuthorizedAdmins());

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegeneratePassword = () => {
    setGeneratedPass(generateAutoPassword());
    setCopiedKey(false);
  };

  const handleCopyCredentials = (email: string, pass: string) => {
    const text = `Unimart Admin Access\nEmail: ${email}\nPassword: ${pass}\nLogin at: http://localhost:5173/admin/login`;
    navigator.clipboard.writeText(text);
    toast.success('Admin login credentials copied to clipboard');
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;

    const res = addAdminAccount(newAdminEmail, newAdminName);
    if (!res.success) {
      toast.error(res.error || 'Failed to add admin');
      return;
    }

    toast.success(`Admin added! Email: ${newAdminEmail} | Auto-generated password created.`);
    setAdminsList(getAuthorizedAdmins());
    setNewAdminEmail('');
    setNewAdminName('');
    setGeneratedPass(generateAutoPassword());
  };

  const handleRemoveAdmin = (id: string, email: string) => {
    if (confirm(`Remove administrator privileges for "${email}"?`)) {
      const res = removeAdminAccount(id);
      if (!res.success) {
        toast.error(res.error || 'Failed to remove admin');
        return;
      }
      setAdminsList(getAuthorizedAdmins());
      toast.success(`Admin "${email}" removed.`);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (!user?.email) {
      setPasswordError('User email not identified.');
      return;
    }

    const res = changeAdminPassword(user.email, currentPassword, newPassword);
    if (!res.success) {
      setPasswordError(res.error || 'Failed to change password.');
      toast.error(res.error || 'Password update failed');
      return;
    }

    toast.success('Admin password updated successfully! Please use your new password next time you sign in.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#a14b58] to-[#c86371] text-white flex items-center justify-center shadow-lg shadow-[#a14b58]/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Admin Access & Security
            </h2>
            <p className="text-xs text-gray-500">
              Manage platform administrators, auto-generate passwords, and update security credentials
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-2xl mb-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('addAdmin')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'addAdmin'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-4 h-4 text-[#a14b58]" />
            Add & Manage Admins ({adminsList.length})
          </button>
          <button
            onClick={() => setActiveTab('changePassword')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'changePassword'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Lock className="w-4 h-4 text-[#a14b58]" />
            Change My Password
          </button>
        </div>

        {/* Tab 1: Add Other Admins with Auto Password */}
        {activeTab === 'addAdmin' && (
          <div className="space-y-6 overflow-y-auto pr-1 flex-1">
            {/* Add Admin Form */}
            <form onSubmit={handleAddAdmin} className="bg-[#faf8f8] p-5 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-gray-700 tracking-wider">
                  Create New Administrator
                </span>
                <span className="text-[11px] text-[#a14b58] font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Password Generator Active
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Admin Email *</label>
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="partner@campus.edu.gh"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Admin Name / Label (Optional)</label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="e.g. Campus Lead Kwame"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                  />
                </div>
              </div>

              {/* Auto Generated Password Preview */}
              <div className="p-3.5 bg-white rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Automatic Generated Password for this Admin:
                  </span>
                  <span className="font-mono font-black text-sm text-[#a14b58]">
                    {generatedPass}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Generate another password"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPass);
                      setCopiedKey(true);
                      toast.success('Password copied to clipboard');
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white text-xs font-black rounded-xl transition-all shadow-md shadow-[#a14b58]/30 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Authorize & Add Administrator
              </button>
            </form>

            {/* Current Admins List */}
            <div>
              <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-3">
                Currently Authorized Admin Accounts
              </h3>
              <div className="space-y-2.5">
                {adminsList.map((admin) => (
                  <div
                    key={admin.id}
                    className="p-3.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/60 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">{admin.name}</span>
                        {admin.isMaster ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#fcf6f7] text-[#a14b58] border border-[#f3d7db]">
                            Primary Creator
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            {admin.role}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 font-mono text-[11px] truncate mt-0.5">{admin.email}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(admin.email, admin.password)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                        title="Copy Login Credentials"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {!admin.isMaster && admin.email.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase() && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                          title="Remove Admin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === 'changePassword' && (
          <form onSubmit={handleChangePassword} className="space-y-4 flex-1 overflow-y-auto">
            <div className="p-3.5 rounded-xl bg-[#fcf6f7] border border-[#f3d7db] text-xs text-[#a14b58]">
              <span className="font-bold block">Active Account:</span>
              <span className="font-mono font-bold text-gray-800">{user?.email || MASTER_ADMIN_EMAIL}</span>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password (default: unimartadmin1234)"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secure password (min 6 characters)"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
              />
            </div>

            <div className="pt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-[#a14b58] hover:bg-[#863b48] text-white text-xs font-black rounded-xl transition-all shadow-md shadow-[#a14b58]/30"
              >
                Save New Password
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
