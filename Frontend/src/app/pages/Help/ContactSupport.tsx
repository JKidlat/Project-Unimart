import React, { useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Send, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ContactSupport Component
 * 
 * Contact form for users to reach support team with:
 * - Multiple contact options
 * - Quick response time estimates
 * - Support hours information
 */
export const ContactSupport = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !subject || !message) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Message sent! We\'ll get back to you within 24 hours.');
    
    // Reset form
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
        <h1 className="text-4xl font-black text-gray-900 mb-4">Contact Support</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Have a question or need assistance? Our support team is here to help you.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-lg">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Send us a message</h2>
            
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@ug.edu.gh"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="How can we help?"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us more about your inquiry..."
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white rounded-2xl font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          {/* Response Time */}
          <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-black text-gray-900">Response Time</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              We typically respond within <span className="font-bold text-blue-600">24 hours</span> during business days. 
              Urgent issues are prioritized.
            </p>
          </div>

          {/* Email */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-[#a14b58]" />
              <h3 className="font-bold text-gray-900">Email</h3>
            </div>
            <a href="mailto:support@unimart.gh" className="text-sm text-gray-700 hover:text-[#a14b58] transition-colors">
              support@unimart.gh
            </a>
          </div>

          {/* Phone */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-5 h-5 text-[#a14b58]" />
              <h3 className="font-bold text-gray-900">Phone</h3>
            </div>
            <p className="text-sm text-gray-700">+233 (0) 50 123 4567</p>
            <p className="text-xs text-gray-500 mt-1">Mon-Fri: 9AM - 6PM</p>
          </div>

          {/* Office */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-[#a14b58]" />
              <h3 className="font-bold text-gray-900">Office</h3>
            </div>
            <p className="text-sm text-gray-700">
              University of Ghana, Legon<br />
              Accra, Ghana
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-12 bg-gradient-to-br from-[#fcf6f7] to-white p-8 rounded-[2.5rem] border border-[#f3d7db]">
        <h3 className="text-xl font-black text-gray-900 mb-4">Before you contact us...</h3>
        <p className="text-gray-600 mb-6">You might find your answer faster in these resources:</p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/help/faq"
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm hover:border-[#a14b58] hover:text-[#a14b58] transition-all"
          >
            FAQ
          </Link>
          <Link
            to="/help/report"
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm hover:border-[#a14b58] hover:text-[#a14b58] transition-all"
          >
            Report an Issue
          </Link>
          <Link
            to="/help/status"
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm hover:border-[#a14b58] hover:text-[#a14b58] transition-all"
          >
            System Status
          </Link>
        </div>
      </div>
    </div>
  );
};
