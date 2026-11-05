import React from 'react';
import { Link } from 'react-router';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 bg-[#fcf6f7] rounded-3xl flex items-center justify-center text-[#a14b58] mb-6 shadow-lg shadow-[#a14b581a]">
        <Compass className="w-12 h-12 animate-pulse" />
      </div>
      <h1 className="text-6xl font-black text-gray-900 mb-2">404</h1>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Page Not Found</h2>
      <p className="text-gray-500 max-w-md mb-8">
        The campus page or deal you're looking for doesn't exist or has been moved to another hostel block.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#a14b58] text-white rounded-2xl font-bold hover:bg-[#863b48] transition-all shadow-xl shadow-[#a14b5833]"
      >
        <ArrowLeft className="w-5 h-5" />
        Return to Home
      </Link>
    </div>
  );
};
