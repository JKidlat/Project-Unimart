import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StarRating } from './StarRating';
import { toast } from 'sonner';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  onSubmit: (rating: number, reviewText: string) => void;
}

/**
 * WriteReviewModal Component
 * 
 * A modal dialog for users to write and submit product reviews.
 * Includes star rating selector and text input field with validation.
 */
export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  isOpen,
  onClose,
  productName,
  onSubmit
}) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    if (reviewText.trim().length < 10) {
      toast.error('Please write at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSubmit(rating, reviewText);
    toast.success('Review submitted successfully!');
    
    // Reset form
    setRating(0);
    setReviewText('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#a14b58] to-[#c86371] p-6 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <h2 className="text-2xl font-black text-white mb-1">Write a Review</h2>
              <p className="text-white/90 text-sm">{productName}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Rating Selector */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Your Rating *
                </label>
                <div className="flex items-center gap-4">
                  <StarRating 
                    rating={rating} 
                    onRatingChange={setRating}
                    size="lg"
                  />
                  {rating > 0 && (
                    <span className="text-sm font-medium text-gray-600">
                      {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
                    </span>
                  )}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Your Review *
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience with this product..."
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs ${reviewText.length < 10 ? 'text-gray-400' : 'text-green-600'} font-medium`}>
                    {reviewText.length < 10 ? `${10 - reviewText.length} characters minimum` : '✓ Looks good'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {reviewText.length}/500
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || reviewText.length < 10}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white rounded-2xl font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
