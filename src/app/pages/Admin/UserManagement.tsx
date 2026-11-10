/**
 * ==============================================================================
 * ADMIN USER & ACCOUNT MANAGEMENT (UserManagement.tsx)
 * ==============================================================================
 * Connected strictly to `/api/admin/users/` and `/api/admin/users/<id>/`.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  CheckCircle,
  Eye,
  Ban,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Phone,
  GraduationCap,
  Calendar,
  ShoppingCart,
  DollarSign,
  X,
  UserCog,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { AdminAccessModal } from '../../components/Admin/AdminAccessModal';
import {
  AdminLoadingState,
  AdminErrorState,
  formatAdminDate,
} from '../../components/Admin/AdminStateFeedback';
import { api } from '../../../lib/api';
import { toast } from 'sonner';

interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  university: string;
  phone: string;
  role: 'Buyer' | 'Seller' | 'Admin';
  verified: boolean;
  is_email_verified: boolean;
  is_active: boolean;
  status: 'Active' | 'Suspended';
  date_joined: string | null;
  totalPurchases: number;
  totalSales: number;
  spent: number;
  earned: number;
}

interface UsersResponse {
  stats: {
    total_users: number;
    total_buyers: number;
    active_sellers: number;
    verified_students: number;
    suspended_users: number;
  };
  results: AdminUserItem[];
}

export const UserManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Buyer' | 'Seller' | 'Admin'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [stats, setStats] = useState<UsersResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<UsersResponse>('/admin/users/');
      setUsers(Array.isArray(res?.results) ? res.results : []);
      setStats(res?.stats || null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load users from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.university.toLowerCase().includes(q) ||
      user.phone.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleUserStatus = async (target: AdminUserItem) => {
    try {
      const res = await api.patch<{ user: AdminUserItem }>(`/admin/users/${target.id}/`, {
        is_active: !target.is_active,
      });
      toast.success(`${target.name} is now ${res.user.status.toLowerCase()}.`);
      await loadUsers();
      if (selectedUser?.id === target.id) {
        setSelectedUser(res.user);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to update user status.');
    }
  };

  const handleChangeStudentRole = async (target: AdminUserItem, nextRole: 'Buyer' | 'Seller') => {
    try {
      const res = await api.patch<{ user: AdminUserItem }>(`/admin/users/${target.id}/`, {
        role: nextRole,
      });
      toast.success(`${target.name} updated to ${nextRole}.`);
      await loadUsers();
      if (selectedUser?.id === target.id) {
        setSelectedUser(res.user);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to change role.');
    }
  };

  const handleGraduateSeller = async (target: AdminUserItem) => {
    try {
      const res = await api.patch<{ user: AdminUserItem }>(`/admin/users/${target.id}/`, {
        action: 'graduate_seller',
      });
      toast.success('Graduated seller converted to Buyer and active listings deactivated.');
      await loadUsers();
      if (selectedUser?.id === target.id) {
        setSelectedUser(res.user);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to graduate seller.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">User Management</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Manage registered student accounts, seller verification standing, and suspensions
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadUsers}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsAccessModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#a14b58]/30 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Admin Security</span>
            </button>
          </div>
        </div>

        {loading && users.length === 0 ? (
          <AdminLoadingState label="Loading registered users..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={loadUsers} />
        ) : (
          <>
            {/* Real Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Total Users</span>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.total_users ?? users.length}</p>
                <p className="text-[11px] text-gray-500 font-medium mt-1">
                  {stats?.total_buyers ?? 0} buyers registered
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Verified Students</span>
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.verified_students ?? 0}</p>
                <p className="text-[11px] text-gray-500 mt-1">Student ID / KYC approved</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Active Sellers</span>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.active_sellers ?? 0}</p>
                <p className="text-[11px] text-gray-500 mt-1">Active student vendors</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Suspended</span>
                  <Ban className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.suspended_users ?? 0}</p>
                <p className="text-[11px] text-red-600 font-bold mt-1">Inactive / suspended holds</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users by name, email, phone, or university..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-xs sm:text-sm font-medium"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                  >
                    <option value="All">All Roles</option>
                    <option value="Buyer">Buyers</option>
                    <option value="Seller">Sellers</option>
                    <option value="Admin">Admins</option>
                  </select>

                  <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold">
                    {(['All', 'Active', 'Suspended'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          statusFilter === status
                            ? 'bg-[#a14b58] text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#faf8f8] border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">University</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Verification</th>
                      <th className="px-5 py-3.5">Account Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                          No user accounts found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#a14b58] to-[#c86371] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                                <p className="text-[11px] text-gray-400">{user.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium text-gray-800">{user.university}</p>
                            <p className="text-[11px] text-gray-400">Joined {formatAdminDate(user.date_joined)}</p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                                user.role === 'Admin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : user.role === 'Seller'
                                  ? 'bg-[#fcf6f7] text-[#a14b58] border border-[#f3d7db]'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {user.verified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                Verified
                              </span>
                            ) : user.is_email_verified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Email Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <ShieldAlert className="w-3 h-3 text-amber-600" />
                                Unverified
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black ${
                                user.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  user.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                              />
                              {user.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="p-1.5 hover:bg-[#fcf6f7] text-gray-500 hover:text-[#a14b58] rounded-lg transition-colors"
                                title="View Profile"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {user.role !== 'Admin' && (
                                <div className="relative group inline-block">
                                  <button
                                    className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition-colors"
                                    title="Change Student Role"
                                  >
                                    <UserCog className="w-4 h-4" />
                                  </button>
                                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white shadow-xl rounded-xl border border-gray-100 p-1 z-30 min-w-[150px] text-left">
                                    <p className="text-[10px] uppercase font-black text-gray-400 px-2 py-1">Student Role</p>
                                    <button
                                      onClick={() => handleChangeStudentRole(user, 'Buyer')}
                                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 ${
                                        user.role === 'Buyer' ? 'text-[#a14b58]' : 'text-gray-700'
                                      }`}
                                    >
                                      Set as Buyer
                                    </button>
                                    <button
                                      onClick={() => handleChangeStudentRole(user, 'Seller')}
                                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 ${
                                        user.role === 'Seller' ? 'text-[#a14b58]' : 'text-gray-700'
                                      }`}
                                    >
                                      Set as Seller
                                    </button>
                                    {user.role === 'Seller' && (
                                      <button
                                        onClick={() => handleGraduateSeller(user)}
                                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-50 text-amber-800 border-t border-gray-100 mt-1"
                                      >
                                        Graduate Seller
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              <button
                                onClick={() => toggleUserStatus(user)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  user.is_active ? 'hover:bg-red-50 text-red-600' : 'hover:bg-green-50 text-green-600'
                                }`}
                                title={user.is_active ? 'Suspend Account' : 'Reactivate Account'}
                              >
                                {user.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a14b58] to-[#c86371] text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-[#a14b58]/30">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">{selectedUser.name}</h3>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#fcf6f7] text-[#a14b58] border border-[#f3d7db]">
                      {selectedUser.role}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        selectedUser.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6 bg-[#faf8f8] p-4 rounded-2xl border border-gray-100 text-xs">
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" /> University
                  </span>
                  <p className="font-bold text-gray-800">{selectedUser.university}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verification
                  </span>
                  <p className="font-bold text-gray-800">
                    {selectedUser.verified ? 'Verified Student' : selectedUser.is_email_verified ? 'Email Verified' : 'Unverified'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </span>
                  <p className="font-bold text-gray-800">{selectedUser.phone || 'Not set'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Joined Unimart
                  </span>
                  <p className="font-bold text-gray-800">{formatAdminDate(selectedUser.date_joined)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center justify-between text-blue-700 text-xs font-bold mb-1">
                    <span>Purchases</span>
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-black text-gray-900">{selectedUser.totalPurchases} orders</p>
                  <p className="text-[11px] text-gray-500 font-medium">Spent GH₵{selectedUser.spent.toLocaleString()}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#fcf6f7] border border-[#f3d7db]">
                  <div className="flex items-center justify-between text-[#a14b58] text-xs font-bold mb-1">
                    <span>Seller Volume</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-black text-gray-900">{selectedUser.totalSales} items</p>
                  <p className="text-[11px] text-gray-500 font-medium">Earned GH₵{selectedUser.earned.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                {selectedUser.role !== 'Admin' ? (
                  <button
                    onClick={() =>
                      handleChangeStudentRole(
                        selectedUser,
                        selectedUser.role === 'Seller' ? 'Buyer' : 'Seller'
                      )
                    }
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
                  >
                    {selectedUser.role === 'Seller' ? 'Demote to Buyer' : 'Set as Seller'}
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-400 font-bold">Protected Admin Account</span>
                )}

                <button
                  onClick={() => toggleUserStatus(selectedUser)}
                  className={`px-4 py-2 font-bold text-xs rounded-xl transition-all ${
                    selectedUser.is_active
                      ? 'bg-red-50 hover:bg-red-100 text-red-600'
                      : 'bg-green-50 hover:bg-green-100 text-green-700'
                  }`}
                >
                  {selectedUser.is_active ? 'Suspend Account' : 'Reactivate Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminAccessModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />
      </div>
    </AdminLayout>
  );
};
