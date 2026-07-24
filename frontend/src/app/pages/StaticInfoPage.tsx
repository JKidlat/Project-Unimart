import React from 'react';
import { 
  HelpCircle, Shield, Truck, 
  RotateCcw, FileText, Lock, 
  ChevronRight, ArrowLeft 
} from 'lucide-react';
import { Link, useLocation } from 'react-router';

interface PageContent {
  title: string;
  icon: any;
  sections: { title: string; content: string }[];
}

const contentMap: Record<string, PageContent> = {
  '/how-it-works': {
    title: 'How Unimart Works',
    icon: HelpCircle,
    sections: [
      { title: '1. Create an Account', content: 'Sign up using your university email to get verified. This ensures a safe marketplace for everyone.' },
      { title: '2. Find What You Need', content: 'Browse listings from students on your campus or other universities across Ghana.' },
      { title: '3. Secure Payments', content: 'Pay via Mobile Money (MTN, Vodafone, AirtelTigo). Funds are held securely until you receive your item.' },
      { title: '4. Meetup or Delivery', content: 'Choose to meet on campus at a safe location or opt for campus delivery services.' }
    ]
  },
  '/help': {
    title: 'Help Center',
    icon: HelpCircle,
    sections: [
      { title: 'Common Questions', content: 'How do I track my order? How do I become a seller? What if I forgot my password?' },
      { title: 'Contact Support', content: 'Our team is available 24/7. Email us at support@unimart.com.gh or call +233 24 000 0000.' }
    ]
  },
  '/safety': {
    title: 'Safety Tips',
    icon: Shield,
    sections: [
      { title: 'Meeting Safely', content: 'Always meet in public campus locations during daylight hours. Bring a friend if possible.' },
      { title: 'Protect Your Data', content: 'Never share your password or MoMo PIN with anyone, even if they claim to be from Unimart.' },
      { title: 'Scam Prevention', content: 'Be wary of deals that seem too good to be true. Inspect items before confirming receipt.' }
    ]
  },
  '/delivery': {
    title: 'Campus Delivery',
    icon: Truck,
    sections: [
      { title: 'Coverage', content: 'We currently deliver to UG, KNUST, UCC, and UPSA campuses.' },
      { title: 'Pricing', content: 'Standard delivery is GH₵10 within campus. Express delivery is GH₵20.' },
      { title: 'Tracking', content: 'You can track your delivery person in real-time through the "My Orders" section.' }
    ]
  },
  '/returns': {
    title: 'Return Policy',
    icon: RotateCcw,
    sections: [
      { title: 'Conditions', content: 'Items can be returned within 24 hours of receipt if they don\'t match the description.' },
      { title: 'Process', content: 'Initiate a return through the app. A campus rep will inspect the item and facilitate the refund.' }
    ]
  },
  '/terms': {
    title: 'Terms of Service',
    icon: FileText,
    sections: [
      { title: 'User Agreement', content: 'By using Unimart, you agree to abide by our community standards and campus rules.' },
      { title: 'Seller Responsibilities', content: 'Sellers must provide accurate descriptions and honor their listings.' }
    ]
  },
  '/privacy': {
    title: 'Privacy Policy',
    icon: Lock,
    sections: [
      { title: 'Data Collection', content: 'We only collect data necessary for transactions and campus verification.' },
      { title: 'Third Parties', content: 'We never sell your data to third parties. Your information is encrypted and secure.' }
    ]
  }
};

export const StaticInfoPage = () => {
  const { pathname } = useLocation();
  const content = contentMap[pathname] || contentMap['/help'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-[#a14b58] font-bold mb-8 hover:translate-x-[-4px] transition-transform">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#fcf6f7] rounded-full translate-x-1/2 -translate-y-1/2 -z-0" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-[#fcf6f7] rounded-2xl flex items-center justify-center text-[#a14b58] mb-6 border border-[#f3d7db]">
            <content.icon className="w-8 h-8" />
          </div>
          
          <h1 className="text-4xl font-black text-gray-900 mb-10">{content.title}</h1>
          
          <div className="space-y-12">
            {content.sections.map((section, idx) => (
              <div key={idx} className="group">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-sm text-[#a14b58] border border-gray-100 group-hover:bg-[#a14b58] group-hover:text-white transition-all">
                    {idx + 1}
                  </span>
                  {section.title}
                </h3>
                <p className="text-gray-500 leading-relaxed pl-11">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-12 p-8 bg-gradient-to-br from-[#a14b58] to-[#6f323d] rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h4 className="text-xl font-bold mb-1">Still have questions?</h4>
          <p className="text-[#f3d7db] text-sm">We're here to help you 24/7.</p>
        </div>
        <Link to="/contact" className="px-8 py-3 bg-white text-[#a14b58] rounded-xl font-bold hover:scale-105 transition-all">
          Contact Us
        </Link>
      </div>
    </div>
  );
};
