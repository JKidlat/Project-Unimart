/**
 * ==============================================================================
 * ADMIN LIVE ACTIVITY FEED (LiveActivity.tsx)
 * ==============================================================================
 * Displays genuine chronological platform events fetched from `/api/admin/activity/`.
 * Zero hardcoded sample pools or simulated event generators.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  ShoppingBag,
  DollarSign,
  Star,
  ShieldCheck,
  ShoppingCart,
  LifeBuoy,
  Filter,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminLayout } from './AdminLayout';
import {
  AdminLoadingState,
  AdminErrorState,
  formatAdminDateTime,
} from '../../components/Admin/AdminStateFeedback';
import { api } from '../../../lib/api';

interface ActivityItem {
  id: string;
  type: 'signup' | 'listing' | 'order' | 'payment' | 'kyc' | 'review' | 'support';
  message: string;
  subtext?: string;
  timestamp: string | null;
  user: string;
  university: string;
  amount?: string | null;
}

interface ActivityResponse {
  counts: Record<string, number>;
  results: ActivityItem[];
}

const activityIcons = {
  signup: UserPlus,
  listing: ShoppingBag,
  order: ShoppingCart,
  payment: DollarSign,
  kyc: ShieldCheck,
  review: Star,
  support: LifeBuoy,
};

const activityColors = {
  signup: 'bg-blue-500 text-blue-600',
  listing: 'bg-purple-500 text-purple-600',
  order: 'bg-indigo-500 text-indigo-600',
  payment: 'bg-emerald-500 text-emerald-600',
  kyc: 'bg-rose-500 text-rose-600',
  review: 'bg-amber-500 text-amber-600',
  support: 'bg-teal-500 text-teal-600',
};

const activityLabels: Record<string, string> = {
  signup: 'Signups',
  listing: 'Listings',
  order: 'Orders',
  payment: 'Payments',
  kyc: 'KYC Requests',
  review: 'Reviews',
  support: 'Support',
};

export const LiveActivity: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const loadActivity = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<ActivityResponse>('/admin/activity/');
      setActivities(Array.isArray(res?.results) ? res.results : []);
      setCounts(res?.counts || {});
    } catch (err: any) {
      setError(err?.message || 'Unable to load platform activity stream.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadActivity, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadActivity]);

  const filteredActivities = activities.filter((a) => typeFilter === 'all' || a.type === typeFilter);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                {autoRefresh ? 'Auto-Refresh Active (20s)' : 'Auto-Refresh Paused'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Platform Activity Log</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Chronological feed of real signups, listings, orders, payments, KYC requests, and reviews
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadActivity}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Now
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-600' : 'text-gray-400'}`} />
              {autoRefresh ? 'Auto-Refresh On' : 'Resume Auto-Refresh'}
            </button>
          </div>
        </div>

        {loading && activities.length === 0 ? (
          <AdminLoadingState label="Loading recent database activity..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={loadActivity} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {(['signup', 'listing', 'order', 'payment', 'kyc', 'review', 'support'] as const).map((type) => {
                const Icon = activityIcons[type];
                const colorClass = activityColors[type];
                const dbTotal = counts[type] ?? activities.filter((a) => a.type === type).length;

                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      typeFilter === type
                        ? 'border-[#a14b58] bg-[#fcf6f7] shadow-xs'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${colorClass.split(' ')[0]} bg-opacity-10`}>
                        <Icon className={`w-4 h-4 ${colorClass.split(' ')[1]}`} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">DB Total</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{dbTotal}</p>
                    <p className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">{activityLabels[type]}</p>
                  </button>
                );
              })}
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-700">Filter Events:</span>
                <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold flex-wrap">
                  {[
                    { id: 'all', label: 'All Events' },
                    { id: 'signup', label: 'Signups' },
                    { id: 'listing', label: 'Listings' },
                    { id: 'order', label: 'Orders' },
                    { id: 'payment', label: 'Payments' },
                    { id: 'kyc', label: 'KYC' },
                    { id: 'review', label: 'Reviews' },
                    { id: 'support', label: 'Support' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTypeFilter(tab.id)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        typeFilter === tab.id ? 'bg-[#a14b58] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-400">Showing {filteredActivities.length} database events</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              {filteredActivities.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-400">
                  No recorded platform events found for this filter yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[640px] overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {filteredActivities.map((item) => {
                      const Icon = activityIcons[item.type] || UserPlus;
                      const colorClass = activityColors[item.type] || 'bg-gray-500 text-gray-600';
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className={`p-2.5 rounded-xl ${colorClass.split(' ')[0]} bg-opacity-10 shrink-0 mt-0.5`}>
                              <Icon className={`w-5 h-5 ${colorClass.split(' ')[1]}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-gray-900 text-sm truncate">{item.message}</p>
                                {item.amount && (
                                  <span className="font-black text-[#a14b58] text-xs px-2 py-0.5 bg-[#fcf6f7] border border-[#f3d7db] rounded-md">
                                    {item.amount}
                                  </span>
                                )}
                              </div>
                              {item.subtext && (
                                <p className="text-xs text-gray-600 mt-0.5 font-medium truncate">{item.subtext}</p>
                              )}
                              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                                <span className="font-bold text-gray-700">{item.user}</span>
                                <span>•</span>
                                <span>{item.university}</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-gray-400 shrink-0 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-lg">
                            {formatAdminDateTime(item.timestamp)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};
