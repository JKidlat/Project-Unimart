/**
 * ==============================================================================
 * ADMIN CUSTOMER SUPPORT MANAGEMENT (SupportManagement.tsx)
 * ==============================================================================
 * Connected strictly to `/api/admin/support/` and `/api/admin/support/<id>/`.
 * Lets admins view every customer support ticket, inspect customer account details,
 * update status (`open`, `in_progress`, `resolved`), and send persistent replies.
 * ==============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  LifeBuoy, Search, RefreshCw, Send, User, Mail, GraduationCap,
  Clock, CheckCircle2, X, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from './AdminLayout';
import { AdminErrorState, AdminLoadingState, formatAdminDate } from '../../components/Admin/AdminStateFeedback';
import { api } from '../../../lib/api';

interface SupportMessage {
  id: number;
  senderName: string;
  isAdmin: boolean;
  message: string;
  createdAt: string;
}

interface AdminSupportTicket {
  id: number;
  customer: {
    id: number | null;
    name: string;
    email: string;
    university: string;
    role: string;
    phone: string;
  };
  contactName: string;
  contactEmail: string;
  category: string;
  orderReference: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  statusLabel: string;
  adminResponse: string;
  respondedAt: string | null;
  createdAt: string;
  messages: SupportMessage[];
}

export const SupportManagement: React.FC = () => {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [counts, setCounts] = useState({ all: 0, open: 0, in_progress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selected, setSelected] = useState<AdminSupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [nextStatus, setNextStatus] = useState<'open' | 'in_progress' | 'resolved'>('in_progress');
  const [saving, setSaving] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{
        counts: { all: number; open: number; in_progress: number; resolved: number };
        results: AdminSupportTicket[];
      }>('/admin/support/');
      setTickets(Array.isArray(res?.results) ? res.results : []);
      if (res?.counts) setCounts(res.counts);
    } catch (err: any) {
      setError(err?.message || 'Unable to load customer support requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTicketModal = (ticket: AdminSupportTicket) => {
    setSelected(ticket);
    setNextStatus(ticket.status);
    setReplyText('');
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const payload: any = { status: nextStatus };
      if (replyText.trim()) {
        payload.admin_response = replyText.trim();
      }
      const res = await api.patch<{ ticket: AdminSupportTicket }>(`/admin/support/${selected.id}/`, payload);
      toast.success(`Support ticket #${selected.id} updated.`);
      if (res?.ticket) {
        setSelected(res.ticket);
        setNextStatus(res.ticket.status);
      }
      setReplyText('');
      await loadTickets();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to update support ticket.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = tickets.filter((t) => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      t.subject.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.contactName.toLowerCase().includes(q) ||
      t.contactEmail.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const badgeClass = (s: AdminSupportTicket['status']) => {
    if (s === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'in_progress') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Customer Support &amp; Issues
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Review customer support requests, respond directly, and update resolution status
            </p>
          </div>
          <button
            onClick={loadTickets}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Tickets</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{counts.all}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <span className="text-xs font-bold text-amber-600 uppercase">Open</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{counts.open}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <span className="text-xs font-bold text-blue-600 uppercase">In Progress</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{counts.in_progress}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <span className="text-xs font-bold text-emerald-600 uppercase">Resolved</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{counts.resolved}</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer email, subject, order ID, or issue description..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'open', 'in_progress', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-[#a14b58] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st === 'all' ? 'All' : st === 'in_progress' ? 'In Progress' : st.charAt(0).toUpperCase() + st.slice(1)} (
                {counts[st]})
              </button>
            ))}
          </div>
        </div>

        {loading && tickets.length === 0 ? (
          <AdminLoadingState label="Loading customer support requests..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={loadTickets} />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
            <LifeBuoy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-bold">No matching customer support tickets</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <div
                key={t.id}
                onClick={() => openTicketModal(t)}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-[#a14b58]/40 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-gray-400">#{t.id}</span>
                    <h3 className="font-black text-gray-900 truncate">{t.subject}</h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass(t.status)}`}>
                      {t.statusLabel}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1">{t.description}</p>
                  <p className="text-[11px] text-gray-400">
                    From <strong className="text-gray-700">{t.customer.name}</strong> ({t.customer.email}) •{' '}
                    {t.customer.university} • {formatAdminDate(t.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openTicketModal(t);
                  }}
                  className="px-4 py-2 bg-[#fcf6f7] text-[#a14b58] border border-[#f3d7db] rounded-xl text-xs font-bold hover:bg-[#f3d7db] transition-colors shrink-0"
                >
                  Open &amp; Respond
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ticket Detail & Admin Reply Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-400">Ticket #{selected.id}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass(selected.status)}`}>
                      {selected.statusLabel}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mt-1">{selected.subject}</h3>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Customer Metadata */}
                <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[#faf8f8] border border-gray-100 text-xs">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-[#a14b58]" />
                    <span>
                      <strong>{selected.customer.name}</strong> ({selected.customer.role})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-[#a14b58]" />
                    <span>{selected.customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <GraduationCap className="w-4 h-4 text-[#a14b58]" />
                    <span>{selected.customer.university}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-4 h-4 text-[#a14b58]" />
                    <span>{formatAdminDate(selected.createdAt)}</span>
                  </div>
                  {selected.orderReference && (
                    <div className="sm:col-span-2 text-gray-700">
                      <strong>Order Reference:</strong> #{selected.orderReference}
                    </div>
                  )}
                </div>

                {/* Original Description */}
                <div className="p-4 rounded-2xl bg-white border border-gray-200 text-sm text-gray-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Customer Issue Description ({selected.category})
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{selected.description}</p>
                </div>

                {/* Message Thread */}
                <div className="space-y-3">
                  {selected.messages?.map((m) => (
                    <div
                      key={m.id}
                      className={`p-4 rounded-2xl border text-sm ${
                        m.isAdmin
                          ? 'bg-emerald-50/70 border-emerald-200 text-gray-800'
                          : 'bg-gray-50 border-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-gray-900">
                          {m.isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                          {m.senderName} {m.isAdmin ? '(Admin)' : '(Customer)'}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatAdminDate(m.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Action Form */}
              <form onSubmit={handleSaveTicket} className="p-6 border-t border-gray-100 bg-gray-50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="text-xs font-bold text-gray-700">Update Status:</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'open', label: 'Open' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'resolved', label: 'Resolved' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNextStatus(opt.value as AdminSupportTicket['status'])}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          nextStatus === opt.value
                            ? 'bg-[#a14b58] text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write an official response to the customer (optional if only changing status)..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] focus:outline-none resize-none"
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-[#a14b58] hover:bg-[#863b48] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {nextStatus === 'resolved' ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    <span>{saving ? 'Saving...' : 'Save Status & Send Response'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

