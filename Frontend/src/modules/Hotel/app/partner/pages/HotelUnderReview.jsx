/**
 * The one review screen for whichever business(es) were just submitted.
 *
 * Reached from the hotel-only wizard, and from the end of the combined
 * "both" wizard — GET /partner/profiles already reports both halves in one
 * call, so this renders a card per business that exists rather than needing
 * a restaurant-specific and a hotel-specific screen. Restaurant already had
 * its own dedicated screen (Food/pages/restaurant/auth/VerificationPending);
 * that one is untouched and still used for the restaurant-only path.
 *
 * Each business unlocks independently: the moment one is approved, this
 * redirects to *that* dashboard, even if the other is still pending — a
 * partner shouldn't be blocked from serving customers on the half of their
 * business that already cleared review.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, ShieldCheck, XCircle, Loader2 } from 'lucide-react';
import { fetchPartnerProfiles } from '@/shared/partner/partnerApi';
import { isPartnerSignedIn, getPartnerUser } from '@/modules/Hotel/utils/partnerAuth';
import { isModuleAuthenticated, patchStoredUser } from '@/shared/utils/moduleAuth';
import { clearPartnerSessions } from '@/shared/partner/partnerSession';

const STATUS_META = {
  pending: { label: 'Under review', tone: 'pending' },
  approved: { label: 'Approved', tone: 'approved' },
  rejected: { label: 'Rejected', tone: 'rejected' },
  banned: { label: 'Disabled', tone: 'rejected' },
};

function StatusCard({ title, status, note }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900">{title}</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
            meta.tone === 'approved'
              ? 'bg-emerald-50 text-emerald-700'
              : meta.tone === 'rejected'
              ? 'bg-red-50 text-red-600'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {meta.tone === 'approved' ? <ShieldCheck size={11} /> : meta.tone === 'rejected' ? <XCircle size={11} /> : <Clock3 size={11} />}
          {meta.label}
        </span>
      </div>
      {note ? <p className="mt-1.5 text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}

export default function HotelUnderReview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({ restaurant: null, hotel: null });
  const redirectedRef = useRef(false);

  const check = useCallback(async () => {
    try {
      const data = await fetchPartnerProfiles();
      setProfiles({ restaurant: data?.restaurant || null, hotel: data?.hotel || null });

      if (data?.restaurant) {
        patchStoredUser('restaurant', { status: data.restaurant.status });
      }
      if (data?.hotel) {
        const currentUser = getPartnerUser() || {};
        patchStoredUser('partner', {
          ...currentUser,
          partnerApprovalStatus: data.hotel.partnerApprovalStatus,
          onboardingComplete: data.hotel.onboardingComplete,
        });
      }

      if (redirectedRef.current) return;

      if (data?.restaurant?.status === 'approved') {
        redirectedRef.current = true;
        navigate('/food/restaurant', { replace: true });
        return;
      }

      if (data?.hotel?.partnerApprovalStatus === 'approved') {
        redirectedRef.current = true;
        navigate('/hotel/partner/dashboard', { replace: true });
      }
    } catch {
      // Keep the review screen up — a failed check is not a status change.
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!isPartnerSignedIn() && !isModuleAuthenticated('restaurant')) {
      navigate('/food/restaurant/login', { replace: true });
      return;
    }

    check();

    const onFocus = () => {
      if (document.visibilityState === 'visible') check();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [check, navigate]);

  const signOut = () => {
    clearPartnerSessions();
    navigate('/food/restaurant/login', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-[#04190c] px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto flex w-full max-w-md min-h-[calc(100dvh-3rem)] flex-col justify-center">
        <div className="w-full rounded-[24px] border border-[#caa83e]/30 bg-[#051f11] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.65)] sm:p-8">
          <div className="mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#caa83e]/15 text-[#caa83e]">
              <Clock3 className="h-8 w-8" />
            </div>
          </div>

          <div className="mb-6 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#caa83e]">Application submitted</p>
            <h1 className="mx-auto max-w-[19rem] text-[15px] font-extrabold leading-5 text-[#f4efe2] sm:text-xl sm:leading-tight">
              Your details are under review
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#9fb3a4]">
              Our team verifies new partners before their dashboard opens. You'll be able to
              come straight in the moment each business is approved.
            </p>
            {loading ? (
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-[#5d7264]">Checking latest status...</p>
            ) : (
              <div className="mt-3 h-4" aria-hidden="true" />
            )}
          </div>

          <div className="mb-6 space-y-3">
            {profiles.restaurant ? (
              <StatusCard
                title="Restaurant"
                status={profiles.restaurant.status}
                note={profiles.restaurant.status === 'rejected' ? 'Contact support or re-apply from the login screen.' : null}
              />
            ) : null}
            {profiles.hotel ? (
              <StatusCard
                title="Hotel / stay"
                status={profiles.hotel.partnerApprovalStatus}
                note={profiles.hotel.partnerApprovalStatus === 'rejected' ? 'Contact support to appeal this decision.' : null}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={signOut}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#caa83e]/35 bg-transparent text-sm font-semibold text-[#9fb3a4] transition-all active:scale-[0.98] hover:border-[#caa83e] hover:text-[#f4efe2]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
