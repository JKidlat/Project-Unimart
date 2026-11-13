/**
 * ==============================================================================
 * PRODUCT DETAIL CHAT DRAWER (ChatWindow.tsx)
 * ==============================================================================
 * Opens or resumes a persistent PostgreSQL buyer-seller conversation tied to a
 * product listing (`POST /api/messages/conversations/`). Messages sent here sync
 * seamlessly with `/messages` and the Seller Dashboard `Messages` tab.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Send, ShieldCheck, ChevronLeft, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { api } from '../../../lib/api';
import { useUser } from '../../context/UserContext';
import { toast } from 'sonner';

interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_role: 'buyer' | 'seller';
  body: string;
  message_type?: 'text' | 'system' | 'delivery_proposal';
  created_at: string;
}

interface ChatWindowProps {
  productId?: number | string;
  sellerOrderId?: number | string;
  suborderId?: number | string;
  seller: {
    id: number | string;
    name: string;
    university?: string;
  };
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ productId, sellerOrderId, suborderId, seller, onClose }) => {
  const { user } = useUser();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const initConversation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, any> = {};
      const targetOrderId = sellerOrderId || suborderId;
      if (targetOrderId) {
        payload.seller_order_id = Number(targetOrderId);
      }
      if (productId) {
        payload.product_id = Number(productId);
      }
      if (seller?.id) {
        payload.seller_id = Number(seller.id);
      }

      const res = await api.post<{ conversation: { id: number }; messages: ChatMessage[] }>(
        '/messages/conversations/',
        payload
      );
      setConversationId(res.conversation.id);
      setMessages(Array.isArray(res?.messages) ? res.messages : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to seller chat.');
    } finally {
      setLoading(false);
    }
  }, [productId, sellerOrderId, suborderId, seller?.id]);

  useEffect(() => {
    initConversation();
  }, [initConversation]);

  // Poll thread every 6 seconds while drawer stays open
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get<{ messages: ChatMessage[] }>(
          `/messages/conversations/${conversationId}/`
        );
        if (Array.isArray(res?.messages)) {
          setMessages(res.messages);
        }
      } catch {
        // Keep current thread visible on transient network tick
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !conversationId || sending) return;
    const body = input.trim();
    setSending(true);
    try {
      const res = await api.post<{ message: ChatMessage }>(
        `/messages/conversations/${conversationId}/messages/`,
        { body }
      );
      setInput('');
      if (res?.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deliver message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-[60] flex flex-col border-l border-gray-100"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg sm:hidden cursor-pointer"
            aria-label="Close chat"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-[#a14b58] rounded-full flex items-center justify-center text-white font-bold shrink-0">
            {(seller?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 leading-tight truncate flex items-center gap-1">
              {seller?.name || 'Seller'}
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            </h3>
            <span className="text-[11px] text-gray-500 truncate block">
              {seller?.university || 'Verified Campus Seller'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/messages"
            onClick={onClose}
            className="text-[11px] font-bold text-[#a14b58] hover:underline px-2 py-1"
          >
            Full Inbox
          </Link>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Campus Safety Banner */}
      <div className="bg-amber-50 px-3 py-2 text-[11px] text-amber-800 text-center font-semibold border-b border-amber-100">
        Stay safe: inspect items in public campus locations.
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#faf9f9]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-7 h-7 border-3 border-[#a14b58] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-xs font-bold text-red-600 mb-2">{error}</p>
            <button
              onClick={initConversation}
              className="px-4 py-1.5 bg-[#a14b58] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 text-center px-4">
            Ask {seller?.name || 'the seller'} about availability, condition, or campus pickup time.
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.message_type === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-gray-200/80 text-gray-700 text-[11px] px-3 py-1 rounded-full text-center max-w-[85%] font-medium">
                    {msg.body}
                  </div>
                </div>
              );
            }
            const isMine = user ? Number(msg.sender_id) === Number(user.id) : msg.sender_role === 'buyer';
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-[#a14b58] text-white rounded-tr-xs'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <span
                    className={`text-[10px] mt-1 block text-right ${
                      isMine ? 'text-white/70' : 'text-gray-400'
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 pl-3 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-[#a14b58] focus-within:bg-white transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={!conversationId || !!error}
            maxLength={2000}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm py-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || !conversationId || sending}
            className="p-2 bg-[#a14b58] text-white rounded-xl disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
};
