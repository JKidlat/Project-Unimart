/**
 * ==============================================================================
 * ADMIN USER & STUDENT ACCOUNT MANAGEMENT (UserManagement.tsx)
 * ==============================================================================
 * This page allows platform administrators to manage registered students:
 *
 * Core Features:
 * 1. User Directory:
 *    - Search and filter students by institution, account tier (Buyer, Seller, Admin),
 *      and verification status.
 * 2. Administrative Controls:
 *    - Ban / Unban accounts violating campus safety standards.
 *    - Upgrade or downgrade roles.
 *    - Review student ID credentials and transaction history.
 * 3. Administrator Provisioning:
 *    - Direct button opening the AdminAccessModal to add co-administrators.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { 
  Search, CheckCircle, XCircle, Eye, Ban, TrendingUp, 
  ShieldCheck, ShieldAlert, UserCheck, Phone, Mail, 
  GraduationCap, Calendar, ShoppingCart, DollarSign, X, 
  ArrowUpRight, ArrowDownRight, UserCog, UserPlus
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { AdminAccessModal } from '../../components/Admin/AdminAccessModal';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  university: string;
  studentId: string;
  phone: string;
  role: 'Buyer' | 'Seller' | 'Admin';
  verified: boolean;
  status: 'Active' | 'Suspended';
  joinDate: string;
  totalPurchases: number;
  totalSales: number;
  spent: number;
  earned: number;
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Kwame Mensah',
    email: 'kwame.mensah@ug.edu.gh',
    university: 'University of Ghana - Legon',
    studentId: 'UG-10849201',
    phone: '+233 24 123 4567',
    role: 'Seller',
    verified: true,
    status: 'Active',
    joinDate: '15 Jan 2024',
    totalPurchases: 12,
    totalSales: 28,
    spent: 2450,
    earned: 7800,
  },
  {
    id: '2',
    name: 'Abena Osei',
    email: 'abena.osei@knust.edu.gh',
    university: 'KNUST - Kumasi',
    studentId: 'KN-20948192',
    phone: '+233 20 890 1234',
    role: 'Buyer',
    verified: true,
    status: 'Active',
    joinDate: '20 Feb 2024',
    totalPurchases: 8,
    totalSales: 0,
    spent: 1250,
    earned: 0,
  },
  {
    id: '3',
    name: 'Emmanuel Boateng',
    email: 'emmanuel.b@ucc.edu.gh',
    university: 'University of Cape Coast (UCC)',
    studentId: 'UC-30194820',
    phone: '+233 55 456 7890',
    role: 'Seller',
    verified: false,
    status: 'Active',
    joinDate: '01 Mar 2024',
    totalPurchases: 2,
    totalSales: 15,
    spent: 450,
    earned: 3950,
  },
  {
    id: '4',
    name: 'Sarah Appiah',
    email: 'sarah.appiah@upsa.edu.gh',
    university: 'UPSA - Accra',
    studentId: 'UP-40192831',
    phone: '+233 27 678 9012',
    role: 'Buyer',
    verified: true,
    status: 'Suspended',
    joinDate: '10 Nov 2023',
    totalPurchases: 6,
    totalSales: 1,
    spent: 890,
    earned: 120,
  },
  {
    id: '5',
    name: 'Kofi Asare',
    email: 'kofi.asare@ug.edu.gh',
    university: 'University of Ghana - Legon',
    studentId: 'UG-10928374',
    phone: '+233 24 555 1234',
    role: 'Buyer',
    verified: true,
    status: 'Active',
    joinDate: '04 Apr 2024',
    totalPurchases: 4,
    totalSales: 0,
    spent: 620,
    earned: 0,
  }
];

export const UserManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Buyer' | 'Seller' | 'Admin'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id === userId) {
          const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
          toast.success(`${user.name} has been ${newStatus.toLowerCase()} successfully.`);
          if (selectedUser?.id === userId) {
            setSelectedUser({ ...user, status: newStatus });
          }
          return { ...user, status: newStatus };
        }
        return user;
      })
    );
  };

  const handlePromoteDemote = (userId: string, targetRole: 'Buyer' | 'Seller' | 'Admin') => {
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id === userId) {
          toast.success(`${user.name} role changed from ${user.role} to ${targetRole}.`);
          if (selectedUser?.id === userId) {
            setSelectedUser({ ...user, role: targetRole });
          }
          return { ...user, role: targetRole };
        }
        return user;
      })
    );
  };

  const handleGraduateSeller = (userId: string, email: string) => {
    handlePromoteDemote(userId, 'Buyer');
    try {
      const products = JSON.parse(localStorage.getItem('unimart_products_store') || '[]');
      const updated = products.map((p: any) => {
        if (p.seller_email === email || p.seller?.email === email) {
          return { ...p, status: 'deactivated', is_active: false, graduation_archived: true };
        }
        return p;
      });
      localStorage.setItem('unimart_products_store', JSON.stringify(updated));
    } catch {}
    toast.success('Graduated seller converted to buyer-only status. Active listings deactivated per Student Verification Policy.');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">User Management</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Manage student accounts, role permissions, and disciplinary standing
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAccessModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#a14b58]/30 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Admin (Auto-Password)</span>
            </button>
            <span className="text-xs bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-gray-600">
              Total Students: <strong className="text-[#a14b58]">{users.length} registered</strong>
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Total Students</span>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">12,482</p>
            <p className="text-[11px] text-green-600 font-bold mt-1">↑ 12% from last month</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Verified IDs</span>
              <CheckCircle className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">9,841</p>
            <p className="text-[11px] text-gray-500 mt-1">78.8% campus verification</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Active Sellers</span>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <p className="text-2xl font-black text-gray-900">2,140</p>
            <p className="text-[11px] text-gray-500 mt-1">Authorized campus sellers</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Suspended</span>
              <Ban className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-gray-900">24</p>
            <p className="text-[11px] text-red-600 font-bold mt-1">Disciplinary holds</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students by name, email, student ID, or university..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-xs sm:text-sm font-medium"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Role filter */}
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

              {/* Status filter */}
              <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold">
                {(['All', 'Active', 'Suspended'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
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

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#faf8f8] border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">University & ID</th>
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
                      No student accounts found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#a14b58] to-[#c86371] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                            <p className="text-[11px] text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">{user.university}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{user.studentId}</p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
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
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {user.verified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            Pending ID
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
                          {/* View Profile Modal trigger */}
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-1.5 hover:bg-[#fcf6f7] text-gray-500 hover:text-[#a14b58] rounded-lg transition-colors"
                            title="View Student Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Promote / Demote Role quick action */}
                          <div className="relative group inline-block">
                            <button
                              className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg transition-colors"
                              title="Change Role (Promote/Demote)"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white shadow-xl rounded-xl border border-gray-100 p-1 z-30 min-w-[130px] text-left">
                              <p className="text-[10px] uppercase font-black text-gray-400 px-2 py-1">Set Role</p>
                              <button
                                onClick={() => handlePromoteDemote(user.id, 'Buyer')}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 ${
                                  user.role === 'Buyer' ? 'text-[#a14b58]' : 'text-gray-700'
                                }`}
                              >
                                Demote to Buyer
                              </button>
                              <button
                                onClick={() => handlePromoteDemote(user.id, 'Seller')}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 ${
                                  user.role === 'Seller' ? 'text-[#a14b58]' : 'text-gray-700'
                                }`}
                              >
                                Promote to Seller
                              </button>
                              <button
                                onClick={() => handlePromoteDemote(user.id, 'Admin')}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 ${
                                  user.role === 'Admin' ? 'text-purple-700' : 'text-gray-700'
                                }`}
                              >
                                Promote to Admin
                              </button>
                              {user.role === 'Seller' && (
                                <button
                                  onClick={() => handleGraduateSeller(user.id, user.email)}
                                  className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-50 text-amber-800 border-t border-gray-100 mt-1"
                                  title="Graduated: Converts account to buyer-only & deactivates listings"
                                >
                                  🎓 Graduate Seller
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Suspend / Activate toggle */}
                          <button
                            onClick={() => toggleUserStatus(user.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.status === 'Active'
                                ? 'hover:bg-red-50 text-red-600'
                                : 'hover:bg-green-50 text-green-600'
                            }`}
                            title={user.status === 'Active' ? 'Suspend Student' : 'Activate Student'}
                          >
                            {user.status === 'Active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
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

        {/* Profile Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Profile Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a14b58] to-[#c86371] text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-[#a14b58]/30">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-gray-900">{selectedUser.name}</h3>
                    {selectedUser.verified && (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#fcf6f7] text-[#a14b58] border border-[#f3d7db]">
                      {selectedUser.role}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        selectedUser.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6 bg-[#faf8f8] p-4 rounded-2xl border border-gray-100 text-xs">
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" /> University
                  </span>
                  <p className="font-bold text-gray-800">{selectedUser.university}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Student ID
                  </span>
                  <p className="font-bold text-gray-800 font-mono">{selectedUser.studentId}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Phone / WhatsApp
                  </span>
                  <p className="font-bold text-gray-800">{selectedUser.phone}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Joined Unimart
                  </span>
                  <p className="font-bold text-gray-800">{selectedUser.joinDate}</p>
                </div>
              </div>

              {/* Financial & Activity Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center justify-between text-blue-700 text-xs font-bold mb-1">
                    <span>Purchases</span>
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-black text-gray-900">{selectedUser.totalPurchases} orders</p>
                  <p className="text-[11px] text-gray-500 font-medium">Spent GH₵{selectedUser.spent}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#fcf6f7] border border-[#f3d7db]">
                  <div className="flex items-center justify-between text-[#a14b58] text-xs font-bold mb-1">
                    <span>Seller Volume</span>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-black text-gray-900">{selectedUser.totalSales} items</p>
                  <p className="text-[11px] text-gray-500 font-medium">Earned GH₵{selectedUser.earned}</p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handlePromoteDemote(
                        selectedUser.id,
                        selectedUser.role === 'Seller' ? 'Buyer' : 'Seller'
                      )
                    }
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
                  >
                    {selectedUser.role === 'Seller' ? 'Demote to Buyer' : 'Promote to Seller'}
                  </button>
                </div>

                <button
                  onClick={() => toggleUserStatus(selectedUser.id)}
                  className={`px-4 py-2 font-bold text-xs rounded-xl transition-all ${
                    selectedUser.status === 'Active'
                      ? 'bg-red-50 hover:bg-red-100 text-red-600'
                      : 'bg-green-50 hover:bg-green-100 text-green-700'
                  }`}
                >
                  {selectedUser.status === 'Active' ? 'Suspend Student' : 'Reactivate Student'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Access & Team Modal */}
        <AdminAccessModal
          isOpen={isAccessModalOpen}
          onClose={() => setIsAccessModalOpen(false)}
        />
      </div>
    </AdminLayout>
  );
};
