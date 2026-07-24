import React, { useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, Upload, Send } from 'lucide-react';
import { toast } from 'sonner';

const issueCategories = [
  'Payment Issue',
  'Order Problem',
  'Account Issue',
  'Technical Problem',
  'Fraud/Scam',
  'Inappropriate Content',
  'Other'
];

/**
 * ReportIssue Component
 * 
 * Allows users to report various issues including:
 * - Payment problems
 * - Order issues
 * - Account problems
 * - Technical difficulties
 * - Fraud/scam reports
 */
export const ReportIssue = () => {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) {
      toast.error('Please select a category');
      return;
    }
    
    if (description.trim().length < 20) {
      toast.error('Please provide more details (minimum 20 characters)');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Issue reported successfully! Our team will review it soon.');
    
    // Reset form
    setCategory('');
    setDescription('');
    setScreenshot(null);
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back Button */}
      <Link 
        to="/help"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-[#a14b58] mb-8 font-medium"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Help Center
      </Link>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 mb-4">Report an Issue</h1>
        <p className="text-lg text-gray-600">
          Let us know what's wrong and we'll look into it right away.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-lg">
        {/* Category Selection */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Issue Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none font-medium"
          >
            <option value="">Select a category</option>
            {issueCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Describe the Issue *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please provide as much detail as possible about the issue you're experiencing..."
            rows={6}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className={`text-xs ${description.length < 20 ? 'text-gray-400' : 'text-green-600'} font-medium`}>
              {description.length < 20 ? `${20 - description.length} characters minimum` : '✓ Looks good'}
            </span>
            <span className="text-xs text-gray-400">
              {description.length}/1000
            </span>
          </div>
        </div>

        {/* Screenshot Upload */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Attach Screenshot (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-[#a14b58] transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
              className="hidden"
              id="screenshot-upload"
            />
            <label htmlFor="screenshot-upload" className="cursor-pointer">
              <div className="w-16 h-16 bg-[#fcf6f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-[#a14b58]" />
              </div>
              <p className="font-medium text-gray-900 mb-1">
                {screenshot ? screenshot.name : 'Click to upload screenshot'}
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG up to 10MB
              </p>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !category || description.length < 20}
          className="w-full py-4 bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white rounded-2xl font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            'Submitting...'
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Report
            </>
          )}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-100 p-6 rounded-2xl">
        <h3 className="font-bold text-blue-900 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Our team will review your report within 24 hours</li>
          <li>• You'll receive an email confirmation and updates</li>
          <li>• We may contact you for additional information</li>
        </ul>
      </div>
    </div>
  );
};
