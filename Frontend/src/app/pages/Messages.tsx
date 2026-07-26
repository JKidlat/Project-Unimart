import React, { useState } from 'react';
import { Search, MoreVertical, Send, Image as ImageIcon, Star, CheckCircle, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Conversation {
  id: string;
  sellerName: string;
  sellerUniversity: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  online: boolean;
  verified: boolean;
  productName?: string;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    sellerName: 'Kwame Mensah',
    sellerUniversity: 'UG - Legon',
    lastMessage: 'Yes it is! I\'m currently on campus if you want to see it.',
    timestamp: '10:02 AM',
    unread: true,
    online: true,
    verified: true,
    productName: 'MacBook Pro 2019'
  },
  {
    id: '2',
    sellerName: 'Abena Osei',
    sellerUniversity: 'KNUST',
    lastMessage: 'I can meet you at the library tomorrow.',
    timestamp: 'Yesterday',
    unread: false,
    online: false,
    verified: true,
    productName: 'Engineering Textbooks'
  },
  {
    id: '3',
    sellerName: 'Emmanuel Boateng',
    sellerUniversity: 'UCC',
    lastMessage: 'The price is negotiable. What\'s your offer?',
    timestamp: '2 days ago',
    unread: false,
    online: false,
    verified: false,
    productName: 'iPhone 12'
  }
];

const mockMessages = [
  { id: 1, text: "Hi! Is this MacBook still available?", sender: 'buyer', time: '10:00 AM' },
  { id: 2, text: "Yes it is! I'm currently on campus at Legon if you want to see it.", sender: 'seller', time: '10:02 AM' },
  { id: 3, text: "Great! When can we meet?", sender: 'buyer', time: '10:05 AM' },
  { id: 4, text: "I'm free this afternoon around 3 PM. We can meet at the main library.", sender: 'seller', time: '10:07 AM' },
];

/**
 * Messages Page
 * 
 * A comprehensive messaging interface showing:
 * - List of conversations with sellers
 * - Active conversation view
 * - Real-time messaging interface
 * - Online status indicators
 */
export const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(mockMessages);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { 
      id: Date.now(), 
      text: input, 
      sender: 'buyer', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]);
    setInput('');
  };

  const filteredConversations = mockConversations.filter(conv =>
    conv.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.productName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="grid md:grid-cols-3 h-full">
          {/* Conversations List */}
          <div className="md:col-span-1 border-r border-gray-100 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <h1 className="text-2xl font-black text-gray-900 mb-4">Messages</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 border-b border-gray-50 hover:bg-gray-50 transition-all text-left ${
                    selectedConversation?.id === conv.id ? 'bg-[#fcf6f7]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#a14b58] to-[#c86371] rounded-2xl flex items-center justify-center text-white font-bold">
                        {conv.sellerName.charAt(0)}
                      </div>
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-bold text-gray-900 truncate">{conv.sellerName}</span>
                        {conv.verified && <CheckCircle className="w-3 h-3 text-blue-500 fill-current flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{conv.productName}</p>
                      <p className={`text-sm truncate ${conv.unread ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                        {conv.lastMessage}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400">{conv.timestamp}</span>
                      {conv.unread && (
                        <span className="w-2 h-2 bg-[#a14b58] rounded-full" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className="md:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#a14b58] to-[#c86371] rounded-full flex items-center justify-center text-white font-bold">
                      {selectedConversation.sellerName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-bold text-gray-900">{selectedConversation.sellerName}</h3>
                        {selectedConversation.verified && <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{selectedConversation.sellerUniversity}</span>
                        {selectedConversation.online && (
                          <span className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                            <Circle className="w-1.5 h-1.5 fill-green-500" />
                            Online
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Trust Banner */}
                <div className="bg-yellow-50 p-2 text-[10px] text-yellow-800 text-center font-bold border-b border-yellow-100">
                  🔒 Stay safe! Only meet in public campus areas and avoid advance payments.
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'buyer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                        msg.sender === 'buyer' 
                          ? 'bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white rounded-tr-none' 
                          : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                      }`}>
                        <p>{msg.text}</p>
                        <span className={`text-[10px] mt-1 block ${msg.sender === 'buyer' ? 'text-white/70' : 'text-gray-400'}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-[#a14b58] transition-all">
                    <button className="p-2 text-gray-400 hover:text-[#a14b58]">
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message..." 
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm py-1"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="p-2 bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white rounded-xl disabled:opacity-50 disabled:from-gray-300 disabled:to-gray-300"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MoreVertical className="w-10 h-10" />
                  </div>
                  <p className="font-medium">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
