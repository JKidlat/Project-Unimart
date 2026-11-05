import React, { useState } from 'react';
import { Star, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReviewSummary } from './ReviewSummary';
import { ReviewCard } from './ReviewCard';
import { WriteReviewModal } from './WriteReviewModal';

interface Review {
  id: string;
  reviewerName: string;
  reviewerUniversity: string;
  rating: number;
  reviewText: string;
  datePosted: string;
  verified?: boolean;
  helpfulCount?: number;
}

interface ReviewsSectionProps {
  productName: string;
  reviews: Review[];
  canWriteReview?: boolean;
}

/**
 * ReviewsSection Component
 * 
 * Complete reviews and ratings section for product details page.
 * Includes summary, individual reviews, and write review functionality.
 */
export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  productName,
  reviews,
  canWriteReview = true
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedReviews, setDisplayedReviews] = useState(reviews);
  const [showAll, setShowAll] = useState(false);

  // Calculate statistics
  const totalReviews = displayedReviews.length;
  const averageRating = totalReviews > 0 
    ? displayedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
    : 0;

  // Calculate rating breakdown
  const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => {
    const count = displayedReviews.filter(r => r.rating === stars).length;
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { stars, count, percentage };
  });

  const handleSubmitReview = (rating: number, reviewText: string) => {
    const newReview: Review = {
      id: `review-${Date.now()}`,
      reviewerName: 'You',
      reviewerUniversity: 'UG - Legon',
      rating,
      reviewText,
      datePosted: 'Just now',
      verified: true,
      helpfulCount: 0
    };
    setDisplayedReviews([newReview, ...displayedReviews]);
  };

  const visibleReviews = showAll ? displayedReviews : displayedReviews.slice(0, 3);

  return (
    <div className="border-t border-gray-200 pt-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 group"
        >
          <h2 className="text-2xl font-black text-gray-900">
            Reviews & Ratings
          </h2>
          {isExpanded ? (
            <ChevronUp className="w-6 h-6 text-gray-400 group-hover:text-[#a14b58] transition-colors" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-400 group-hover:text-[#a14b58] transition-colors" />
          )}
        </button>

        {canWriteReview && isExpanded && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white rounded-2xl font-bold hover:shadow-lg transition-all"
          >
            <Edit3 className="w-4 h-4" />
            Write a Review
          </button>
        )}
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8 overflow-hidden"
          >
            {totalReviews > 0 ? (
              <>
                {/* Review Summary */}
                <ReviewSummary
                  averageRating={averageRating}
                  totalReviews={totalReviews}
                  ratingBreakdown={ratingBreakdown}
                />

                {/* Review List */}
                <div className="space-y-4">
                  {visibleReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>

                {/* Show More/Less Button */}
                {displayedReviews.length > 3 && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="px-6 py-3 bg-white border-2 border-[#f3d7db] text-[#a14b58] rounded-2xl font-bold hover:bg-[#fcf6f7] transition-all"
                    >
                      {showAll ? 'Show Less' : `Show All ${displayedReviews.length} Reviews`}
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Empty State */
              <div className="bg-gradient-to-br from-gray-50 to-white p-12 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center">
                <div className="w-20 h-20 bg-[#fcf6f7] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-10 h-10 text-[#a14b58]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No reviews yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Be the first to share your experience with this product and help other students make informed decisions.
                </p>
                {canWriteReview && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-gradient-to-r from-[#a14b58] to-[#c86371] text-white rounded-2xl font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Write the First Review
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productName={productName}
        onSubmit={handleSubmitReview}
      />
    </div>
  );
};
