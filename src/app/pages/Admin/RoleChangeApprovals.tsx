/**
 * ==============================================================================
 * ADMIN ROLE CHANGE APPROVALS (RoleChangeApprovals.tsx)
 * ==============================================================================
 * Connected strictly to `/api/admin/role-requests/` and `/api/admin/role-requests/<id>/`.
 * Zero seeded mock data or localStorage persistence.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { UserCog, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from './AdminLayout';
import { AdminLoadingState, AdminErrorState, formatAdminDateTime } from '../../components/Admin/AdminStateFeedback';
import { api } from '../../../lib/api';

export interface RoleChangeRequestItem {
  id: number;
  userEmail: string;
  userName: string;
  currentRole: 'Buyer' | 'Seller';
  requestedRole: 'Buyer' | 'Seller';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  adminNote?: string;
}

export const RoleChangeApprovals: React.FC = () => {
  const [requests, setRequests] = useState<RoleChangeRequestItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processing, setProcessing] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{
        counts: { all: number; pending: number; approved: number; rejected: number };
        results: RoleChangeRequestItem[];
      }>('/admin/role-requests/');
      setRequests(Array.isArray(res?.results) ? res.results : []);
      if (res?.counts) setCounts(res.counts);
    } catch (err: any) {
      setError(err?.message || 'Unable to load role change requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleDecision = async (req: RoleChangeRequestItem, decision: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      await api.patch(`/admin/role-requests/${req.id}/`, { status: decision });
      toast.success(
        decision === 'approved'
          ? `Role updated to ${req.requestedRole} for ${req.userEmail}.`
          : `Role change request rejected for ${req.userEmail}.`
      );
      await loadRequests();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update role change request.');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = requests.filter((r) => filter === 'all' || r.status === filter);

  return (
    <AdminLayout>
      <div className="p-2 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center">
              <UserCog className="w-5 h-5 text-[#a14b58]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Role Change Approvals</h1>
              <p className="text-sm text-gray-500">
                Review student requests to transition between Buyer and Seller roles
              </p>
            </div>
          </div>
          <button
            onClick={loadRequests}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {(['pending', 'all', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-bold text-sm capitalize transition-all cursor-pointer ${
                filter === f ? 'bg-[#a14b58] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>

        {loading && requests.length === 0 ? (
          <AdminLoadingState label="Loading role change requests..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={loadRequests} />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
            <UserCog className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">No {filter === 'all' ? '' : filter} role change requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center font-black text-[#a14b58]">
                      {(req.userName || req.userEmail).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 text-base">{req.userName || req.userEmail}</h3>
                      <p className="text-xs text-gray-400">
                        {req.userEmail} • {formatAdminDateTime(req.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                      {req.currentRole} → <strong className="text-[#a14b58]">{req.requestedRole}</strong>
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${
                        req.status === 'approved'
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : req.status === 'rejected'
                          ? 'bg-red-50 text-red-700 border-red-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reason for change</p>
                  <p className="text-gray-700 font-medium">{req.reason}</p>
                </div>

                {req.adminNote && (
                  <p className="text-xs text-gray-500 mt-2 italic">Admin Note: {req.adminNote}</p>
                )}

                {req.status === 'pending' && (
                  <div className="mt-4 flex gap-3 justify-end pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleDecision(req, 'rejected')}
                      disabled={processing}
                      className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleDecision(req, 'approved')}
                      disabled={processing}
                      className="px-5 py-2 bg-green-600 text-white hover:bg-green-700 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve & Change Role
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
