import React, { useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I create an account on Unimart?',
    answer: 'Click the "Sign Up" button and register using your university email address. You\'ll need to verify your student status before you can start buying or selling.'
  },
  {
    category: 'Getting Started',
    question: 'Is Unimart free to use?',
    answer: 'Yes! Creating an account and browsing items is completely free. We only charge a small commission on completed sales to maintain the platform.'
  },
  {
    category: 'Buying',
    question: 'How do I make a purchase?',
    answer: 'Find an item you like, contact the seller through our chat system, and arrange a meetup on campus. We recommend meeting in public areas and inspecting items before payment.'
  },
  {
    category: 'Buying',
    question: 'What payment methods are accepted?',
    answer: 'We support Mobile Money (MTN, Vodafone, AirtelTigo) through Paystack. You can also arrange cash payments with sellers, but we recommend using our secure payment system for protection.'
  },
  {
    category: 'Selling',
    question: 'How do I list an item for sale?',
    answer: 'Click "Sell an Item" from the navigation menu, fill in the product details, upload photos, and submit. Your listing will be live immediately after review.'
  },
  {
    category: 'Selling',
    question: 'What can I sell on Unimart?',
    answer: 'You can sell textbooks, electronics, furniture, clothing, and other student-related items. Prohibited items include counterfeit goods, weapons, and illegal substances.'
  },
  {
    category: 'Safety',
    question: 'How do I stay safe when meeting buyers/sellers?',
    answer: 'Always meet in public campus areas, bring a friend if possible, and never share personal banking details. Use our in-app chat to communicate and keep records of all conversations.'
  },
  {
    category: 'Safety',
    question: 'What if I encounter a scammer?',
    answer: 'Contact our team immediately through Customer Support (/contact). We investigate all safety and fraud reports promptly and suspend suspicious accounts during review.'
  },
  {
    category: 'Account',
    question: 'How do I verify my student status?',
    answer: 'Upload your student ID or university acceptance letter in your account settings. Verification typically takes 24-48 hours. Verified accounts have a blue checkmark badge.'
  },
  {
    category: 'Account',
    question: 'Can I delete my account?',
    answer: 'Yes, you can delete your account from Account Settings. Note that this action is permanent and will remove all your listings and chat history.'
  }
];

const categories = ['All', 'Getting Started', 'Buying', 'Selling', 'Safety', 'Account'];

/**
 * FAQ Component
 * 
 * Frequently Asked Questions page with:
 * - Searchable FAQ items
 * - Category filtering
 * - Expandable/collapsible answers
 */
export const FAQ = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back Button */}
      <Link 
        to="/help"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-[#a14b58] mb-8 font-medium"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Help Center
      </Link>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 mb-4">Frequently Asked Questions</h1>
        <p className="text-lg text-gray-600">
          Find quick answers to common questions about Unimart.
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ List */}
      <div className="space-y-4">
        {filteredFAQs.length > 0 ? (
          filteredFAQs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:border-[#f3d7db] transition-all"
            >
              <button
                onClick={() => setExpandedId(expandedId === idx ? null : idx)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <div className="flex-1 pr-4">
                  <span className="text-xs font-bold text-[#a14b58] mb-2 block">{faq.category}</span>
                  <h3 className="font-bold text-gray-900">{faq.question}</h3>
                </div>
                {expandedId === idx ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              <AnimatePresence>
                {expandedId === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No FAQs found matching your search.</p>
          </div>
        )}
      </div>

      {/* Still Need Help */}
      <div className="mt-12 bg-gradient-to-br from-[#fcf6f7] to-white p-8 rounded-[2.5rem] border border-[#f3d7db] text-center">
        <h3 className="text-xl font-black text-gray-900 mb-2">Still need help?</h3>
        <p className="text-gray-600 mb-6">Our support team is here to assist you.</p>
        <Link
          to="/help/contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white rounded-2xl font-bold hover:shadow-lg transition-all"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
};
