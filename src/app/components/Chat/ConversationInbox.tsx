/**
 * ==============================================================================
 * UNIFIED SELLER-BUYER CONVERSATION INBOX (ConversationInbox.tsx)
 * ==============================================================================
 * Shared across Buyer Messages (`/messages`) and Seller Studio (`Messages` tab).
 * Fetches real PostgreSQL threads from `/api/messages/conversations/` and persists
 * replies via `/api/messages/conversations/<id>/messages/`.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router';
import {
  Search,
  Send,
  ShieldCheck,
  MessageSquare,
  ChevronLeft,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Package,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useUser } from '../../context/UserContext';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { toast } from 'sonner';

export interface InboxConversation {
  id: number;
  buyer_id: number;
  seller_id: number;
  product_id: number | null;
  viewer_role: 'buyer' | 'seller';
  seller_order_id?: number | null;
  suborder_details?: {
    id: number;
    suborder_number: string;
    status: string;
    status_display: string;
    subtotal: number;
    confirmed_delivery_fee: number;
    fulfilment_method: string;
    fulfilment_method_display: string;
    delivery_location: string;
    estimated_delivery: string;
  } | null;
  product_details?: {
    id: number;
    title: string;
    price: number;
    stock: number;
    image: string;
  } | null;
  counterparty: {
    id: number;
    name: string;
    full_name: string;
    university: string;
    verified: boolean;
    profile_pic: string;
    role: string;
  };
  last_message?: {
    id: number;
    body: string;
    sender_id: number;
    message_type?: string;
    is_read: boolean;
    created_at: string;
  } | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface InboxMessage {
  id: number;
  conversation: number;
  sender_id: number;
  sender_name: string;
  sender_role: 'buyer' | 'seller' | 'system';
  message_type?: 'text' | 'system' | 'delivery_proposal';
  proposal?: number | null;
  proposal_details?: any;
  metadata?: any;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface ConversationInboxProps {
  mode?: 'all' | 'buyer' | 'seller';
  emptyTitle?: string;
  emptySubtitle?: string;
  onUnreadChange?: (count: number) => void;
  initialConversationId?: number | null;
}

export const ConversationInbox: React.FC<ConversationInboxProps> = ({
  mode = 'all',
  emptyTitle = 'No conversations yet',
  emptySubtitle = 'Start chatting with a student seller directly from any product page.',
  onUnreadChange,
  initialConversationId,
}) => {
  const { user } = useUser();
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!user) {
      setConversations([]);
      setLoadingList(false);
      return;
    }
    if (!silent) {
      setLoadingList(true);
      setError(null);
    }
    try {
      const qs = mode === 'all' ? '' : `?role=${mode}`;
      const res = await api.get<{ unread_count: number; results: InboxConversation[] }>(
        `/messages/conversations/${qs}`
      );
      const list = Array.isArray(res?.results) ? res.results : [];
      setConversations(list);
      if (onUnreadChange && typeof res?.unread_count === 'number') {
        onUnreadChange(res.unread_count);
      }
      setSelectedId((prev) => {
        if (initialConversationId && list.some((c) => c.id === initialConversationId)) {
          return initialConversationId;
        }
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
      setError(null);
    } catch (err: any) {
      if (!silent) {
        setError(err?.message || 'Unable to load conversations.');
      }
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, [user, mode, onUnreadChange, initialConversationId]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedId(initialConversationId);
      setShowMobileThread(true);
    }
  }, [initialConversationId]);

  const fetchThread = useCallback(async (conversationId: number, silent = false) => {
    if (!silent) setLoadingThread(true);
    try {
      const res = await api.get<{ conversation: InboxConversation; messages: InboxMessage[] }>(
        `/messages/conversations/${conversationId}/`
      );
      setMessages(Array.isArray(res?.messages) ? res.messages : []);
      if (res?.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
        );
      }
    } catch (err: any) {
      if (!silent) {
        toast.error(err?.message || 'Unable to open message thread.');
      }
    } finally {
      if (!silent) setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations(false);
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    fetchThread(selectedId, false);
  }, [selectedId, fetchThread]);

  // Poll active conversation and inbox counts cleanly every 8 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedId) {
        fetchThread(selectedId, true);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [user, selectedId, fetchConversations, fetchThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, selectedId]);

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  const filteredConversations = conversations.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.counterparty?.name || '').toLowerCase().includes(q) ||
      (c.counterparty?.university || '').toLowerCase().includes(q) ||
      (c.product_details?.title || '').toLowerCase().includes(q) ||
      (c.last_message?.body || '').toLowerCase().includes(q)
    );
  });

  const handleSelectConversation = (id: number) => {
    setSelectedId(id);
    setShowMobileThread(true);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;
    const body = draft.trim();
    setSending(true);
    try {
      const res = await api.post<{ message: InboxMessage; conversation: InboxConversation }>(
        `/messages/conversations/${selectedId}/messages/`,
        { body }
      );
      setDraft('');
      if (res?.message) {
        setMessages((prev) => [...prev, res.message]);
      }
      if (res?.conversation) {
        setConversations((prev) => {
          const updated = prev.map((c) => (c.id === selectedId ? res.conversation : c));
          return [res.conversation, ...updated.filter((c) => c.id !== selectedId)];
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleAcceptProposal = async (proposalId: number) => {
    try {
      await api.post(`/orders/delivery-agreements/${proposalId}/accept/`);
      toast.success('Delivery proposal accepted! Fulfilment terms updated.');
      if (selectedId) fetchThread(selectedId, true);
      fetchConversations(true);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to accept proposal.');
    }
  };

  const handleDeclineProposal = async (proposalId: number) => {
    const reason = window.prompt('Please provide a reason for declining this proposal:') || '';
    try {
      await api.post(`/orders/delivery-agreements/${proposalId}/reject/`, { reason });
      toast.info('Proposal declined. Alternative terms may be proposed.');
      if (selectedId) fetchThread(selectedId, true);
      fetchConversations(true);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to decline proposal.');
    }
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
        <MessageSquare className="w-12 h-12 text-[#a14b58]/40 mx-auto mb-4" />
        <h3 className="text-lg font-black text-gray-900 mb-2">Sign in to access your messages</h3>
        <p className="text-sm text-gray-500 mb-6">
          Your campus buyer-seller chats are saved securely to your account.
        </p>
        <Link
          to="/signin"
          className="inline-flex items-center px-6 py-3 rounded-2xl bg-[#a14b58] text-white font-bold text-sm hover:bg-[#863b48] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (loadingList) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center">
        <div className="w-9 h-9 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading your conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-12 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="font-bold text-gray-900 mb-1">Could not load messages</p>
        <p className="text-sm text-gray-500 mb-5">{error}</p>
        <button
          onClick={() => fetchConversations(false)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#a14b58] text-white rounded-xl text-sm font-bold hover:bg-[#863b48] cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
        <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-black text-gray-900 mb-2">{emptyTitle}</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">{emptySubtitle}</p>
        {mode !== 'seller' && (
          <Link
            to="/shop"
            className="inline-flex items-center px-6 py-3 bg-[#a14b58] text-white rounded-2xl text-sm font-bold hover:bg-[#863b48] transition-colors"
          >
            Browse Campus Shop
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex h-[600px] min-h-[480px]">
      {/* Left pane: Conversation List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col shrink-0 ${
          showMobileThread ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-gray-100 space-y-3 bg-[#faf8f8]">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-gray-900 text-base">Conversations</h2>
            <button
              onClick={() => fetchConversations(false)}
              className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-[#a14b58] cursor-pointer"
              title="Refresh messages"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people or items..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No conversations match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              const unread = conv.unread_count > 0;
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full text-left p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#fcf6f7] border-l-4 border-l-[#a14b58]' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <div className="relative shrink-0">
                    {conv.counterparty?.profile_pic ? (
                      <ImageWithFallback
                        src={conv.counterparty.profile_pic}
                        alt={conv.counterparty.name}
                        className="w-11 h-11 rounded-full object-cover border border-gray-100"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#a14b58] text-white font-bold flex items-center justify-center text-sm">
                        {(conv.counterparty?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    {unread && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#a14b58] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 text-sm truncate flex items-center gap-1">
                        {conv.counterparty?.name || 'Student'}
                        {conv.counterparty?.verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {formatTime(conv.last_message?.created_at || conv.updated_at)}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#a14b58] truncate mt-0.5">
                      {conv.product_details?.title || conv.counterparty?.university || conv.counterparty?.role}
                    </p>
                    <p
                      className={`text-xs truncate mt-1 ${
                        unread ? 'font-bold text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {conv.last_message?.body || 'Conversation opened'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right pane: Active Thread */}
      <div
        className={`flex-1 flex flex-col bg-[#faf9f9] ${
          showMobileThread ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedConversation ? (
          <>
            {/* Thread Header */}
            <div className="px-4 py-3.5 bg-white border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowMobileThread(false)}
                  className="md:hidden p-2 -ml-1 rounded-xl hover:bg-gray-100 text-gray-600 cursor-pointer"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {selectedConversation.counterparty?.profile_pic ? (
                  <ImageWithFallback
                    src={selectedConversation.counterparty.profile_pic}
                    alt={selectedConversation.counterparty.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-100 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#a14b58] text-white font-bold flex items-center justify-center shrink-0">
                    {(selectedConversation.counterparty?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-black text-gray-900 text-sm truncate">
                      {selectedConversation.counterparty?.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {selectedConversation.counterparty?.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    {selectedConversation.counterparty?.university || 'Campus Verified'}
                  </p>
                </div>
              </div>

              {selectedConversation.product_details && (
                <Link
                  to={`/product/${selectedConversation.product_details.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#fcf6f7] border border-[#f3d7db] hover:bg-rose-50 transition-colors max-w-[200px] shrink-0"
                >
                  {selectedConversation.product_details.image && (
                    <ImageWithFallback
                      src={selectedConversation.product_details.image}
                      alt={selectedConversation.product_details.title}
                      className="w-7 h-7 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 text-left hidden sm:block">
                    <p className="text-[11px] font-bold text-gray-900 truncate">
                      {selectedConversation.product_details.title}
                    </p>
                    <p className="text-[10px] font-black text-[#a14b58]">
                      GH₵{Number(selectedConversation.product_details.price || 0).toLocaleString()}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#a14b58] shrink-0" />
                </Link>
              )}
            </div>

            {/* Linked Suborder Banner */}
            {selectedConversation.suborder_details && (
              <div className="px-4 py-2.5 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-4 h-4 text-[#a14b58] shrink-0" />
                  <span className="font-bold text-gray-900 truncate">
                    Order #{selectedConversation.suborder_details.suborder_number}
                  </span>
                  <span className="text-gray-500 hidden sm:inline">• {selectedConversation.suborder_details.status_display}</span>
                </div>
                <Link
                  to="/orders"
                  className="text-[11px] font-bold text-[#a14b58] hover:underline shrink-0 flex items-center gap-1"
                >
                  <span>Orders Dashboard</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Campus Safety Notice */}
            <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-100 text-[11px] text-amber-800 font-semibold text-center">
              Meet in public campus locations when inspecting or exchanging items.
            </div>

            {/* Message Bubbles */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingThread && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-7 h-7 border-3 border-[#a14b58] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 text-center px-6">
                  Send the first message below to coordinate pickup, price, or product details.
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.message_type === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="bg-gray-100/90 text-gray-700 px-4 py-2 rounded-xl text-xs max-w-[88%] text-center border border-gray-200/60 shadow-2xs flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#a14b58] shrink-0" />
                          <span className="whitespace-pre-wrap leading-relaxed">{msg.body}</span>
                        </div>
                      </div>
                    );
                  }

                  if (msg.message_type === 'delivery_proposal' || msg.proposal_details) {
                    const prop = msg.proposal_details;
                    const isPending = prop?.status === 'pending';
                    const canRespond = isPending && Number(user.id) !== Number(prop?.proposed_by_id);

                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <div className="w-full max-w-sm bg-white rounded-2xl border-2 border-rose-200 p-4 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                              <Truck className="w-4 h-4 text-[#a14b58]" />
                              Delivery Proposal
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                prop?.status === 'accepted'
                                  ? 'bg-green-100 text-green-800'
                                  : prop?.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {prop?.status ? prop.status.toUpperCase() : 'PENDING'}
                            </span>
                          </div>

                          <div className="text-xs space-y-1.5 text-gray-600">
                            <div className="flex justify-between">
                              <span>Method:</span>
                              <span className="font-bold text-gray-900">
                                {prop?.fulfilment_method_display || prop?.fulfilment_method}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Fee:</span>
                              <span className="font-bold text-[#a14b58]">
                                GH₵{Number(prop?.proposed_fee || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Location:</span>
                              <span className="font-medium text-gray-900 text-right">{prop?.delivery_location}</span>
                            </div>
                            {prop?.estimated_delivery && (
                              <div className="flex justify-between">
                                <span>Time Window:</span>
                                <span className="font-medium text-gray-900">{prop.estimated_delivery}</span>
                              </div>
                            )}
                            {prop?.notes && (
                              <p className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg mt-1 italic">
                                &ldquo;{prop.notes}&rdquo;
                              </p>
                            )}
                          </div>

                          {canRespond && (
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                              <button
                                onClick={() => handleAcceptProposal(prop.id)}
                                className="flex-1 py-1.5 bg-[#a14b58] text-white rounded-xl text-xs font-bold hover:bg-[#863b48] transition-colors cursor-pointer"
                              >
                                Accept Proposal
                              </button>
                              <button
                                onClick={() => handleDeclineProposal(prop.id)}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const isMine = Number(msg.sender_id) === Number(user.id);
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[78%] sm:max-w-[68%] px-4 py-2.5 rounded-2xl text-sm shadow-xs ${
                          isMine
                            ? 'bg-[#a14b58] text-white rounded-tr-xs'
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                        <div
                          className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                            isMine ? 'text-white/75' : 'text-gray-400'
                          }`}
                        >
                          <span>{formatTime(msg.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-[#a14b58] focus-within:bg-white transition-all">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message..."
                  maxLength={2000}
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm py-1.5"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="p-2.5 bg-[#a14b58] hover:bg-[#863b48] text-white rounded-xl disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select a conversation to view messages.
          </div>
        )}
      </div>
    </div>
  );
};

