/**
 * Review moderation.
 *
 * Hiding a review moves the package's rating with it — the server recomputes
 * the average from approved reviews only, so a rejected one stops counting.
 */
import React, { useCallback, useEffect, useState } from 'react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatusPill, shortDate } from '../components/ui';
import toast from 'react-hot-toast';

const FILTERS = ['all', 'approved', 'pending', 'rejected'];

const Stars = ({ rating }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <span key={star} className={star <= rating ? 'text-amber-400' : 'text-gray-300'}>★</span>
    ))}
  </span>
);

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getReviews(status === 'all' ? {} : { status });
      setReviews(data.reviews || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const moderate = async (review, next) => {
    try {
      setBusyId(review._id);
      await adminService.updateReviewStatus(review._id, next);
      toast.success(`Review ${next}`);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this review');
    } finally {
      setBusyId(null);
    }
  };

  /*
   * Answering a review publicly. The endpoint was there from the start with
   * nothing calling it, so a traveller's complaint could be approved or hidden
   * but never replied to.
   */
  const reply = async (review) => {
    const text = window.prompt('Reply to this review', review.reply || '');
    if (text === null) return;

    try {
      setBusyId(review._id);
      await adminService.replyToReview(review._id, text.trim());
      toast.success(text.trim() ? 'Reply posted' : 'Reply removed');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not post the reply');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reviews"
        subtitle="Rejecting a review also removes it from the package's rating."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors ${
              status === value
                ? 'bg-[#0a4d2b] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : reviews.length === 0 ? (
        <EmptyState message="No reviews here yet — travellers can review a trip once it is completed." />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm">
                    {review.packageId?.title || 'Package'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {review.packageId?.title || 'Package'}
                    {' · '}
                    {review.userId?.name || 'Traveller'}
                    {' · '}
                    {shortDate(review.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Stars rating={review.rating} />
                  <StatusPill status={review.status} />
                </div>
              </div>

              {review.comment && (
                <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
              )}

              {review.reply && (
                <p className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                  <span className="font-bold">Replied: </span>{review.reply}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  disabled={busyId === review._id}
                  onClick={() => reply(review)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {review.reply ? 'Edit reply' : 'Reply'}
                </button>
                {review.status !== 'approved' && (
                  <button
                    type="button"
                    disabled={busyId === review._id}
                    onClick={() => moderate(review, 'approved')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
                {review.status !== 'rejected' && (
                  <button
                    type="button"
                    disabled={busyId === review._id}
                    onClick={() => moderate(review, 'rejected')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Hide
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reviews;
