import React from 'react';
import { Link } from 'react-router';
import { MessageSquare, AlertCircle, HelpCircle, Activity, Search, ChevronRight } from 'lucide-react';

const helpCategories = [
  {
    icon: AlertCircle,
    title: 'Report an Issue',
    description: 'Report problems with transactions, users, or listings',
    link: '/help/report',
    color: 'bg-red-500'
  },
  {
    icon: MessageSquare,
    title: 'Contact Support',
    description: 'Get in touch with our support team',
    link: '/help/contact',
    color: 'bg-blue-500'
  },
  {
    icon: HelpCircle,
    title: 'FAQ',
    description: 'Find answers to frequently asked questions',
    link: '/help/faq',
    color: 'bg-purple-500'
  },
  {
    icon: Activity,
    title: 'System Status',
    description: 'Check the status of Unimart services',
    link: '/help/status',
    color: 'bg-green-500'
  }
];

/**
 * HelpCenter Component
 * 
 * Main help center hub providing access to:
 * - Issue reporting
 * - Support contact
 * - FAQ
 * - System status
 */
export const HelpCenter = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-4">Help Center</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          How can we help you today? Search for answers or browse our help categories.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-16">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for help articles..."
            className="w-full pl-14 pr-6 py-5 bg-white border-2 border-gray-200 rounded-[2rem] focus:ring-2 focus:ring-[#a14b58] focus:border-[#a14b58] focus:outline-none text-lg shadow-lg"
          />
        </div>
      </div>

      {/* Help Categories */}
      <div className="grid md:grid-cols-2 gap-6 mb-16">
        {helpCategories.map((category, idx) => {
          const Icon = category.icon;
          return (
            <Link
              key={idx}
              to={category.link}
              className="bg-white p-8 rounded-[2.5rem] border border-gray-100 hover:border-[#f3d7db] shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="flex items-start gap-6">
                <div className={`${category.color} bg-opacity-10 p-4 rounded-2xl flex-shrink-0`}>
                  <Icon className={`w-8 h-8 ${category.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-[#a14b58] transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{category.description}</p>
                  <div className="flex items-center gap-2 text-[#a14b58] font-bold text-sm">
                    Learn More
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-br from-[#fcf6f7] to-white p-10 rounded-[2.5rem] border border-[#f3d7db]">
        <h2 className="text-2xl font-black text-gray-900 mb-6">Quick Tips for Students</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">✅ Verify Sellers</h3>
            <p className="text-sm text-gray-600">Always check for verified student badges before making purchases.</p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">🏫 Meet on Campus</h3>
            <p className="text-sm text-gray-600">Arrange meetups in public campus areas for your safety.</p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">💬 Use Chat</h3>
            <p className="text-sm text-gray-600">Communicate through our platform to keep records of your conversations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
