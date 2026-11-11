/**
 * ==============================================================================
 * MESSAGES INBOX PAGE (Messages.tsx)
 * ==============================================================================
 * Unified buyer & seller PostgreSQL messaging center backed by ConversationInbox.
 * ==============================================================================
 */

import React from 'react';
import { ConversationInbox } from '../components/Chat/ConversationInbox';

export const Messages: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          Direct conversations with campus buyers and sellers
        </p>
      </div>
      <ConversationInbox mode="all" />
    </div>
  );
};
