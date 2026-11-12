/**
 * ==============================================================================
 * CHAT CONTEXT (ChatContext.tsx)
 * ==============================================================================
 * Provides global chat state across Navbar and all pages:
 * - Tracks total unread message count (drives the navbar badge)
 * - Manages the open/closed state of the floating chat drawer
 * - Polls the conversation list every 15 seconds for new messages
 * - Exposes helpers to open the drawer pre-focused on a specific conversation
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../../lib/api';
import { useUser } from './UserContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatContextType {
  /** Total number of unread messages across all conversations */
  unreadCount: number;
  /** Whether the floating chat drawer is currently visible */
  isDrawerOpen: boolean;
  /** ID of the conversation that should be pre-selected when the drawer opens */
  targetConversationId: number | null;
  /** Open the chat drawer (optionally focusing a specific conversation) */
  openDrawer: (conversationId?: number) => void;
  /** Close the chat drawer */
  closeDrawer: () => void;
  /** Toggle the drawer open/closed */
  toggleDrawer: () => void;
  /** Notify context that unread count changed (called by ConversationInbox) */
  setUnreadCount: (count: number) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [targetConversationId, setTargetConversationId] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Poll for unread count every 15 seconds while user is logged in
  // ---------------------------------------------------------------------------
  const fetchUnreadCount = useCallback(async () => {
    if (!isLoggedIn || !user) return;
    try {
      const res = await api.get<{ unread_count: number; results: any[] }>(
        '/messages/conversations/'
      );
      if (typeof res?.unread_count === 'number') {
        setUnreadCount(res.unread_count);
      } else if (Array.isArray(res?.results)) {
        // Fallback: sum unread counts from results array
        const total = res.results.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
        setUnreadCount(total);
      }
    } catch {
      // Silently fail — network offline or backend down
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    fetchUnreadCount();

    // Poll every 15 seconds
    intervalRef.current = setInterval(fetchUnreadCount, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoggedIn, fetchUnreadCount]);

  // ---------------------------------------------------------------------------
  // Drawer controls
  // ---------------------------------------------------------------------------
  const openDrawer = useCallback((conversationId?: number) => {
    if (conversationId !== undefined) {
      setTargetConversationId(conversationId);
    }
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setTargetConversationId(null);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => {
      const next = !prev;
      if (!next) setTargetConversationId(null);
      return next;
    });
  }, []);

  const handleSetUnreadCount = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  // ---------------------------------------------------------------------------
  // Stable Memoized Context Value
  // ---------------------------------------------------------------------------
  const contextValue = useMemo<ChatContextType>(
    () => ({
      unreadCount,
      isDrawerOpen,
      targetConversationId,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      setUnreadCount: handleSetUnreadCount,
    }),
    [
      unreadCount,
      isDrawerOpen,
      targetConversationId,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      handleSetUnreadCount,
    ]
  );

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

