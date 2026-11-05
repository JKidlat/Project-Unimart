/**
 * ==============================================================================
 * ADMIN LIVE ACTIVITY FEED (LiveActivity.tsx)
 * ==============================================================================
 * This page provides a real-time event ticker monitoring platform events:
 * - New student account sign-ups across campuses.
 * - Product ad submissions and listings.
 * - Completed MoMo transactions and payments.
 * - Reviews submitted and support tickets filed.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, ShoppingBag, DollarSign, Star, AlertTriangle, 
  Circle, Filter, Sparkles, RefreshCw, Radio, CheckCircle2,
  TrendingUp, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminLayout } from './AdminLayout';
import { toast } from 'sonner';

interface ActivityItem {
  id: string;
  type: 'signup' | 'listing' | 'payment' | 'review' | 'support';
  message: string;
  subtext?: string;
  timestamp: string;
  user: string;
  university: string;
  amount?: string;
}

const samplePool: Omit<ActivityItem, 'id' | 'timestamp'>[] = [
  {
    type: 'payment',
    message: 'Payment completed via Paystack',
    subtext: 'MacBook Pro 16" - Order #10492',
    user: 'Kojo Antwi',
    university: 'UG - Legon',
    amount: 'GH₵4,500',
  },
  {
    type: 'signup',
    message: 'New student verified account',
    subtext: 'Student ID: KN-209482 verified',
    user: 'Akosua Darko',
    university: 'KNUST - Kumasi',
  },
  {
    type: 'listing',
    message: 'New product listed',
    subtext: 'HP Spectre x360 16GB RAM in Electronics',
    user: 'Prince Owusu',
    university: 'UCC - Cape Coast',
    amount: 'GH₵3,800',
  },
  {
    type: 'review',
    message: 'New 5-star rating submitted',
    subtext: '"Fast delivery to Pent Hall, item works great"',
    user: 'Naa Korkor',
    university: 'UG - Legon',
  },
  {
    type: 'support',
    message: 'Support inquiry opened',
    subtext: 'Category: Paystack MoMo Payment Verification',
    user: 'Yaw Frimpong',
    university: 'UPSA - Accra',
  },
  {
    type: 'payment',
    message: 'Payment completed via Paystack',
    subtext: 'Level 200 Economics Textbook Bundle',
    user: 'Esi Mansa',
    university: 'UG - Legon',
    amount: 'GH₵280',
  },
  {
    type: 'listing',
    message: 'New product listed',
    subtext: 'Dorm Study Desk with LED reading lamp',
    user: 'David Baffour',
    university: 'KNUST - Kumasi',
    amount: 'GH₵450',
  }
];

const initialActivities: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'payment',
    message: 'Payment completed via Paystack',
    subtext: 'Dell XPS 13 - Order #10488',
    timestamp: 'Just now',
    user: 'Kwame Mensah',
    university: 'UG - Legon',
    amount: 'GH₵3,400',
  },
  {
    id: 'act-2',
    type: 'signup',
    message: 'New student registered',
    subtext: 'Faculty of Pharmacy, KNUST',
    timestamp: '2 mins ago',
    user: 'Abena Osei',
    university: 'KNUST - Kumasi',
  },
  {
    id: 'act-3',
    type: 'listing',
    message: 'New product listed',
    subtext: 'Casio fx-991EX Scientific Calculator',
    timestamp: '5 mins ago',
    user: 'Emmanuel Boateng',
    university: 'UCC - Cape Coast',
    amount: 'GH₵150',
  },
  {
    id: 'act-4',
    type: 'review',
    message: 'New 5-star review posted',
    subtext: '"Authentic dorm fridge, friendly senior seller"',
    timestamp: '9 mins ago',
    user: 'Sarah Appiah',
    university: 'UPSA - Accra',
  },
  {
    id: 'act-5',
    type: 'support',
    message: 'Support ticket resolved',
    subtext: 'Hostel delivery confirmation resolved by Creator',
    timestamp: '14 mins ago',
    user: 'Kofi Asare',
    university: 'UG - Legon',
  }
];

const activityIcons = {
  signup: UserPlus,
  listing: ShoppingBag,
  payment: DollarSign,
  review: Star,
  support: AlertTriangle,
};

const activityColors = {
  signup: 'bg-blue-500 text-blue-600',
  listing: 'bg-purple-500 text-purple-600',
  payment: 'bg-emerald-500 text-emerald-600',
  review: 'bg-amber-500 text-amber-600',
  support: 'bg-rose-500 text-rose-600',
};

export const LiveActivity: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [isLive, setIsLive] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Real-time generator
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const randomItem = samplePool[Math.floor(Math.random() * samplePool.length)];
      const newActivity: ActivityItem = {
        ...randomItem,
        id: `act-${Date.now()}`,
        timestamp: 'Just now',
      };

      setActivities(prev => [newActivity, ...prev].slice(0, 40));
    }, 8000);

    return () => clearInterval(interval);
  }, [isLive]);

  const handleSimulateBurst = () => {
    const randomItem = samplePool[Math.floor(Math.random() * samplePool.length)];
    const newActivity: ActivityItem = {
      ...randomItem,
      id: `act-${Date.now()}`,
      timestamp: 'Just now',
    };
    setActivities(prev => [newActivity, ...prev]);
    toast.success('Simulated live campus event dispatched');
  };

  const filteredActivities = activities.filter(a => {
    if (typeFilter === 'all') return true;
    return a.type === typeFilter;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
                {isLive ? 'Stream Connected' : 'Stream Paused'}
              </span>
              <span className="text-xs text-gray-400">WebSocket / Polling active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Live Activity Telemetry
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Live event stream of user signups, listings, completed payments, reviews, and support tickets
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateBurst}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Simulate Event
            </button>

            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                isLive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isLive ? 'text-emerald-600 animate-pulse' : 'text-gray-400'}`} />
              {isLive ? 'Streaming Live' : 'Resume Stream'}
            </button>
          </div>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['signup', 'listing', 'payment', 'review', 'support'] as const).map((type) => {
            const Icon = activityIcons[type];
            const colorClass = activityColors[type];
            const count = activities.filter(a => a.type === type).length;
            const labels: Record<string, string> = {
              signup: 'New Signups',
              listing: 'Listings Added',
              payment: 'Payments',
              review: 'New Reviews',
              support: 'Support Tickets',
            };

            return (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  typeFilter === type
                    ? 'border-[#a14b58] bg-[#fcf6f7] shadow-xs'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${colorClass.split(' ')[0]} bg-opacity-10`}>
                    <Icon className={`w-4 h-4 ${colorClass.split(' ')[1]}`} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">Stream</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{count}</p>
                <p className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">{labels[type]}</p>
              </button>
            );
          })}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-700">Filter Stream:</span>
            <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold">
              {[
                { id: 'all', label: 'All Events' },
                { id: 'payment', label: 'Payments' },
                { id: 'listing', label: 'Listings' },
                { id: 'signup', label: 'Signups' },
                { id: 'review', label: 'Reviews' },
                { id: 'support', label: 'Support' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    typeFilter === tab.id
                      ? 'bg-[#a14b58] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-gray-400">
            Showing {filteredActivities.length} recent campus events
          </span>
        </div>

        {/* Live Activity Feed Stream */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="divide-y divide-gray-100 max-h-[640px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {filteredActivities.map((item) => {
                const Icon = activityIcons[item.type];
                const colorClass = activityColors[item.type];

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`p-2.5 rounded-xl ${colorClass.split(' ')[0]} bg-opacity-10 shrink-0 mt-0.5`}>
                        <Icon className={`w-5 h-5 ${colorClass.split(' ')[1]}`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-sm truncate">{item.message}</p>
                          {item.amount && (
                            <span className="font-black text-[#a14b58] text-xs px-2 py-0.5 bg-[#fcf6f7] border border-[#f3d7db] rounded-md">
                              {item.amount}
                            </span>
                          )}
                        </div>

                        {item.subtext && (
                          <p className="text-xs text-gray-600 mt-0.5 font-medium">{item.subtext}</p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                          <span className="font-bold text-gray-700">{item.user}</span>
                          <span>•</span>
                          <span>{item.university}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-gray-400 shrink-0 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-lg">
                      {item.timestamp}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
