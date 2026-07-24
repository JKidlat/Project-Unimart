import React, { useState } from 'react';
import { Search, MoreVertical, CheckCircle, XCircle, Eye, Ban, TrendingUp } from 'lucide-react';
import { AdminLayout } from './AdminLayout';

interface User {
  id: string;
  name: string;
  email: string;
  university: string;
  role: 'Buyer' | 'Seller' | 'Both';
  verified: boolean;
  status: 'Active' | 'Suspended';
  joinDate: string;
  totalPurchases: number;
  totalSales: number;
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Kwame Mensah',
    email: 'kwame.mensah@ug.edu.gh',
    university: 'UG - Legon',
    role: 'Both',
    verified: true,
    status: 'Active',
    joinDate: '2024-01-15',
    totalPurchases: 12,
    totalSales: 8
  },
  {
    id: '2',
    name: 'Abena Osei',
    email: 'abena.osei@knust.edu.gh',
    university: 'KNUST',
    role: 'Buyer',
    verified: true,
    status: 'Active',
    joinDate: '2024-02-20',
    totalPurchases: 5,
    totalSales: 0
  },
  {
    id: '3',
    name: 'Emmanuel Boateng',
    email: 'emmanuel.b@ucc.edu.gh',
    university: 'UCC',
    role: 'Seller',
    verified: false,
    status: 'Active',
    joinDate: '2024-03-01',
    totalPurchases: 0,
    totalSales: 15
  },
  {
    id: '4',
    name: 'Sarah Appiah',
    email: 'sarah.appiah@upsa.edu.gh',
    university: 'UPSA',
    role: 'Both',
    verified: true,
    status: 'Suspended',
    joinDate: '2023-11-10',
    totalPurchases: 8,
    totalSales: 3
  }
];

/**
 * UserManagement Component
 * 
 * Admin interface for managing users with:
 * - User table with search and filters
 * - User verification status
 * - Suspend/activate actions
 * - View detailed profiles
 */
export const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [users, setUsers] = useState(mockUsers);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'Active' ? 'Suspended' : 'Active' as 'Active' | 'Suspended' }
        : user
    ));
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage student accounts and verification</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Total Users</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">12,482</p>
            <p className="text-xs text-green-600 font-bold mt-1">↑ 12% from last month</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Verified</span>
              <CheckCircle className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">9,841</p>
            <p className="text-xs text-gray-500 mt-1">78.8% verification rate</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Active Today</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <p className="text-3xl font-black text-gray-900">3,247</p>
            <p className="text-xs text-gray-500 mt-1">26% of total users</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Suspended</span>
              <Ban className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">24</p>
            <p className="text-xs text-red-600 font-bold mt-1">Requires attention</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {(['All', 'Active', 'Suspended'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    statusFilter === status
                      ? 'bg-[#a14b58] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    University
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#a14b58] to-[#c86371] rounded-xl flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                            {user.verified && <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />}
                          </div>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{user.university}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="text-gray-700 font-medium">Purchases: {user.totalPurchases}</p>
                        <p className="text-gray-700 font-medium">Sales: {user.totalSales}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        user.status === 'Active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleUserStatus(user.id)}
                          className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
                            user.status === 'Active' ? 'text-red-600' : 'text-green-600'
                          }`}
                          title={user.status === 'Active' ? 'Suspend' : 'Activate'}
                        >
                          {user.status === 'Active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
