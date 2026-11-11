import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ChevronLeft, Send, Mail, Phone, MapPin, Clock, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, MessageSquare, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import { useUser } from '../../context/UserContext';

interface SupportMsg {
  id: number;
  senderName: string;
  isAdmin: boolean;
  message: string;
  createdAt: string;
}

interface SupportTicket {
  id: number;
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
  updatedAt: string;
  messages: SupportMsg[];
}

const SUPPORT_CATEGORIES = [
  'Order Problem',
  'Payment Issue',
  'Seller / Listing Issue',
  'Account Issue',
  'Technical Problem',
  'General Inquiry',
  'Other',
];

export const ContactSupport = () => {
  const { user, isLoggedIn } = useUser();
  const [searchParams] = useSearchParams();
  const paramOrderId = searchParams.get('orderId') || '';
  const paramCategory = searchParams.get('category') || '';

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [category, setCategory] = useState(
    paramCategory || (paramOrderId ? 'Order Problem' : 'General Inquiry')
  );
  const [orderReference, setOrderReference] = useState(paramOrderId);
  const [subject, setSubject] = useState(paramOrderId ? `Help with Order #${paramOrderId}` : '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user?.name, user?.email]);

  const loadMyTickets = useCallback(async () => {
    if (!isLoggedIn) {
      setTickets([]);
      return;
    }
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const res = await api.get<{ results: SupportTicket[] }>('/support/tickets/');
      const rows = Array.isArray(res?.results) ? res.results : [];
      setTickets(rows);
    } catch (err: any) {
      setTicketsError(err?.message || 'Unable to load your support requests.');
    } finally {
      setTicketsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadMyTickets();
  }, [loadMyTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalName = (isLoggedIn ? user?.name : name) || name;
    const finalEmail = (isLoggedIn ? user?.email : email) || email;

    if (!finalName.trim() || !finalEmail.trim() || !subject.trim() || !message.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (message.trim().length < 10) {
      toast.error('Please describe your issue in at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ ticket: SupportTicket }>('/support/tickets/', {
        contactName: finalName.trim(),
        contactEmail: finalEmail.trim(),
        category,
        orderReference: orderReference.trim(),
        subject: subject.trim(),
        description: message.trim(),
      });
      toast.success('Support request submitted! Our team will review and respond here.');
      setSubject('');
      setMessage('');
      setOrderReference('');
      if (isLoggedIn && res?.ticket) {
        setTickets((prev) => [res.ticket, ...prev]);
        setActiveTicketId(res.ticket.id);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerReply = async (ticketId: number) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await api.post<{ ticket: SupportTicket }>(`/support/tickets/${ticketId}/`, {
        message: replyText.trim(),
      });
      if (res?.ticket) {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? res.ticket : t)));
      }
      setReplyText('');
      toast.success('Reply sent to support team.');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const statusBadge = (s: SupportTicket['status']) => {
    if (s === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'in_progress') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div>
        <Link
          to="/help-center"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#a14b58] mb-6 font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Help Center
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gray-900 mb-4">Customer Support</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Need help with an order, account, listing, or payment? Submit a support ticket and track admin responses directly below.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Support Submission Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-lg space-y-5">
            <h2 className="text-2xl font-black text-gray-900">Submit a Support Request</h2>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Your Name *</label>
                <input
                  type="text"
                  required
                  disabled={isLoggedIn}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kofi Mensah"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={isLoggedIn}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@st.ug.edu.gh"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none disabled:text-gray-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                >
                  {SUPPORT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Order ID (Optional)</label>
                <input
                  type="text"
                  value={orderReference}
                  onChange={(e) => setOrderReference(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Issue Description *</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what happened in detail so an administrator can help quickly..."
                rows={5}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white rounded-2xl font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Support Ticket</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Contact Information Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-black text-gray-900">Response Time</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Administrators respond to open tickets directly on this page, typically within <span className="font-bold text-blue-600">24 hours</span>.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-[#a14b58]" />
              <h3 className="font-bold text-gray-900">Email</h3>
            </div>
            <a href="mailto:support@unimart.gh" className="text-sm text-gray-700 hover:text-[#a14b58] transition-colors">
              support@unimart.gh
            </a>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-5 h-5 text-[#a14b58]" />
              <h3 className="font-bold text-gray-900">Phone</h3>
            </div>
            <p className="text-sm text-gray-700">+233 (0) 50 123 4567</p>
            <p className="text-xs text-gray-500 mt-1">Mon–Fri: 9AM – 6PM</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-[#a14b58]" />
              <h3 className="font-bold text-gray-900">Campus Desk</h3>
            </div>
            <p className="text-sm text-gray-700">University of Ghana, Legon — Accra, Ghana</p>
          </div>
        </div>
      </div>

      {/* Customer's Real Support Tickets & Admin Responses */}
      <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#fcf6f7] rounded-xl flex items-center justify-center text-[#a14b58]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">My Support Tickets &amp; Admin Responses</h2>
              <p className="text-xs text-gray-500">Live ticket tracking linked directly to your Unimart account</p>
            </div>
          </div>
          {isLoggedIn && (
            <button
              type="button"
              onClick={loadMyTickets}
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ticketsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>

        {!isLoggedIn ? (
          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 text-center text-sm text-gray-600">
            <p className="mb-3">Sign in to view your submitted support tickets and read administrator replies.</p>
            <Link to="/signin" className="inline-flex px-5 py-2.5 bg-[#a14b58] text-white rounded-xl font-bold text-xs">
              Sign In to Track Tickets
            </Link>
          </div>
        ) : ticketsLoading && tickets.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#a14b58]" />
            Loading your support history...
          </div>
        ) : ticketsError ? (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{ticketsError}</span>
            <button onClick={loadMyTickets} className="font-bold underline text-xs">Retry</button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-10 rounded-2xl bg-gray-50 border border-gray-100 text-center text-gray-500 text-sm">
            No support requests submitted under your account yet.
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => {
              const expanded = activeTicketId === t.id || tickets.length === 1;
              return (
                <div key={t.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
                  <button
                    type="button"
                    onClick={() => setActiveTicketId(expanded ? null : t.id)}
                    className="w-full flex flex-wrap items-start justify-between gap-3 text-left"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">#{t.id}</span>
                        <h3 className="font-black text-gray-900">{t.subject}</h3>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${statusBadge(t.status)}`}>
                          {t.statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {t.category}{t.orderReference ? ` • Order #${t.orderReference}` : ''} • Submitted{' '}
                        {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#a14b58]">
                      {expanded ? 'Hide Details' : 'View Thread'}
                    </span>
                  </button>

                  {expanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200/70 space-y-3">
                      <div className="bg-white rounded-xl p-4 border border-gray-100 text-sm text-gray-700">
                        <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Your Issue</p>
                        <p className="whitespace-pre-wrap">{t.description}</p>
                      </div>

                      {t.messages?.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-xl p-4 border text-sm ${
                            m.isAdmin
                              ? 'bg-emerald-50/70 border-emerald-200 text-gray-800'
                              : 'bg-white border-gray-200 text-gray-800 ml-4'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold flex items-center gap-1.5 text-[#a14b58]">
                              {m.isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                              {m.isAdmin ? `${m.senderName} (Admin Support)` : 'You'}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(m.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{m.message}</p>
                        </div>
                      ))}

                      {t.adminResponse && (!t.messages || t.messages.length === 0) && (
                        <div className="rounded-xl p-4 bg-emerald-50/70 border border-emerald-200 text-sm text-gray-800">
                          <p className="text-xs font-bold text-emerald-700 mb-1">Administrator Response</p>
                          <p className="whitespace-pre-wrap">{t.adminResponse}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          value={activeTicketId === t.id || tickets.length === 1 ? replyText : ''}
                          onChange={(e) => {
                            setActiveTicketId(t.id);
                            setReplyText(e.target.value);
                          }}
                          placeholder="Write a follow-up note to support..."
                          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={sendingReply || !replyText.trim()}
                          onClick={() => handleCustomerReply(t.id)}
                          className="px-4 py-2.5 bg-[#a14b58] text-white rounded-xl text-xs font-bold hover:bg-[#863b48] disabled:opacity-50"
                        >
                          {sendingReply ? 'Sending...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <div className="bg-gradient-to-br from-[#fcf6f7] to-white p-8 rounded-[2.5rem] border border-[#f3d7db]">
        <h3 className="text-xl font-black text-gray-900 mb-4">Before you submit...</h3>
        <p className="text-gray-600 mb-6">You might find instant answers in our resources:</p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/help/faq"
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm hover:border-[#a14b58] hover:text-[#a14b58] transition-all"
          >
            FAQ
          </Link>
          <Link
            to="/help/status"
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm hover:border-[#a14b58] hover:text-[#a14b58] transition-all"
          >
            System Status
          </Link>
        </div>
      </div>
    </div>
  );
};
