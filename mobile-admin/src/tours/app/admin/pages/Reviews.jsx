/* Ported from Frontend/src/modules/Tours/app/admin/pages/Reviews.jsx (tools/port.js first pass). */
/**
 * Review moderation.
 *
 * Hiding a review moves the package's rating with it — the server recomputes
 * the average from approved reviews only, so a rejected one stops counting.
 */
import React, { useCallback, useEffect, useState } from 'react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatCard, StatusPill, shortDate } from '../components/ui';
import { toast } from '../../../../lib/notify';
import { Button, Div, P, ScrollDiv, Span } from '../../../../components/web';
import usePrompt from '../components/usePrompt';
const FILTERS = ['all', 'approved', 'pending', 'rejected'];
const Stars = ({ rating }) => (
  <Span className="inline-flex items-center gap-0.5" accessibilityLabel={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Span key={star} className={star <= rating ? 'text-amber-400' : 'text-gray-300'}>
        ★
      </Span>
    ))}
  </Span>
);
const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [promptDialog, prompt] = usePrompt();
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getReviews(
        status === 'all'
          ? {}
          : {
              status,
            },
      );
      setReviews(data.reviews || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);
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
    const text = await prompt('Reply to this review', review.reply || '');
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
    <ScrollDiv className="p-4 pb-20 space-y-5">
      <PageHeader title="Reviews" subtitle="Rejecting a review also removes it from the package's rating." />

      {!loading && reviews.length > 0 && (
        <Div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Showing" value={reviews.length} />
          <StatCard
            label="Pending moderation"
            value={reviews.filter((r) => r.status === 'pending').length}
            tone={reviews.some((r) => r.status === 'pending') ? 'text-amber-600' : 'text-gray-900'}
          />
          <StatCard
            label="Average rating"
            value={`${(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)} ★`}
            tone="text-[#0a4d2b]"
          />
        </Div>
      )}

      <Div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <Button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors ${status === value ? 'bg-[#0a4d2b] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {value}
          </Button>
        ))}
      </Div>

      {loading ? (
        <Spinner />
      ) : reviews.length === 0 ? (
        <EmptyState message="No reviews here yet — travellers can review a trip once it is completed." />
      ) : (
        <Div className="space-y-3">
          {reviews.map((review) => (
            <Div key={review._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
              <Div className="flex flex-wrap items-start justify-between gap-3">
                <Div className="min-w-0">
                  <P className="font-bold text-gray-900 text-sm">{review.packageId?.title || 'Package'}</P>
                  <P className="text-xs text-gray-500">
                    {review.packageId?.title || 'Package'}
                    {' · '}
                    {review.userId?.name || 'Traveller'}
                    {' · '}
                    {shortDate(review.createdAt)}
                  </P>
                </Div>
                <Div className="flex items-center gap-2 shrink-0">
                  <Stars rating={review.rating} />
                  <StatusPill status={review.status} />
                </Div>
              </Div>

              {review.comment && <P className="text-sm text-gray-700 leading-relaxed">{review.comment}</P>}

              {review.reply && (
                <P className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                  <Span className="font-bold">Replied: </Span>
                  {review.reply}
                </P>
              )}

              <Div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  disabled={busyId === review._id}
                  onClick={() => reply(review)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {review.reply ? 'Edit reply' : 'Reply'}
                </Button>
                {review.status !== 'approved' && (
                  <Button
                    type="button"
                    disabled={busyId === review._id}
                    onClick={() => moderate(review, 'approved')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </Button>
                )}
                {review.status !== 'rejected' && (
                  <Button
                    type="button"
                    disabled={busyId === review._id}
                    onClick={() => moderate(review, 'rejected')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Hide
                  </Button>
                )}
              </Div>
            </Div>
          ))}
        </Div>
      )}
      {promptDialog}
    </ScrollDiv>
  );
};
export default Reviews;
