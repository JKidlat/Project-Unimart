/**
 * ==============================================================================
 * ADMIN KYC VERIFICATION MANAGEMENT (KYCManagement.tsx)
 * ==============================================================================
 * This page allows platform administrators to review seller identity verification
 * submissions and approve or reject them.
 *
 * Core Features:
 * 1. Document Inspection Modal:
 *    - Opens high-resolution view of the student's live selfie and official
 *      Student ID or Ghana Card.
 *    - Displays institutional email and requested business store name.
 * 2. Role Upgrade Processing:
 *    - If the user submitted in `buyer_upgrade` mode, approving their KYC
 *      automatically sets their active role to 'Seller' in both storage and session!
 * 3. Rejection Feedback:
 *    - Requires a reason when rejecting (e.g. "Selfie does not match ID photo")
 *      so the student can correct their submission.
 * ==============================================================================
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Clock, CheckCircle2, XCircle, Eye, User } from 'lucide-react';
import { toast } from 'sonner';
import { kycStorage } from '../../../lib/api';
import { AdminLayout } from './AdminLayout';

type KYCRecord = {
  email: string;
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
  const [selected, setSelected] = useState<KYCRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const load = () => setRecords(kycStorage.getAll() as KYCRecord[]);

  useEffect(() => { load(); }, []);

  const handleApprove = async (record: KYCRecord) => {
    setProcessing(true);
    kycStorage.updateStatus(record.email, 'approved');
    // Upgrade role in session if buyer_upgrade
    if (record.mode === 'buyer_upgrade') {
      const sessions = JSON.parse(localStorage.getItem('unimart_user_session') || 'null');
      if (sessions?.email === record.email) {
        localStorage.setItem('unimart_user_session', JSON.stringify({
          ...sessions,
          role: 'Seller',
          kyc_status: 'approved',
          businessName: record.businessName,
        }));
      }
    } else {
      const sessions = JSON.parse(localStorage.getItem('unimart_user_session') || 'null');
      if (sessions?.email === record.email) {
        localStorage.setItem('unimart_user_session', JSON.stringify({
          ...sessions,
          kyc_status: 'approved',
          businessName: record.businessName,
        }));
      }
    }
    toast.success(`KYC approved for ${record.email}`);
    setSelected(null);
    load();
    setProcessing(false);
  };

  const handleReject = async (record: KYCRecord) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setProcessing(true);
    kycStorage.updateStatus(record.email, 'rejected', rejectionReason);
    const sessions = JSON.parse(localStorage.getItem('unimart_user_session') || 'null');
    if (sessions?.email === record.email) {
      localStorage.setItem('unimart_user_session', JSON.stringify({ ...sessions, kyc_status: 'rejected' }));
    }
    toast.success(`KYC rejected for ${record.email}`);
    setRejectionReason('');
    setSelected(null);
    load();
    setProcessing(false);
  };

  const filtered = records.filter(r => filter === 'all' || r.status === filter);
  const counts = {
    all: records.length,
    pending: records.filter(r => r.status === 'pending').length,
    approved: records.filter(r => r.status === 'approved').length,
    rejected: records.filter(r => r.status === 'rejected').length,
  };

  const statusBadge = (s: string) => {
    if (s === 'approved') return 'bg-green-50 text-green-700 border-green-100';
    if (s === 'rejected') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-amber-50 text-amber-700 border-amber-100';
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-[#a14b58]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">KYC Verification Requests</h1>
          <p className="text-sm text-gray-500">Review and approve seller identity verifications</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['pending', 'all', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-bold text-sm capitalize transition-all ${
              filter === f
                ? 'bg-[#a14b58] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
          <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-bold">No {filter === 'all' ? '' : filter} KYC submissions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
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
                    <p className="font-black text-gray-900">{r.businessName}</p>
                    <p className="text-sm text-gray-500">{r.email}</p>
                    <p className="text-xs text-gray-400">{r.institutionEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${statusBadge(r.status)}`}>
                    {r.status}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(r.submittedAt).toLocaleDateString()}</span>
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

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-black text-gray-900 mb-6">Review KYC Submission</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">Selfie</p>
                <div className="h-36 rounded-2xl overflow-hidden bg-gray-100">
                  {selected.selfieBase64 && <img src={selected.selfieBase64} alt="Selfie" className="w-full h-full object-cover" />}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">ID Document</p>
                <div className="h-36 rounded-2xl overflow-hidden bg-gray-100">
                  {selected.idDocBase64 && <img src={selected.idDocBase64} alt="ID" className="w-full h-full object-cover" />}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm mb-6">
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-bold">{selected.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Institution Email</span><span className="font-bold">{selected.institutionEmail}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Business Name</span><span className="font-bold">{selected.businessName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Request</span><span className="font-bold capitalize">{selected.mode === 'buyer_upgrade' ? 'Upgrade to Seller' : 'First Seller KYC'}</span></div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-sm font-bold text-gray-700">Rejection Reason (required to reject)</label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
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
