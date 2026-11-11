/**
 * ==============================================================================
 * SITE FOOTER COMPONENT (Footer.tsx)
 * ==============================================================================
 * This component renders the global footer displayed across all public and buyer
 * pages in the Unimart application.
 *
 * Four Columns Layout:
 * 1. Brand Identity & Social Links:
 *    - Logo, mission statement, and social network buttons.
 * 2. Quick Links:
 *    - Direct navigation to catalog, categories, selling items, and Admin portal.
 * 3. Support & Trust:
 *    - Links to Help Center, Safety tips, Campus delivery, and return policies.
 * 4. Campus Contact Info:
 *    - Physical campus headquarters (Legon Student Hub), phone support, and email.
 *
 * Bottom Copyright Bar:
 * - Legal copyright notice and links to Privacy Policy, Terms, and Admin Access.
 * ==============================================================================
 */

import React from 'react';
import { Link } from 'react-router';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          
          {/* ============================================================== */}
          {/* COLUMN 1: BRAND IDENTITY & SOCIAL NETWORKS                     */}
          {/* ============================================================== */}
          <div className="space-y-6 lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#a14b58] to-[#6f323d] rounded-xl flex items-center justify-center shadow-lg shadow-[#a14b5833]">
                <span className="text-white font-bold text-2xl">U</span>
              </div>
              <span className="text-2xl font-bold text-white">
                Unimart
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm">
              Ghana's premier tertiary student marketplace. Built by students, for students. Connecting verified campus sellers with buyers across accredited institutions in Ghana.
            </p>
            {/* Social media icon buttons */}
            <div className="flex space-x-4">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, idx) => (
                <button 
                  key={idx} 
                  className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-[#a14b58] hover:text-white transition-all"
                  aria-label="Social media link"
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* COLUMN 2: QUICK SHOP & PLATFORM LINKS                         */}
          {/* ============================================================== */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-3.5 text-sm">
              <li><Link to="/shop" className="hover:text-[#a14b58] transition-colors">Shop All Products</Link></li>
              <li><Link to="/categories" className="hover:text-[#a14b58] transition-colors">Categories</Link></li>
              <li><Link to="/sell" className="hover:text-[#a14b58] transition-colors">Sell an Item</Link></li>
              <li><Link to="/deals" className="hover:text-[#a14b58] transition-colors">Flash Deals</Link></li>
              <li><Link to="/how-it-works" className="hover:text-[#a14b58] transition-colors">How it Works</Link></li>
            </ul>
          </div>

          {/* ============================================================== */}
          {/* COLUMN 3: STUDENT SUPPORT & SAFETY                             */}
          {/* ============================================================== */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Support</h3>
            <ul className="space-y-3.5 text-sm">
              <li><Link to="/help-center" className="hover:text-[#a14b58] transition-colors">Help Center</Link></li>
              <li><Link to="/contact" className="hover:text-[#a14b58] transition-colors">Contact Support</Link></li>
              <li><Link to="/help/faq" className="hover:text-[#a14b58] transition-colors">FAQ</Link></li>
              <li><Link to="/safety" className="hover:text-[#a14b58] transition-colors">Safety Tips</Link></li>
            </ul>
          </div>

          {/* ============================================================== */}
          {/* COLUMN 4: LEGAL & GOVERNANCE (Ghana Law Compliance)             */}
          {/* ============================================================== */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Legal & Trust</h3>
            <ul className="space-y-3.5 text-sm">
              <li><Link to="/legal" className="text-[#f48fb1] font-semibold hover:underline">Legal Center</Link></li>
              <li><Link to="/legal/terms" className="hover:text-[#a14b58] transition-colors">Terms and Conditions</Link></li>
              <li><Link to="/legal/privacy" className="hover:text-[#a14b58] transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal/refunds-returns" className="hover:text-[#a14b58] transition-colors">Refund & Returns</Link></li>
              <li><Link to="/legal/delivery" className="hover:text-[#a14b58] transition-colors">Delivery & Collection</Link></li>
              <li><Link to="/legal/seller-agreement" className="hover:text-[#a14b58] transition-colors">Seller Agreement</Link></li>
            </ul>
          </div>
        </div>
        
        {/* ============================================================== */}
        {/* BOTTOM COPYRIGHT & LEGAL POLICIES                              */}
        {/* ============================================================== */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              © 2026 Unimart Ghana. All rights reserved. Registered under Ghana Data Protection Act (Act 843) &amp; Electronic Transactions Act (Act 772).
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gray-800 text-gray-300 border border-gray-700">
                Act 843 • Data Protection
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gray-800 text-gray-300 border border-gray-700">
                Act 772 • E-Transactions
              </span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-5 text-xs text-gray-400">
            <Link to="/legal" className="hover:text-white transition-colors">All 13 Legal Policies</Link>
            <Link to="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/legal/cookies" className="hover:text-white transition-colors">Cookies</Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).openCookiePreferences) {
                  (window as any).openCookiePreferences();
                }
              }}
              className="hover:text-[#f48fb1] transition-colors underline cursor-pointer"
            >
              Cookie Preferences
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
