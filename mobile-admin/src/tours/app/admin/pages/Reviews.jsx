/* Ported from Frontend/src/modules/Tours/app/admin/pages/Reviews.jsx (tools/port.js first pass). */
/**
 * Review moderation.
 *
 * Hiding a review moves the package's rating with it — the server recomputes
 * the average from approved reviews only, so a rejected one stops counting.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { shortDate } from '../components/ui';
import {
  AdminPage,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
  TableSkeleton,
  Toolbar,
} from '../../../../admin/ui';
import { toast } from '../../../../lib/notify';
import { Button, Div, P, Span, Icon as UiIcon } from '../../../../components/web';
import usePrompt from '../components/usePrompt';
const FILTERS = ['all', 'approved', 'pending', 'rejected'];
const Stars = ({ rating }) => (
  <Div className="flex-row items-center gap-0.5" accessibilityLabel={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <UiIcon key={star} as={Star} size={14} className={star <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />
    ))}
  </Div>
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
    <AdminPage maxWidth={900}>
      <PageHeader
        title="Reviews"
        subtitle="Rejecting a review also removes it from the package's rating."
        breadcrumb={[{ label: 'Tours' }, { label: 'Reviews' }]}
      />

      {!loading && reviews.length > 0 && (
        <StatGrid className="mb-4">
          <StatCard label="Showing" value={reviews.length} />
          <StatCard
            label="Pending moderation"
            value={reviews.filter((r) => r.status === 'pending').length}
            tone={reviews.some((r) => r.status === 'pending') ? 'warning' : 'info'}
          />
          <StatCard label="Average rating" value={`${(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)} ★`} tone="success" />
        </StatGrid>
      )}

      <Toolbar>
        {FILTERS.map((value) => (
          <Button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`h-11 px-4 rounded-full items-center justify-center ${status === value ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
          >
            <Span className={`text-sm font-semibold ${status === value ? 'text-white' : 'text-slate-700'}`}>{value}</Span>
          </Button>
        ))}
      </Toolbar>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No reviews here yet"
          message="Travellers can review a trip once it is completed."
          actionLabel="Reload"
          onAction={load}
        />
      ) : (
        <Div className="gap-3">
          {reviews.map((review) => (
            <Card key={review._id} className="gap-2">
              <Div className="flex-row flex-wrap items-start justify-between gap-3">
                <Div className="flex-1 min-w-0" style={{ minWidth: 180 }}>
                  <P className="text-base font-semibold text-slate-900" numberOfLines={2}>
                    {review.packageId?.title || 'Package'}
                  </P>
                  <P className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                    {review.userId?.name || 'Traveller'}
                    {' · '}
                    {shortDate(review.createdAt)}
                  </P>
                </Div>
                <Div className="flex-row items-center gap-2 shrink-0">
                  <Stars rating={review.rating} />
                  <StatusBadge status={review.status} />
                </Div>
              </Div>

              {review.comment ? <P className="text-sm text-slate-700">{review.comment}</P> : null}

              {review.reply ? (
                <Div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <P className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Replied</P>
                  <P className="text-sm text-slate-700">{review.reply}</P>
                </Div>
              ) : null}

              <Div className="flex-row flex-wrap gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  disabled={busyId === review._id}
                  onClick={() => reply(review)}
                  className="h-11 px-4 rounded-lg border border-slate-300 bg-white items-center justify-center disabled:opacity-50"
                >
                  <Span className="text-sm font-semibold text-slate-700">{review.reply ? 'Edit reply' : 'Reply'}</Span>
                </Button>
                {review.status !== 'approved' && (
                  <Button
                    type="button"
                    disabled={busyId === review._id}
                    onClick={() => moderate(review, 'approved')}
                    className="h-11 px-4 rounded-lg bg-blue-600 items-center justify-center disabled:opacity-50"
                  >
                    <Span className="text-sm font-semibold text-white">Approve</Span>
                  </Button>
                )}
                {review.status !== 'rejected' && (
                  <Button
                    type="button"
                    disabled={busyId === review._id}
                    onClick={() => moderate(review, 'rejected')}
                    className="h-11 px-4 rounded-lg border border-slate-300 bg-white items-center justify-center disabled:opacity-50"
                  >
                    <Span className="text-sm font-semibold text-slate-700">Hide</Span>
                  </Button>
                )}
              </Div>
            </Card>
          ))}
        </Div>
      )}
      {promptDialog}
    </AdminPage>
  );
};
export default Reviews;
