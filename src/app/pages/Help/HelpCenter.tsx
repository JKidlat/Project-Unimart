import React from 'react';
import { Link } from 'react-router';
import { MessageSquare, HelpCircle, Activity, Search, ChevronRight } from 'lucide-react';

const helpCategories = [
  {
    icon: MessageSquare,
    title: 'Customer Support',
    description: 'Submit an issue or question, and track live administrator responses',
    link: '/contact',
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

export const HelpCenter = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-4">Help Center</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          How can we help you today? Browse our support resources or send a ticket to our team.
        </p>
      </div>

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

      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {helpCategories.map((category, idx) => {
          const Icon = category.icon;
          return (
            <Link
              key={idx}
              to={category.link}
              className="bg-white p-8 rounded-[2.5rem] border border-gray-100 hover:border-[#f3d7db] shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="flex items-start gap-5">
                <div className={`${category.color} bg-opacity-10 p-4 rounded-2xl flex-shrink-0`}>
                  <Icon className={`w-7 h-7 ${category.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-[#a14b58] transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm">{category.description}</p>
                  <div className="flex items-center gap-2 text-[#a14b58] font-bold text-sm">
                    Open
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-[#fcf6f7] to-white p-10 rounded-[2.5rem] border border-[#f3d7db]">
        <h2 className="text-2xl font-black text-gray-900 mb-6">Quick Tips for Students</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Verify Sellers</h3>
            <p className="text-sm text-gray-600">Always check for verified student badges before making purchases.</p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Meet on Campus</h3>
            <p className="text-sm text-gray-600">Arrange meetups in public campus areas for your safety.</p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Use In-App Chat</h3>
            <p className="text-sm text-gray-600">Communicate through our messaging system to keep records of your conversations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
