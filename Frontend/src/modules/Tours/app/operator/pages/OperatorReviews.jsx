/**
 * What travellers said, and the operator's chance to answer.
 *
 * Only reviews an admin has approved are visible to the public, so a review
 * here may not be one a traveller can see yet.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import operatorService from '../../../services/operatorService';

const shortDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const Stars = ({ rating }) => (
  <span className="inline-flex items-center gap-0.5 text-sm" aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <span key={star} className={star <= rating ? 'text-amber-400' : 'text-gray-300'}>★</span>
    ))}
  </span>
);

const OperatorReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await operatorService.getReviews();
      setReviews(data.reviews || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reply = async (review) => {
    const text = String(drafts[review._id] ?? '').trim();
    if (!text) return toast.error('Write a reply first');

    try {
      setBusyId(review._id);
      await operatorService.replyToReview(review._id, text);
      toast.success('Reply posted');
      setDrafts((d) => ({ ...d, [review._id]: '' }));
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not post your reply');
    } finally {
      setBusyId(null);
    }
  };

  const average = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';

  if (loading) {
    return <p className="text-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin inline" /></p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">
            Travellers can review a trip once you mark it completed.
          </p>
        </div>
        {reviews.length > 0 && (
          <p className="text-sm font-bold text-gray-700">
            {average} average · {reviews.length} review{reviews.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="to-card p-10 text-center text-sm text-gray-400">No reviews yet.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review._id} className="to-card p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{review.packageId?.title || 'Package'}</p>
                  <p className="text-xs text-gray-500">
                    {review.userId?.name || 'Traveller'} · {shortDate(review.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Stars rating={review.rating} />
                  {review.status !== 'approved' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
                      {review.status}
                    </span>
                  )}
                </div>
              </div>

              {review.comment && <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>}

              {review.reply ? (
                <p className="text-xs text-emerald-900 bg-[#e8f2ec] border border-emerald-100 rounded-lg p-2.5">
                  <span className="font-bold">You replied: </span>{review.reply}
                </p>
              ) : (
                <div className="flex gap-2 pt-1">
                  <input
                    className="to-input"
                    placeholder="Reply to this traveller…"
                    value={drafts[review._id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [review._id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={busyId === review._id}
                    onClick={() => reply(review)}
                    className="to-btn shrink-0"
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OperatorReviews;
