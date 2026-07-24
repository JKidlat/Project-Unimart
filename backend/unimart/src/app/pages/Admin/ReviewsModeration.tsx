import React, { useState } from 'react';
import { Search, Flag, ThumbsUp, CheckCircle, XCircle, Eye } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { StarRating } from '../../components/Reviews/StarRating';
import { toast } from 'sonner';

interface Review {
  id: string;
  productName: string;
  reviewerName: string;
  university: string;
  rating: number;
  reviewText: string;
  datePosted: string;
  status: 'Pending' | 'Approved' | 'Flagged' | 'Removed';
  reportCount: number;
}

const mockReviews: Review[] = [
  {
    id: '1',
    productName: 'MacBook Pro 2019',
    reviewerName: 'Kwame Mensah',
    university: 'UG - Legon',
    rating: 5,
    reviewText: 'Excellent condition! The MacBook works perfectly.',
    datePosted: '2024-03-01',
    status: 'Approved',
    reportCount: 0
  },
  {
    id: '2',
    productName: 'Engineering Textbooks',
    reviewerName: 'Abena Osei',
    university: 'KNUST',
    rating: 4,
    reviewText: 'Good quality textbook. A bit worn but readable.',
    datePosted: '2024-03-02',
    status: 'Approved',
    reportCount: 0
  },
  {
    id: '3',
    productName: 'iPhone 12',
    reviewerName: 'Anonymous User',
    university: 'UCC',
    rating: 1,
    reviewText: 'This seller is a scammer! Avoid at all costs!!!',
    datePosted: '2024-02-28',
    status: 'Flagged',
    reportCount: 3
  },
  {
    id: '4',
    productName: 'Dorm Furniture',
    reviewerName: 'Sarah Appiah',
    university: 'UPSA',
    rating: 3,
    reviewText: 'Contains inappropriate language and spam content.',
    datePosted: '2024-02-27',
    status: 'Pending',
    reportCount: 2
  }
];

/**
 * ReviewsModeration Component
 * 
 * Admin interface for moderating product reviews:
 * - View all reviews with status filters
 * - Approve or remove reviews
 * - Flag abusive/inappropriate content
 * - View report details
 */
export const ReviewsModeration = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Flagged' | 'Removed'>('All');
  const [reviews, setReviews] = useState(mockReviews);

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          review.reviewerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || review.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (reviewId: string) => {
    setReviews(reviews.map(r => 
      r.id === reviewId ? { ...r, status: 'Approved' as const } : r
    ));
    toast.success('Review approved');
  };

  const handleRemove = (reviewId: string) => {
    if (confirm('Are you sure you want to remove this review?')) {
      setReviews(reviews.map(r => 
        r.id === reviewId ? { ...r, status: 'Removed' as const } : r
      ));
      toast.success('Review removed');
    }
  };

  const handleFlag = (reviewId: string) => {
    setReviews(reviews.map(r => 
      r.id === reviewId ? { ...r, status: 'Flagged' as const } : r
    ));
    toast.warning('Review flagged for further review');
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Reviews Moderation</h1>
          <p className="text-gray-600">Monitor and moderate product reviews</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Total Reviews</span>
              <ThumbsUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">1,842</p>
            <p className="text-xs text-green-600 font-bold mt-1">↑ 15% this month</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Pending</span>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            </div>
            <p className="text-3xl font-black text-gray-900">24</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting moderation</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Flagged</span>
              <Flag className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">8</p>
            <p className="text-xs text-red-600 font-bold mt-1">Needs attention</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">Approved</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">1,810</p>
            <p className="text-xs text-gray-500 mt-1">98.3% approval rate</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(['All', 'Pending', 'Approved', 'Flagged', 'Removed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-[#a14b58] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white p-6 rounded-2xl border shadow-sm transition-all ${
                review.status === 'Flagged' 
                  ? 'border-red-200 bg-red-50' 
                  : review.status === 'Pending'
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900">{review.productName}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      review.status === 'Approved' 
                        ? 'bg-green-100 text-green-700'
                        : review.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : review.status === 'Flagged'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {review.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span className="font-medium">{review.reviewerName}</span>
                    <span>•</span>
                    <span>{review.university}</span>
                    <span>•</span>
                    <span>{review.datePosted}</span>
                    {review.reportCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <Flag className="w-3 h-3" />
                          {review.reportCount} reports
                        </span>
                      </>
                    )}
                  </div>
                  <StarRating rating={review.rating} readonly size="sm" />
                </div>
              </div>

              <p className="text-gray-700 mb-4 leading-relaxed">{review.reviewText}</p>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                {review.status !== 'Approved' && (
                  <button
                    onClick={() => handleApprove(review.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold text-sm hover:bg-green-200 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                )}
                {review.status !== 'Flagged' && (
                  <button
                    onClick={() => handleFlag(review.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl font-bold text-sm hover:bg-yellow-200 transition-all"
                  >
                    <Flag className="w-4 h-4" />
                    Flag
                  </button>
                )}
                {review.status !== 'Removed' && (
                  <button
                    onClick={() => handleRemove(review.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Remove
                  </button>
                )}
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all ml-auto">
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
