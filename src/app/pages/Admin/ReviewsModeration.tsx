/**
 * ==============================================================================
 * ADMIN REVIEWS & CONTENT MODERATION (ReviewsModeration.tsx)
 * ==============================================================================
 * Connected strictly to `/api/admin/reviews/` and `/api/admin/reviews/<id>/`.
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Flag,
  ThumbsUp,
  CheckCircle,
  Eye,
  AlertTriangle,
  Trash2,
  X,
  Check,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { StarRating } from '../../components/Reviews/StarRating';
import {
  AdminLoadingState,
  AdminErrorState,
  formatAdminDate,
} from '../../components/Admin/AdminStateFeedback';
import { api } from '../../../lib/api';
import { toast } from 'sonner';

interface AdminReviewItem {
  id: number;
  productName: string;
  productId: number;
  reviewerName: string;
  reviewerEmail: string;
  university: string;
  rating: number;
  reviewText: string;
  created_at: string | null;
  status: 'pending' | 'approved' | 'flagged' | 'removed';
  reportCount: number;
  flagReason?: string;
}

interface ReviewsResponse {
  stats: {
    total: number;
    pending: number;
    approved: number;
    flagged: number;
    removed: number;
    approval_rate: number;
  };
  results: AdminReviewItem[];
}

export const ReviewsModeration: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'flagged' | 'removed'>('all');
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewsResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedReview, setSelectedReview] = useState<AdminReviewItem | null>(null);
  const [flaggingReview, setFlaggingReview] = useState<AdminReviewItem | null>(null);
  const [selectedFlagReason, setSelectedFlagReason] = useState('Abusive / Harassing Language');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ReviewsResponse>('/admin/reviews/');
      setReviews(Array.isArray(res?.results) ? res.results : []);
      setStats(res?.stats || null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load reviews from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const filteredReviews = reviews.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.productName.toLowerCase().includes(q) ||
      r.reviewerName.toLowerCase().includes(q) ||
      r.reviewText.toLowerCase().includes(q) ||
      r.university.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleModerate = async (
    reviewId: number,
    nextStatus: AdminReviewItem['status'],
    flagReason?: string
  ) => {
    try {
      const res = await api.patch<{ review: AdminReviewItem }>(`/admin/reviews/${reviewId}/`, {
        status: nextStatus,
        ...(flagReason !== undefined ? { flagReason } : {}),
      });
      toast.success(`Review updated to ${nextStatus}.`);
      await loadReviews();
      if (selectedReview?.id === reviewId) {
        setSelectedReview(res.review);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update review.');
    }
  };

  const handleDeletePermanent = async (reviewId: number) => {
    if (!confirm('Permanently delete this review from the database?')) return;
    try {
      await api.delete(`/admin/reviews/${reviewId}/`);
      toast.success('Review permanently deleted.');
      if (selectedReview?.id === reviewId) setSelectedReview(null);
      await loadReviews();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete review.');
    }
  };

  const handleConfirmFlag = async () => {
    if (!flaggingReview) return;
    await handleModerate(flaggingReview.id, 'flagged', selectedFlagReason);
    setFlaggingReview(null);
  };

  const flaggedCount = stats?.flagged ?? 0;
  const pendingCount = stats?.pending ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Reviews Moderation</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Moderate customer product reviews, flag abusive feedback, and maintain trust
            </p>
          </div>
          <div className="flex items-center gap-2">
            {flaggedCount > 0 && (
              <button
                onClick={() => setStatusFilter('flagged')}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5 text-red-600" />
                <span>{flaggedCount} Flagged Reviews</span>
              </button>
            )}
            <button
              onClick={loadReviews}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading && reviews.length === 0 ? (
          <AdminLoadingState label="Loading product reviews..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={loadReviews} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Total Reviews</span>
                  <ThumbsUp className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.total ?? reviews.length}</p>
                <p className="text-[11px] text-gray-500 mt-1">All database reviews</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Pending Review</span>
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <p className="text-2xl font-black text-gray-900">{pendingCount}</p>
                <p className="text-[11px] text-gray-500 mt-1">Awaiting moderation</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Flagged</span>
                  <Flag className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-black text-gray-900">{flaggedCount}</p>
                <p className="text-[11px] text-red-600 font-bold mt-1">Hidden from shop</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Approval Rate</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-2xl font-black text-gray-900">{stats?.approval_rate ?? 0}%</p>
                <p className="text-[11px] text-gray-500 mt-1">{stats?.approved ?? 0} approved live</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reviews by student name, university, product, or keywords..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-xs sm:text-sm font-medium"
                  />
                </div>

                <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold flex-wrap">
                  {(['all', 'pending', 'approved', 'flagged', 'removed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                        statusFilter === status
                          ? 'bg-[#a14b58] text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                  No product reviews found in the database matching these filters.
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <div
                    key={review.id}
                    className={`bg-white p-6 rounded-2xl border shadow-xs transition-all ${
                      review.status === 'flagged'
                        ? 'border-red-200 bg-red-50/20'
                        : review.status === 'pending'
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
                              review.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : review.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : review.status === 'flagged'
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
                          <span>{formatAdminDate(review.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <StarRating rating={review.rating} readonly size="sm" />
                          <span className="text-xs font-bold text-gray-700 ml-1">({review.rating}.0)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {review.status !== 'approved' && (
                          <button
                            onClick={() => handleModerate(review.id, 'approved', '')}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}
                        {review.status !== 'flagged' && (
                          <button
                            onClick={() => setFlaggingReview(review)}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-bold text-xs flex items-center gap-1"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            Flag
                          </button>
                        )}
                        {review.status !== 'removed' && (
                          <button
                            onClick={() => handleModerate(review.id, 'removed')}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
                          >
                            Hide
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePermanent(review.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                        <button
                          onClick={() => setSelectedReview(review)}
                          className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-xl"
                          title="Inspect"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/60 p-3.5 rounded-xl border border-gray-100">
                      "{review.reviewText || 'No written comment.'}"
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
          </>
        )}

        {flaggingReview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setFlaggingReview(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Flag className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-1">Flag Review</h3>
              <p className="text-xs text-gray-500 mb-4">Select a moderation reason for review #{flaggingReview.id}</p>
              <div className="space-y-2 mb-6">
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
                    className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between ${
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
              <div className="flex gap-2">
                <button
                  onClick={() => setFlaggingReview(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFlag}
                  className="flex-1 py-2.5 bg-[#a14b58] hover:bg-[#863b48] text-white font-bold text-xs rounded-xl"
                >
                  Confirm & Flag
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedReview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setSelectedReview(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-black text-gray-900 mb-2">{selectedReview.productName}</h3>
              <p className="text-xs text-gray-500 mb-4">
                Reviewer: {selectedReview.reviewerName} ({selectedReview.reviewerEmail}) • {selectedReview.university}
              </p>
              <p className="text-sm text-gray-800 bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-4">
                "{selectedReview.reviewText}"
              </p>
              <button
                onClick={() => setSelectedReview(null)}
                className="w-full py-2.5 bg-[#a14b58] text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
