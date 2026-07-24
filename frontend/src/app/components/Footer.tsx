import React from 'react';
import { Link } from 'react-router';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

/**
 * Footer Component
 * 
 * Provides the site-wide footer with:
 * - Brand identity and social links
 * - Quick navigation links to shop and info pages
 * - Support and safety links
 * - Campus contact information
 * - Legal links (Privacy, Terms)
 */
export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#a14b58] to-[#6f323d] rounded-xl flex items-center justify-center shadow-lg shadow-[#a14b5833]">
                <span className="text-white font-bold text-2xl">U</span>
              </div>
              <span className="text-2xl font-bold text-white">
                Unimart
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              Ghana's #1 student marketplace. Built by students, for students. Buy and sell with ease within your campus community.
            </p>
            <div className="flex space-x-4">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, idx) => (
                <button key={idx} className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-[#a14b58] hover:text-white transition-all">
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold mb-6">Quick Links</h3>
            <ul className="space-y-4 text-sm">
              <li><Link to="/shop" className="hover:text-[#a14b58] transition-colors">Shop All</Link></li>
              <li><Link to="/categories" className="hover:text-[#a14b58] transition-colors">Categories</Link></li>
              <li><Link to="/sell" className="hover:text-[#a14b58] transition-colors">Sell an Item</Link></li>
              <li><Link to="/deals" className="hover:text-[#a14b58] transition-colors">Flash Deals</Link></li>
              <li><Link to="/how-it-works" className="hover:text-[#a14b58] transition-colors">How it Works</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-6">Support</h3>
            <ul className="space-y-4 text-sm">
              <li><Link to="/help" className="hover:text-[#a14b58] transition-colors">Help Center</Link></li>
              <li><Link to="/safety" className="hover:text-[#a14b58] transition-colors">Safety Tips</Link></li>
              <li><Link to="/delivery" className="hover:text-[#a14b58] transition-colors">Campus Delivery</Link></li>
              <li><Link to="/returns" className="hover:text-[#a14b58] transition-colors">Return Policy</Link></li>
              <li><Link to="/contact" className="hover:text-[#a14b58] transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-6">Contact Us</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#a14b58] shrink-0" />
                <span>Legon Campus, Student Hub, Accra, Ghana</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#a14b58] shrink-0" />
                <span>+233 24 000 0000</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#a14b58] shrink-0" />
                <span>support@unimart.com.gh</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-10 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm">© 2026 Unimart Ghana. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/cookies" className="hover:text-white transition-colors">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
