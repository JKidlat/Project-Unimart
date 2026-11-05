import React, { useState } from 'react';
import { Send, Image as ImageIcon, MoreVertical, Shield, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ChatWindow = ({ seller, onClose }: any) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi! Is this MacBook still available?", sender: 'buyer', time: '10:00 AM' },
    { id: 2, text: "Yes it is! I'm currently on campus at Legon if you want to see it.", sender: 'seller', time: '10:02 AM' },
  ]);
  const [input, setInput] = useState('');

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

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-[60] flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg sm:hidden">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-[#a14b58] rounded-full flex items-center justify-center text-white font-bold">
            {seller.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-none">{seller.name}</h3>
            <span className="text-[10px] text-green-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Online
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-gray-400 hover:text-[#a14b58] transition-colors">
            <Shield className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Trust Banner */}
      <div className="bg-yellow-50 p-2 text-[10px] text-yellow-800 text-center font-bold border-b border-yellow-100">
        🔒 Stay safe! Only meet in public campus areas and avoid advance payments.
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'buyer' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              msg.sender === 'buyer' 
                ? 'bg-[#a14b58] text-white rounded-tr-none' 
                : 'bg-gray-100 text-gray-800 rounded-tl-none'
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
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-[#a14b58] transition-all">
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
            className="p-2 bg-[#a14b58] text-white rounded-xl disabled:opacity-50 disabled:bg-gray-300"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
