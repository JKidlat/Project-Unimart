import React from 'react';
import { ThumbsUp, Flag, CheckCircle } from 'lucide-react';
import { StarRating } from './StarRating';

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

interface ReviewCardProps {
  review: Review;
  onReportReview?: (id: string) => void;
  onMarkHelpful?: (id: string) => void;
}

/**
 * ReviewCard Component
 * 
 * Displays an individual product review with:
 * - Reviewer information and university badge
 * - Star rating
 * - Review text
 * - Date posted
 * - Helpful voting and report functionality
 */
export const ReviewCard: React.FC<ReviewCardProps> = ({ 
  review, 
  onReportReview,
  onMarkHelpful 
}) => {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 hover:border-[#f3d7db] transition-all shadow-sm hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          {/* Reviewer Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-[#a14b58] to-[#c86371] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
            {review.reviewerName.charAt(0)}
          </div>
          
          {/* Reviewer Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-gray-900">{review.reviewerName}</h4>
              {review.verified && (
                <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />
              )}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs bg-[#fcf6f7] text-[#a14b58] px-2 py-1 rounded-lg font-bold border border-[#f3d7db]">
                {review.reviewerUniversity}
              </span>
              <span className="text-xs text-gray-400">
                {review.datePosted}
              </span>
            </div>
            <StarRating rating={review.rating} readonly size="sm" />
          </div>
        </div>

        {/* Report Button */}
        <button 
          onClick={() => onReportReview?.(review.id)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          title="Report review"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

      {/* Review Text */}
      <p className="text-gray-700 leading-relaxed mb-4">
        {review.reviewText}
      </p>

      {/* Helpful Button */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <button 
          onClick={() => onMarkHelpful?.(review.id)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#a14b58] transition-colors font-medium"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>Helpful {review.helpfulCount ? `(${review.helpfulCount})` : ''}</span>
        </button>
      </div>
    </div>
  );
};
