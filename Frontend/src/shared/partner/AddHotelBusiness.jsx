/**
 * Add the stay business to a partner who already runs a restaurant.
 *
 * The other way in — choosing "both" at sign-up — spends the signup ticket from
 * verify. Here the partner is already signed in, so the account is created with
 * their session instead, through POST /partner/profiles/hotel.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createHotelProfile } from './partnerApi';
import { fetchPartnerProfiles } from './partnerApi';
import {
  setPartnerProfiles,
  setActiveWorkspace,
  WORKSPACE,
  hasHotelProfile,
} from './partnerSession';
import { setPartnerSession } from '@/modules/Hotel/utils/partnerAuth';

export default function AddHotelBusiness() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a contact name');
      return;
    }

    setLoading(true);

    try {
      const session = await createHotelProfile({ name: name.trim(), email: email.trim() });

      if (session?.token) {
        setPartnerSession(session.token, session.user);
      }

      // Re-read from the server rather than assuming, so the switcher matches
      // what actually exists.
      try {
        const profiles = await fetchPartnerProfiles();
        setPartnerProfiles(profiles?.profiles || []);
      } catch {
        setPartnerProfiles([WORKSPACE.RESTAURANT, WORKSPACE.HOTEL]);
      }

      setActiveWorkspace(WORKSPACE.HOTEL);
      toast.success('Stay business added');
      navigate('/hotel/partner/join', { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Could not add the stay business. Please try again.';
      toast.error(message);
      setLoading(false);
    }
  };

  if (hasHotelProfile()) {
    return (
      <div className="mx-auto max-w-md px-5 py-10 text-center">
        <p className="text-sm text-slate-600">You already have a stay business.</p>
        <button
          type="button"
          onClick={() => navigate('/hotel/partner/dashboard')}
          className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
        >
          Go to it
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Building2 size={22} />
        </span>
        <div>
          <h1 className="text-lg font-bold text-slate-900">List a hotel or stay</h1>
          <p className="text-xs text-slate-500">
            Runs alongside your restaurant on the same sign-in.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contact name
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Adding' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
