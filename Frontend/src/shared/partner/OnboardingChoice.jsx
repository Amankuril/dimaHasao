/**
 * What is this new partner opening?
 *
 * Shown when a verified number owns neither business. Restaurant and hotel
 * onboard through completely different routes — a three-step wizard that ends
 * in POST /food/restaurant/register, versus an account plus a property listing
 * — so the answer decides which one runs, and "both" runs them in turn.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Store, Building2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { completePartnerSignup } from '@/services/api/auth';
import {
  storePartnerSession,
  setOnboardingIntent,
  setActiveWorkspace,
  WORKSPACE,
} from './partnerSession';

const CHOICES = [
  {
    id: 'restaurant',
    label: 'Restaurant',
    hint: 'Serve food for delivery, takeaway or dining',
    Icon: Store,
  },
  {
    id: 'hotel',
    label: 'Hotel or stay',
    hint: 'List a hotel, resort, homestay or lodge',
    Icon: Building2,
  },
  {
    id: 'both',
    label: 'Both',
    hint: 'Restaurant first, then your stay',
    Icon: Layers,
  },
];

export default function OnboardingChoice({ phone, signupToken }) {
  const navigate = useNavigate();
  const [choice, setChoice] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  /** Restaurant and "both" both start in the restaurant wizard. */
  const startRestaurant = (intent) => {
    setOnboardingIntent(intent);
    setActiveWorkspace(WORKSPACE.RESTAURANT);
    window.location.replace('/food/restaurant/onboarding');
  };

  /**
   * Hotel on its own: there is no session yet, so the account is created with
   * the signup ticket from verify, then straight on to listing a property.
   *
   * The "both" path does not come through here. It runs the restaurant wizard
   * first and creates the hotel account afterwards, with the session that
   * registration now hands back — otherwise the hotel half would be over
   * before the restaurant half began.
   */
  const startHotel = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);

    try {
      const response = await completePartnerSignup(signupToken, {
        name: name.trim(),
        email: email.trim(),
      });
      const data = response?.data?.data || response?.data || {};

      storePartnerSession(data);
      setActiveWorkspace(WORKSPACE.HOTEL);
      setOnboardingIntent('');
      navigate('/hotel/partner/join', { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Could not create your partner account. Please try again.';
      toast.error(message);
      setLoading(false);
    }
  };

  const handlePick = (id) => {
    if (id === 'restaurant') return startRestaurant('restaurant');
    if (id === 'both') return startRestaurant('both');
    return setChoice('hotel'); // hotel alone needs a name before anything else
  };

  if (choice === 'hotel') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="dh-playfair text-[22px] font-black tracking-wide text-[#f4efe2]">A few details</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#9fb3a4]">
            So guests know who they are booking with.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.3em] text-[#caa83e]">
            Your name
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            autoFocus
            className="w-full rounded-xl border border-[#caa83e]/25 bg-black/20 px-4 py-3 text-sm text-[#f4efe2] outline-none placeholder:text-[#9fb3a4]/50 focus:border-[#caa83e]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.3em] text-[#caa83e]">
            Email <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            className="w-full rounded-xl border border-[#caa83e]/25 bg-black/20 px-4 py-3 text-sm text-[#f4efe2] outline-none placeholder:text-[#9fb3a4]/50 focus:border-[#caa83e]"
          />
        </div>

        <button
          type="button"
          onClick={startHotel}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#caa83e] py-3.5 text-sm font-black uppercase tracking-wide text-[#10231a] disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Creating your account' : 'Continue'}
        </button>

        <button
          type="button"
          onClick={() => setChoice('')}
          className="w-full text-center text-[10px] font-black uppercase tracking-[0.25em] text-[#9fb3a4] transition-colors hover:text-[#caa83e]"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="dh-playfair text-[22px] font-black tracking-wide text-[#f4efe2]">What are you listing?</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#9fb3a4]">
          Signing in as <span className="font-bold text-[#f4efe2]">{phone}</span>. You can add
          the other one later from settings.
        </p>
      </div>

      <div className="space-y-2.5">
        {CHOICES.map(({ id, label, hint, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handlePick(id)}
            className="flex w-full items-center gap-3.5 rounded-2xl border border-[#caa83e]/25 bg-black/15 p-4 text-left transition-colors hover:border-[#caa83e] hover:bg-black/25"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#caa83e]/15 text-[#caa83e]">
              <Icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[#f4efe2]">{label}</span>
              <span className="block text-xs text-[#9fb3a4]">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
