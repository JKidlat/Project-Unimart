/**
 * ==============================================================================
 * ADMIN KYC VERIFICATION MANAGEMENT (KYCManagement.tsx)
 * ==============================================================================
 * Connected directly to `/api/kyc/` and `/api/kyc/<id>/` in PostgreSQL.
 * Approving a submission updates database verification & upgrades buyer to Seller.
 * ==============================================================================
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, CheckCircle2, XCircle, Eye, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import { AdminLayout } from './AdminLayout';
import { AdminLoadingState, AdminErrorState, formatAdminDate } from '../../components/Admin/AdminStateFeedback';

type KYCRecord = {
  id: number;
  email: string;
  user_name?: string;
  selfieBase64: string;
  idDocBase64: string;
  institutionEmail: string;
  businessName: string;
  mode: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

export const KYCManagement: React.FC = () => {
  const [records, setRecords] = useState<KYCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<KYCRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<KYCRecord[] | { results: KYCRecord[] }>('/kyc/');
      setRecords(Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load KYC submissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (record: KYCRecord) => {
    setProcessing(true);
    try {
      await api.patch(`/kyc/${record.id}/`, { status: 'approved', rejectionReason: null });
      toast.success(`KYC approved for ${record.email}`);
      setSelected(null);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve KYC submission.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (record: KYCRecord) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setProcessing(true);
    try {
      await api.patch(`/kyc/${record.id}/`, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
      });
      toast.success(`KYC rejected for ${record.email}`);
      setRejectionReason('');
      setSelected(null);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject KYC submission.');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = records.filter((r) => filter === 'all' || r.status === filter);
  const counts = {
    all: records.length,
    pending: records.filter((r) => r.status === 'pending').length,
    approved: records.filter((r) => r.status === 'approved').length,
    rejected: records.filter((r) => r.status === 'rejected').length,
  };

  const statusBadge = (s: string) => {
    if (s === 'approved') return 'bg-green-50 text-green-700 border-green-100';
    if (s === 'rejected') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-amber-50 text-amber-700 border-amber-100';
  };

  return (
    <AdminLayout>
      <div className="p-2 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#a14b58]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">KYC Verification Requests</h1>
              <p className="text-sm text-gray-500">Review and approve or reject seller identity verifications</p>
            </div>
          </div>
          <button
            onClick={load}
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

        {loading && records.length === 0 ? (
          <AdminLoadingState label="Loading KYC submissions from database..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
            <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">No {filter === 'all' ? '' : filter} KYC submissions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                      {r.selfieBase64 ? (
                        <img src={r.selfieBase64} alt="Selfie" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-gray-900">{r.businessName || r.user_name || r.email}</p>
                      <p className="text-sm text-gray-500">{r.email}</p>
                      {r.institutionEmail && <p className="text-xs text-gray-400">{r.institutionEmail}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${statusBadge(r.status)}`}>
                      {r.status}
                    </span>
                    <span className="text-xs text-gray-400">{formatAdminDate(r.submittedAt)}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-bold capitalize">
                      {r.mode === 'buyer_upgrade' ? 'Upgrade' : 'New Seller'}
                    </span>
                    {r.status === 'pending' && (
                      <button
                        onClick={() => setSelected(r)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#a14b58] text-white rounded-xl font-bold text-sm hover:bg-[#863b48] transition-all"
                      >
                        <Eye className="w-4 h-4" /> Review
                      </button>
                    )}
                  </div>
                </div>
                {r.rejectionReason && (
                  <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                    Rejection reason: {r.rejectionReason}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-black text-gray-900 mb-6">Review KYC Submission</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">Selfie</p>
                  <div className="h-36 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                    {selected.selfieBase64 ? (
                      <img src={selected.selfieBase64} alt="Selfie" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">No selfie uploaded</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">ID Document</p>
                  <div className="h-36 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                    {selected.idDocBase64 ? (
                      <img src={selected.idDocBase64} alt="ID" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">No document uploaded</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm mb-6">
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-bold">{selected.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Institution Email</span><span className="font-bold">{selected.institutionEmail || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Business Name</span><span className="font-bold">{selected.businessName || '—'}</span></div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Request</span>
                  <span className="font-bold">{selected.mode === 'buyer_upgrade' ? 'Upgrade to Seller' : 'Seller KYC'}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-sm font-bold text-gray-700">Rejection Reason (required to reject)</label>
                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. ID document is blurry, please re-upload..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] outline-none resize-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleReject(selected)}
                  disabled={processing}
                  className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => handleApprove(selected)}
                  disabled={processing}
                  className="flex-[2] py-3 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve KYC
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
