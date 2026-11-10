/**
 * ==============================================================================
 * ADMIN ACCESS & SECURITY MODAL (AdminAccessModal.tsx)
 * ==============================================================================
 * Database-backed administrator management & password security dialog:
 * - Tab 1: View active database administrators; Super Admins can provision or
 *   revoke staff access via `/api/admin/security/admins/`.
 * - Tab 2: Change the authenticated admin's password via `/api/auth/change-password/`.
 * ==============================================================================
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  UserPlus,
  Lock,
  ShieldCheck,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useUser } from '../../context/UserContext';
import { toast } from 'sonner';

interface AdminAccountItem {
  id: number;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin';
  is_staff: boolean;
  is_superuser: boolean;
}

interface AdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminAccessModal: React.FC<AdminAccessModalProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'admins' | 'changePassword'>('admins');

  const [adminsList, setAdminsList] = useState<AdminAccountItem[]>([]);
  const [canManageAdmins, setCanManageAdmins] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminsError, setAdminsError] = useState<string | null>(null);

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    setAdminsError(null);
    try {
      const res = await api.get<{ can_manage_admins: boolean; results: AdminAccountItem[] }>(
        '/admin/security/admins/'
      );
      setAdminsList(Array.isArray(res?.results) ? res.results : []);
      setCanManageAdmins(Boolean(res?.can_manage_admins));
    } catch (err: any) {
      setAdminsError(err?.message || 'Unable to load authorized administrators.');
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAdmins();
    }
  }, [isOpen, fetchAdmins]);

  if (!isOpen) return null;

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    setSubmittingAdmin(true);
    try {
      await api.post('/admin/security/admins/', {
        email: newAdminEmail.trim(),
        full_name: newAdminName.trim(),
        password: newAdminPassword || undefined,
      });
      toast.success(`Administrator access granted for ${newAdminEmail.trim()}.`);
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminPassword('');
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to provision administrator.');
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (id: number, email: string) => {
    if (!confirm(`Revoke administrator privileges for "${email}"? Their user account will not be deleted.`)) {
      return;
    }
    try {
      await api.delete(`/admin/security/admins/${id}/`);
      toast.success(`Administrator privileges removed for ${email}.`);
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to revoke administrator privileges.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password.';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative max-h-[90vh] flex flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#a14b58] to-[#c86371] text-white flex items-center justify-center shadow-lg shadow-[#a14b58]/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Admin Access & Security
            </h2>
            <p className="text-xs text-gray-500">
              View verified database administrators and update your security credentials
            </p>
          </div>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-2xl mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('admins')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'admins'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-4 h-4 text-[#a14b58]" />
            Administrators ({adminsList.length})
          </button>
          <button
            type="button"
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

        {activeTab === 'admins' && (
          <div className="space-y-6 overflow-y-auto pr-1 flex-1">
            {canManageAdmins && (
              <form onSubmit={handleAddAdmin} className="bg-[#faf8f8] p-5 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-gray-700 tracking-wider">
                    Authorize New Administrator (Superuser Only)
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="staff@unimart.gh"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Full Name</label>
                    <input
                      type="text"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      placeholder="e.g. Campus Moderator"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">
                    Initial Password (required for brand-new accounts; optional if promoting an existing user)
                  </label>
                  <input
                    type="password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Minimum 8 strong characters"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAdmin}
                  className="w-full py-3 bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white text-xs font-black rounded-xl transition-all shadow-md shadow-[#a14b58]/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  {submittingAdmin ? 'Saving...' : 'Grant Administrator Access'}
                </button>
              </form>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider">
                  Authorized Admin Accounts
                </h3>
                <button
                  type="button"
                  onClick={fetchAdmins}
                  className="text-xs font-bold text-[#a14b58] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {loadingAdmins ? (
                <p className="text-xs text-gray-400 py-4 text-center">Loading administrator directory...</p>
              ) : adminsError ? (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {adminsError}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {adminsList.map((admin) => (
                    <div
                      key={admin.id}
                      className="p-3.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/60 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 truncate">{admin.name}</span>
                          {admin.is_superuser ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#fcf6f7] text-[#a14b58] border border-[#f3d7db]">
                              Super Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 font-mono text-[11px] truncate mt-0.5">{admin.email}</p>
                      </div>

                      {canManageAdmins &&
                        !admin.is_superuser &&
                        admin.email.toLowerCase() !== (user?.email || '').toLowerCase() && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                            title="Revoke Admin Access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'changePassword' && (
          <form onSubmit={handleChangePassword} className="space-y-4 flex-1 overflow-y-auto">
            <div className="p-3.5 rounded-xl bg-[#fcf6f7] border border-[#f3d7db] text-xs text-[#a14b58]">
              <span className="font-bold block">Active Account:</span>
              <span className="font-mono font-bold text-gray-800">{user?.email}</span>
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
                placeholder="Enter your current password"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">New Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password (min 8 characters)"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Confirm New Password *</label>
              <input
                type="password"
                required
                minLength={8}
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
                disabled={savingPassword}
                className="flex-1 py-3 bg-[#a14b58] hover:bg-[#863b48] text-white text-xs font-black rounded-xl transition-all shadow-md shadow-[#a14b58]/30 disabled:opacity-60"
              >
                {savingPassword ? 'Updating...' : 'Save New Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
