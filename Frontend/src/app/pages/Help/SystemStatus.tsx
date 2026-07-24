import React from 'react';
import { Link } from 'react-router';
import { ChevronLeft, CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  description: string;
  uptime: string;
}

const services: ServiceStatus[] = [
  {
    name: 'Marketplace & Listings',
    status: 'operational',
    description: 'All marketplace features are working normally',
    uptime: '99.9%'
  },
  {
    name: 'User Authentication',
    status: 'operational',
    description: 'Login, signup, and session management',
    uptime: '99.8%'
  },
  {
    name: 'Payment Processing',
    status: 'operational',
    description: 'Mobile Money and Paystack integration',
    uptime: '99.7%'
  },
  {
    name: 'Messaging System',
    status: 'operational',
    description: 'Chat and real-time messaging',
    uptime: '99.6%'
  },
  {
    name: 'Search & Filters',
    status: 'degraded',
    description: 'Some search queries may be slower than usual',
    uptime: '98.2%'
  },
  {
    name: 'Image Upload',
    status: 'operational',
    description: 'Product image uploads and optimization',
    uptime: '99.9%'
  }
];

const incidents = [
  {
    id: '1',
    title: 'Resolved: Search Performance Issues',
    date: '2024-03-01',
    status: 'resolved',
    description: 'We experienced slower than normal search response times between 2:00 PM - 3:30 PM. The issue has been identified and resolved.'
  },
  {
    id: '2',
    title: 'Scheduled Maintenance',
    date: '2024-02-28',
    status: 'completed',
    description: 'Routine database maintenance was performed successfully with minimal disruption.'
  }
];

/**
 * SystemStatus Component
 * 
 * Displays real-time status of all Unimart services:
 * - Service health monitoring
 * - Uptime statistics
 * - Recent incidents and resolutions
 * - Scheduled maintenance notifications
 */
export const SystemStatus = () => {
  const allOperational = services.every(s => s.status === 'operational');
  const hasIssues = services.some(s => s.status === 'degraded' || s.status === 'down');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back Button */}
      <Link 
        to="/help-center"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-[#a14b58] mb-8 font-medium"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Help Center
      </Link>

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-4">System Status</h1>
        <p className="text-lg text-gray-600">
          Real-time status of Unimart services and infrastructure
        </p>
      </div>

      {/* Overall Status Banner */}
      <div className={`p-6 rounded-[2.5rem] mb-8 ${
        allOperational 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
          : 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            allOperational ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            {allOperational ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            )}
          </div>
          <div className="flex-1">
            <h2 className={`text-2xl font-black mb-1 ${
              allOperational ? 'text-green-900' : 'text-yellow-900'
            }`}>
              {allOperational ? 'All Systems Operational' : 'Some Systems Experiencing Issues'}
            </h2>
            <p className={allOperational ? 'text-green-700' : 'text-yellow-700'}>
              {allOperational 
                ? 'All Unimart services are running smoothly'
                : 'We are working to resolve the issues as quickly as possible'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-lg overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900">Service Status</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {services.map((service, idx) => (
            <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900">{service.name}</h3>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      service.status === 'operational'
                        ? 'bg-green-100 text-green-700'
                        : service.status === 'degraded'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {service.status === 'operational' && <CheckCircle className="w-3 h-3" />}
                      {service.status === 'degraded' && <AlertTriangle className="w-3 h-3" />}
                      {service.status === 'down' && <XCircle className="w-3 h-3" />}
                      {service.status === 'operational' ? 'Operational' : service.status === 'degraded' ? 'Degraded' : 'Down'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{service.description}</p>
                </div>
                <div className="ml-6 text-right">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Activity className="w-4 h-4" />
                    <span className="font-bold">{service.uptime}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">30-day uptime</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900">Recent Incidents</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {incidents.length > 0 ? (
            incidents.map((incident) => (
              <div key={incident.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900">{incident.title}</h3>
                      <span className="text-xs text-gray-500">{incident.date}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{incident.description}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium">No recent incidents</p>
              <p className="text-sm mt-1">All systems have been running smoothly</p>
            </div>
          )}
        </div>
      </div>

      {/* Subscribe to Updates */}
      <div className="mt-8 bg-gradient-to-br from-[#fcf6f7] to-white p-8 rounded-[2.5rem] border border-[#f3d7db] text-center">
        <h3 className="text-xl font-black text-gray-900 mb-2">Stay Updated</h3>
        <p className="text-gray-600 mb-6">
          Subscribe to get notifications about system status updates and maintenance schedules
        </p>
        <div className="flex gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
          />
          <button className="px-6 py-3 bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white rounded-2xl font-bold hover:shadow-lg transition-all">
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
};
