import React from 'react';
import { 
  Users, ShoppingBag, DollarSign, TrendingUp, 
  AlertTriangle, CheckCircle2, MoreVertical, Search,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { motion } from 'motion/react';
import { AdminLayout } from './AdminLayout';

const data = [
  { name: 'Mon', sales: 4000, users: 2400 },
  { name: 'Tue', sales: 3000, users: 1398 },
  { name: 'Wed', sales: 2000, users: 9800 },
  { name: 'Thu', sales: 2780, users: 3908 },
  { name: 'Fri', sales: 1890, users: 4800 },
  { name: 'Sat', sales: 2390, users: 3800 },
  { name: 'Sun', sales: 3490, users: 4300 },
];

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div className={`flex items-center gap-1 text-sm font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
        {trend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(trend)}%
      </div>
    </div>
    <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
    <h3 className="text-3xl font-black text-gray-900">{value}</h3>
  </div>
);

export const AdminDashboard = () => {
  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500">Welcome back, Super Admin. Here's what's happening today.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search reports, users..." 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
              />
            </div>
            <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Users" value="12,482" icon={Users} trend={12} color="bg-blue-500" />
          <StatCard title="Active Listings" value="3,842" icon={ShoppingBag} trend={8} color="bg-purple-500" />
          <StatCard title="Total Revenue" value="GH₵84,200" icon={DollarSign} trend={-2} color="bg-green-500" />
          <StatCard title="Reported Items" value="14" icon={AlertTriangle} trend={-24} color="bg-red-500" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-gray-900">Revenue Overview</h3>
              <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a14b58" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#a14b58" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#a14b58" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-900 mb-8">Recent Verifications</h3>
            <div className="space-y-6">
              {[
                { name: 'Emmanuel Boateng', school: 'UG - Legon', status: 'Pending' },
                { name: 'Sarah Mensah', school: 'KNUST', status: 'Approved' },
                { name: 'John Appiah', school: 'UCC', status: 'Approved' },
                { name: 'Abigail Osei', school: 'UPSA', status: 'Pending' },
              ].map((user, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center text-[#a14b58] font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.school}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                    user.status === 'Approved' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                  }`}>
                    {user.status}
                  </span>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 bg-gray-50 text-[#a14b58] font-bold rounded-xl hover:bg-[#fcf6f7] transition-all">
              View All Applications
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};