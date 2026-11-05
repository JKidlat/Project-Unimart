/**
 * ==============================================================================
 * ADMIN REVIEWS & CONTENT MODERATION (ReviewsModeration.tsx)
 * ==============================================================================
 * This page allows platform administrators to review and moderate customer reviews:
 * - Approve authentic product reviews and ratings.
 * - Flag or remove toxic, spam, or abusive reviews.
 * - Inspect reviewer profiles, universities, and target product listings.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { 
  Search, Flag, ThumbsUp, CheckCircle, XCircle, Eye, 
  AlertTriangle, MessageSquare, Trash2, ShieldAlert, X, 
  Check, Filter, Star
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { StarRating } from '../../components/Reviews/StarRating';
import { toast } from 'sonner';

interface ReviewItem {
  id: string;
  productName: string;
  productId: string;
  reviewerName: string;
  reviewerEmail: string;
  university: string;
  rating: number;
  reviewText: string;
  datePosted: string;
  status: 'Pending' | 'Approved' | 'Flagged' | 'Removed';
  reportCount: number;
  flagReason?: string;
}

const mockReviews: ReviewItem[] = [
  {
    id: 'rev-01',
    productName: 'MacBook Pro 16" (2019)',
    productId: 'prod-101',
    reviewerName: 'Kwame Mensah',
    reviewerEmail: 'kwame.m@ug.edu.gh',
    university: 'University of Ghana - Legon',
    rating: 5,
    reviewText: 'Excellent condition! The MacBook works perfectly, and the battery cycle count is actually lower than advertised. Great seller to deal with on campus.',
    datePosted: '28 Oct 2024',
    status: 'Approved',
    reportCount: 0,
  },
  {
    id: 'rev-02',
    productName: 'Engineering Textbooks Bundle',
    productId: 'prod-102',
    reviewerName: 'Abena Osei',
    reviewerEmail: 'abena.o@knust.edu.gh',
    university: 'KNUST - Kumasi',
    rating: 4,
    reviewText: 'Good quality textbook. Minor annotations inside, but all problem sets and formulas are intact. Fast meetup near CCB auditorium.',
    datePosted: '26 Oct 2024',
    status: 'Approved',
    reportCount: 0,
  },
  {
    id: 'rev-03',
    productName: 'Apple iPhone 12 Pro (Pacific Blue)',
    productId: 'prod-103',
    reviewerName: 'Emmanuel Boateng',
    reviewerEmail: 'emmanuel.b@ucc.edu.gh',
    university: 'University of Cape Coast (UCC)',
    rating: 1,
    reviewText: 'THIS PERSON IS A COMPLETE SCAMMER DO NOT SEND ANY MONEY VIA MOMO BEFORE SEEING THE PHONE! TOTAL FRAUD!',
    datePosted: '25 Oct 2024',
    status: 'Flagged',
    reportCount: 4,
    flagReason: 'Abusive language and unverified scam allegations',
  },
  {
    id: 'rev-04',
    productName: 'Dorm Wooden Desk & Study Chair',
    productId: 'prod-104',
    reviewerName: 'Sarah Appiah',
    reviewerEmail: 'sarah.a@upsa.edu.gh',
    university: 'UPSA - Accra',
    rating: 2,
    reviewText: 'Desk had scratches on the tabletop that were not visible in the listing photos. Seller arrived 45 minutes late to the hostel.',
    datePosted: '24 Oct 2024',
    status: 'Pending',
    reportCount: 1,
    flagReason: 'Dispute over item condition',
  },
  {
    id: 'rev-05',
    productName: 'Mini Refrigerator (Hisense 90L)',
    productId: 'prod-105',
    reviewerName: 'Kofi Asare',
    reviewerEmail: 'kofi.a@ug.edu.gh',
    university: 'University of Ghana - Legon',
    rating: 5,
    reviewText: 'Fridge chills beverages fast and makes zero noise in my Commonwealth Hall room. Highly recommended!',
    datePosted: '22 Oct 2024',
    status: 'Approved',
    reportCount: 0,
  }
];

export const ReviewsModeration: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Flagged' | 'Removed'>('All');
  const [reviews, setReviews] = useState<ReviewItem[]>(mockReviews);
  
  // Modals state
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [flaggingReview, setFlaggingReview] = useState<ReviewItem | null>(null);
  const [selectedFlagReason, setSelectedFlagReason] = useState('Abusive / Harassing Language');

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reviewerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reviewText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.university.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (reviewId: string) => {
    setReviews(prev =>
      prev.map(r => r.id === reviewId ? { ...r, status: 'Approved' } : r)
    );
    if (selectedReview?.id === reviewId) {
      setSelectedReview(prev => prev ? { ...prev, status: 'Approved' } : null);
    }
    toast.success('Review approved and visible to shoppers.');
  };

  const handleRemove = (reviewId: string) => {
    if (confirm('Permanently remove this review from the product page?')) {
      setReviews(prev =>
        prev.map(r => r.id === reviewId ? { ...r, status: 'Removed' } : r)
      );
      if (selectedReview?.id === reviewId) {
        setSelectedReview(prev => prev ? { ...prev, status: 'Removed' } : null);
      }
      toast.success('Review removed due to community violation.');
    }
  };

  const handleConfirmFlag = () => {
    if (!flaggingReview) return;
    setReviews(prev =>
      prev.map(r =>
        r.id === flaggingReview.id
          ? { ...r, status: 'Flagged', flagReason: selectedFlagReason, reportCount: r.reportCount + 1 }
          : r
      )
    );
    toast.warning(`Review flagged as "${selectedFlagReason}".`);
    setFlaggingReview(null);
  };

  const flaggedCount = reviews.filter(r => r.status === 'Flagged').length;
  const pendingCount = reviews.filter(r => r.status === 'Pending').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Reviews Moderation</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Audit student feedback, flag abusive ratings, and protect marketplace integrity
            </p>
          </div>
          <div className="flex items-center gap-2">
            {flaggedCount > 0 && (
              <button
                onClick={() => setStatusFilter('Flagged')}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5 text-red-600" />
                <span>{flaggedCount} Flagged Reviews</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Total Reviews</span>
              <ThumbsUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">1,842</p>
            <p className="text-[11px] text-green-600 font-bold mt-1">↑ 15% this month</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Pending Review</span>
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <p className="text-2xl font-black text-gray-900">{pendingCount}</p>
            <p className="text-[11px] text-gray-500 mt-1">Awaiting moderation</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Flagged Abusive</span>
              <Flag className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-gray-900">{flaggedCount}</p>
            <p className="text-[11px] text-red-600 font-bold mt-1">Needs attention</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Approval Rate</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">98.3%</p>
            <p className="text-[11px] text-gray-500 mt-1">High community trust</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews by student name, campus, product, or keywords..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-xs sm:text-sm font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold">
                {(['All', 'Pending', 'Approved', 'Flagged', 'Removed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === status
                        ? 'bg-[#a14b58] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {status}
                    {status === 'Flagged' && flaggedCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 bg-red-500 text-white text-[10px] rounded-full">
                        {flaggedCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Cards List */}
        <div className="space-y-4">
          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              No reviews match the current filters.
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div
                key={review.id}
                className={`bg-white p-6 rounded-2xl border shadow-xs transition-all hover:shadow-md ${
                  review.status === 'Flagged'
                    ? 'border-red-200 bg-red-50/20'
                    : review.status === 'Pending'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-gray-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-base">{review.productName}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                          review.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : review.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : review.status === 'Flagged'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {review.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
                      <span className="font-bold text-gray-800">{review.reviewerName}</span>
                      <span>•</span>
                      <span>{review.university}</span>
                      <span>•</span>
                      <span>{review.datePosted}</span>
                      {review.reportCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <Flag className="w-3 h-3" />
                            {review.reportCount} user reports
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <StarRating rating={review.rating} readonly size="sm" />
                      <span className="text-xs font-bold text-gray-700 ml-1">({review.rating}.0)</span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {review.status !== 'Approved' && (
                      <button
                        onClick={() => handleApprove(review.id)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}

                    {review.status !== 'Flagged' && (
                      <button
                        onClick={() => setFlaggingReview(review)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Flag Abusive
                      </button>
                    )}

                    {review.status !== 'Removed' && (
                      <button
                        onClick={() => handleRemove(review.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedReview(review)}
                      className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-xl transition-colors"
                      title="Inspect Full Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/60 p-3.5 rounded-xl border border-gray-100">
                  "{review.reviewText}"
                </p>

                {review.flagReason && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-red-700 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Moderation Note: {review.flagReason}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Flag Abusive Content Modal */}
        {flaggingReview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setFlaggingReview(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Flag className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-1">Flag Abusive Content</h3>
              <p className="text-xs text-gray-500 mb-4">
                Categorize this moderation violation for review #{flaggingReview.id}
              </p>

              <div className="space-y-3 mb-6">
                <label className="text-xs font-bold text-gray-700 block">Violation Reason:</label>
                {[
                  'Abusive / Harassing Language',
                  'Unverified Scam Accusations',
                  'Spam or Promotional Link',
                  'Hate Speech or Personal Attacks',
                  'Off-Topic / Irrelevant Review',
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedFlagReason(reason)}
                    className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                      selectedFlagReason === reason
                        ? 'border-[#a14b58] bg-[#fcf6f7] text-[#a14b58]'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{reason}</span>
                    {selectedFlagReason === reason && <Check className="w-4 h-4 text-[#a14b58]" />}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFlaggingReview(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFlag}
                  className="flex-1 py-2.5 bg-[#a14b58] hover:bg-[#863b48] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#a14b58]/30"
                >
                  Confirm & Flag
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inspect Details Modal */}
        {selectedReview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setSelectedReview(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-black text-gray-900 mb-1">Review Audit Log</h3>
              <p className="text-xs text-gray-500 mb-5">Audit trail and reviewer credentials</p>

              <div className="bg-[#faf8f8] p-4 rounded-2xl border border-gray-100 space-y-3 text-xs mb-6">
                <div>
                  <span className="text-gray-400 font-bold block">Target Product</span>
                  <span className="font-bold text-gray-900">{selectedReview.productName}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Reviewer</span>
                  <span className="font-bold text-gray-900">
                    {selectedReview.reviewerName} ({selectedReview.reviewerEmail})
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">University Campus</span>
                  <span className="font-bold text-gray-900">{selectedReview.university}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Rating & Submission Date</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating rating={selectedReview.rating} readonly size="sm" />
                    <span className="text-gray-500">({selectedReview.datePosted})</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block">Review Content</span>
                  <p className="mt-1 text-gray-800 bg-white p-3 rounded-xl border border-gray-100 italic">
                    "{selectedReview.reviewText}"
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedReview(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
