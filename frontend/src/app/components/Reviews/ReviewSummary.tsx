import React from 'react';
import { Star } from 'lucide-react';
import { StarRating } from './StarRating';

interface ReviewSummaryProps {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: { stars: number; count: number; percentage: number }[];
}

/**
 * ReviewSummary Component
 * 
 * Displays aggregate review statistics including:
 * - Average rating with large display
 * - Total number of reviews
 * - Rating breakdown with progress bars for each star level
 */
export const ReviewSummary: React.FC<ReviewSummaryProps> = ({
  averageRating,
  totalReviews,
  ratingBreakdown
}) => {
  return (
    <div className="bg-gradient-to-br from-[#fcf6f7] to-white p-8 rounded-[2.5rem] border border-[#f3d7db] shadow-sm">
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
        {/* Average Rating Display */}
        <div className="text-center md:text-left md:border-r md:border-[#f3d7db] md:pr-8">
          <div className="text-6xl font-black text-gray-900 mb-2">
            {averageRating.toFixed(1)}
          </div>
          <StarRating rating={averageRating} readonly size="lg" />
          <p className="text-sm text-gray-500 mt-3 font-medium">
            Based on <span className="font-bold text-gray-900">{totalReviews}</span> reviews
          </p>
        </div>

        {/* Rating Breakdown */}
        <div className="flex-1 w-full space-y-3">
          {ratingBreakdown.sort((a, b) => b.stars - a.stars).map(({ stars, count, percentage }) => (
            <div key={stars} className="flex items-center gap-4">
              <div className="flex items-center gap-1 w-16">
                <span className="text-sm font-bold text-gray-700">{stars}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#a14b58] to-[#c86371] h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-500 w-12 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
