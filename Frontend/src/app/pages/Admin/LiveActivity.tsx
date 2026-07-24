import React, { useState, useEffect } from 'react';
import { UserPlus, ShoppingBag, DollarSign, Star, AlertTriangle, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminLayout } from './AdminLayout';

interface ActivityItem {
  id: string;
  type: 'signup' | 'listing' | 'payment' | 'review' | 'support';
  message: string;
  timestamp: string;
  user: string;
  university?: string;
}

const initialActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'signup',
    message: 'New user registration',
    timestamp: '2 minutes ago',
    user: 'Kwame Mensah',
    university: 'UG - Legon'
  },
  {
    id: '2',
    type: 'listing',
    message: 'New product listed: MacBook Pro 2020',
    timestamp: '5 minutes ago',
    user: 'Abena Osei',
    university: 'KNUST'
  },
  {
    id: '3',
    type: 'payment',
    message: 'Payment completed: GH₵850',
    timestamp: '8 minutes ago',
    user: 'Emmanuel Boateng',
    university: 'UCC'
  },
  {
    id: '4',
    type: 'review',
    message: 'New 5-star review posted',
    timestamp: '12 minutes ago',
    user: 'Sarah Appiah',
    university: 'UPSA'
  },
  {
    id: '5',
    type: 'support',
    message: 'Support ticket opened',
    timestamp: '15 minutes ago',
    user: 'John Mensah',
    university: 'UG - Legon'
  }
];

const activityIcons = {
  signup: UserPlus,
  listing: ShoppingBag,
  payment: DollarSign,
  review: Star,
  support: AlertTriangle
};

const activityColors = {
  signup: 'bg-blue-500',
  listing: 'bg-purple-500',
  payment: 'bg-green-500',
  review: 'bg-yellow-500',
  support: 'bg-red-500'
};

/**
 * LiveActivity Component
 * 
 * Real-time activity feed showing:
 * - New user signups
 * - Product listings
 * - Completed payments
 * - New reviews
 * - Support tickets
 */
export const LiveActivity = () => {
  const [activities, setActivities] = useState(initialActivities);
  const [isLive, setIsLive] = useState(true);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: ['signup', 'listing', 'payment', 'review', 'support'][Math.floor(Math.random() * 5)] as any,
        message: 'New activity detected',
        timestamp: 'Just now',
        user: 'New User',
        university: 'UG - Legon'
      };
      
      setActivities(prev => [newActivity, ...prev].slice(0, 50));
    }, 10000); // Add new activity every 10 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Live Activity Feed</h1>
            <p className="text-gray-600">Real-time monitoring of platform activities</p>
          </div>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              isLive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Circle className={`w-2 h-2 ${isLive ? 'fill-green-500 animate-pulse' : 'fill-gray-400'}`} />
            {isLive ? 'Live' : 'Paused'}
          </button>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {Object.entries(activityIcons).map(([type, Icon]) => {
            const count = activities.filter(a => a.type === type).length;
            return (
              <div key={type} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className={`${activityColors[type as keyof typeof activityColors]} bg-opacity-10 w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${activityColors[type as keyof typeof activityColors].replace('bg-', 'text-')}`} />
                </div>
                <p className="text-2xl font-black text-gray-900">{count}</p>
                <p className="text-xs text-gray-600 capitalize font-medium">{type}s</p>
              </div>
            );
          })}
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-black text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type];
                const colorClass = activityColors[activity.type];
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${colorClass} bg-opacity-10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 mb-1">{activity.message}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">{activity.user}</span>
                          {activity.university && (
                            <>
                              <span>•</span>
                              <span>{activity.university}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {activity.timestamp}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Activity Insights */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100">
            <h3 className="font-black text-gray-900 mb-4">Peak Activity Hours</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">12:00 PM - 2:00 PM</span>
                <span className="font-bold text-blue-600">Peak</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">6:00 PM - 8:00 PM</span>
                <span className="font-bold text-blue-600">High</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">2:00 AM - 6:00 AM</span>
                <span className="font-bold text-gray-500">Low</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-2xl border border-green-100">
            <h3 className="font-black text-gray-900 mb-4">Today's Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">New Signups</span>
                <span className="font-bold text-green-600">+142</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">New Listings</span>
                <span className="font-bold text-green-600">+89</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Completed Payments</span>
                <span className="font-bold text-green-600">+56</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
