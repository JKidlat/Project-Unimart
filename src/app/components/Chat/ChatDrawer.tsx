/**
 * ==============================================================================
 * GLOBAL CHAT DRAWER (ChatDrawer.tsx)
 * ==============================================================================
 * A slide-in panel from the right side of the screen, toggled from the Navbar
 * chat icon. Reuses the battle-tested ConversationInbox component so both
 * buyers and sellers see the same unified thread UI.
 *
 * Features:
 * - Animated slide-in/out from right
 * - Full conversation list + message thread inside the drawer
 * - Backdrop click to close
 * - Syncs unread count back to ChatContext (Navbar badge)
 * ==============================================================================
 */

import React, { useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import { ConversationInbox } from './ConversationInbox';
import { useChat } from '../../context/ChatContext';

export const ChatDrawer: React.FC = () => {
  const { isDrawerOpen, closeDrawer, setUnreadCount, targetConversationId } = useChat();

  // Lock body scroll while drawer is open (prevents background page scrolling)
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* ---------------------------------------------------------------- */}
          {/* Backdrop — click to close                                        */}
          {/* ---------------------------------------------------------------- */}
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[55]"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          {/* ---------------------------------------------------------------- */}
          {/* Drawer panel                                                      */}
          {/* ---------------------------------------------------------------- */}
          <motion.div
            key="chat-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[480px] lg:w-[520px] bg-white shadow-2xl z-[60] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-[#a14b58] rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900 text-sm leading-tight">Messages</h2>
                  <p className="text-[11px] text-gray-500">Campus buyer-seller chats</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/messages"
                  onClick={closeDrawer}
                  className="text-[11px] font-bold text-[#a14b58] hover:underline px-2 py-1 rounded-lg hover:bg-[#fcf6f7] transition-colors"
                >
                  Full inbox →
                </Link>
                <button
                  onClick={closeDrawer}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conversation Inbox — fills remaining height */}
            <div className="flex-1 overflow-hidden">
              {/*
                ConversationInbox renders with its own internal scroll areas.
                We pass onUnreadChange to sync the badge count in ChatContext.
                The fixed height wrapper ensures the inbox stays contained in the drawer.
              */}
              <div className="h-full flex flex-col">
                <ConversationInboxDrawerWrapper
                  onUnreadChange={setUnreadCount}
                  targetConversationId={targetConversationId}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * Thin wrapper around ConversationInbox that removes the outer rounded card
 * styling so it fills the drawer panel edge-to-edge cleanly.
 */
const ConversationInboxDrawerWrapper: React.FC<{
  onUnreadChange: (count: number) => void;
  targetConversationId?: number | null;
}> = ({ onUnreadChange, targetConversationId }) => {
  return (
    <div className="flex-1 overflow-hidden [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none [&>div]:h-full">
      <ConversationInbox
        mode="all"
        onUnreadChange={onUnreadChange}
        initialConversationId={targetConversationId}
        emptyTitle="No conversations yet"
        emptySubtitle="Open any product listing and tap 'Chat with Seller' to start a conversation."
      />
    </div>
  );
};

