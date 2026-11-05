/**
 * ==============================================================================
 * ADMIN ROLE CHANGE APPROVALS (RoleChangeApprovals.tsx)
 * ==============================================================================
 * This page enables administrators to process student role changes:
 * - Sellers graduating or stepping back from selling can request downgrades to Buyer.
 * - Buyers requesting business accounts can have their accounts upgraded or reviewed.
 *
 * Core Features:
 * 1. Request Ledger:
 *    - Persisted in localStorage (`unimart_role_requests`).
 *    - Displays requester's name, email, transition (`Seller -> Buyer`), and justification.
 * 2. Instant Sync:
 *    - On approval, if the affected student is currently logged in, updates their
 *      active session in localStorage immediately.
 * 3. Status Filtering:
 *    - Quick tabs for 'pending', 'all', 'approved', and 'rejected'.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserCog, CheckCircle2, XCircle, Clock, User, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from './AdminLayout';

export interface RoleChangeRequest {
  id: string;
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

const DEFAULT_ROLE_REQUESTS: RoleChangeRequest[] = [
  {
    id: 'req-1',
    userEmail: 'kofi.mensah@ug.edu.gh',
    userName: 'Kofi Mensah',
    currentRole: 'Seller',
    requestedRole: 'Buyer',
    reason: 'Graduating this semester and no longer managing campus store.',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'req-2',
    userEmail: 'ama.owusu@knust.edu.gh',
    userName: 'Ama Owusu',
    currentRole: 'Seller',
    requestedRole: 'Buyer',
    reason: 'Pausing selling activities to focus on final year project.',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export const RoleChangeApprovals: React.FC = () => {
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<RoleChangeRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadRequests = () => {
    try {
      const stored = localStorage.getItem('unimart_role_requests');
      if (stored) {
        setRequests(JSON.parse(stored));
      } else {
        localStorage.setItem('unimart_role_requests', JSON.stringify(DEFAULT_ROLE_REQUESTS));
        setRequests(DEFAULT_ROLE_REQUESTS);
      }
    } catch {
      setRequests(DEFAULT_ROLE_REQUESTS);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = (req: RoleChangeRequest) => {
    setProcessing(true);
    try {
      const updated = requests.map(r =>
        r.id === req.id
          ? { ...r, status: 'approved' as const, reviewedAt: new Date().toISOString(), adminNote: adminNote || 'Approved' }
          : r
      );
      localStorage.setItem('unimart_role_requests', JSON.stringify(updated));
      setRequests(updated);

      // Also update session if user is currently logged in
      const session = JSON.parse(localStorage.getItem('unimart_user_session') || 'null');
      if (session && session.email === req.userEmail) {
        localStorage.setItem('unimart_user_session', JSON.stringify({
          ...session,
          role: req.requestedRole,
        }));
      }

      toast.success(`Role changed to ${req.requestedRole} for ${req.userEmail}`);
      setSelectedRequest(null);
      setAdminNote('');
    } catch {
      toast.error('Failed to approve role change.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = (req: RoleChangeRequest) => {
    setProcessing(true);
    try {
      const updated = requests.map(r =>
        r.id === req.id
          ? { ...r, status: 'rejected' as const, reviewedAt: new Date().toISOString(), adminNote: adminNote || 'Rejected by Admin' }
          : r
      );
      localStorage.setItem('unimart_role_requests', JSON.stringify(updated));
      setRequests(updated);

      toast.success(`Role change request rejected for ${req.userEmail}`);
      setSelectedRequest(null);
      setAdminNote('');
    } catch {
      toast.error('Failed to reject role change.');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);
  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center">
            <UserCog className="w-5 h-5 text-[#a14b58]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Role Change Approvals</h1>
            <p className="text-sm text-gray-500">Review requests from sellers wanting to downgrade or buyers requesting role change</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['pending', 'all', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-bold text-sm capitalize transition-all ${
                filter === f ? 'bg-[#a14b58] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100">
            <UserCog className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">No {filter === 'all' ? '' : filter} role change requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(req => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center font-black text-[#a14b58]">
                      {req.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 text-base">{req.userName}</h3>
                      <p className="text-xs text-gray-400">{req.userEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                      {req.currentRole} → <strong className="text-[#a14b58]">{req.requestedRole}</strong>
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${
                      req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                      req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                      'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
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
                      onClick={() => handleReject(req)}
                      disabled={processing}
                      className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleApprove(req)}
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
