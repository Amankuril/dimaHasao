/**
 * What is this new partner opening?
 *
 * Shown when a verified number owns neither business. Restaurant is a
 * three-step wizard ending in POST /food/restaurant/register; hotel is its
 * own two-step wizard (owner details, then Aadhaar/PAN) ending in an account
 * plus KYC. "Both" runs all five steps back to back inside the restaurant
 * wizard, then submits both at once — see Onboarding.jsx's intent==='both'
 * branch for where that actually happens.
 */
import { Store, Building2, Layers } from 'lucide-react';
import {
  setOnboardingIntent,
  setActiveWorkspace,
  WORKSPACE,
} from './partnerSession';

const HOTEL_SIGNUP_TOKEN_KEY = 'hotel_onboarding_signup_token';
const HOTEL_SIGNUP_PHONE_KEY = 'hotel_onboarding_phone';

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
  /** Restaurant and "both" both start in the restaurant wizard. */
  const startRestaurant = (intent) => {
    setOnboardingIntent(intent);
    setActiveWorkspace(WORKSPACE.RESTAURANT);
    window.location.replace('/food/restaurant/onboarding');
  };

  /**
   * Hotel on its own: there is no session yet, so its wizard carries the
   * signup ticket through sessionStorage (a full navigation, like the
   * restaurant one above) and spends it on the ticket's own final step.
   *
   * The "both" path does not come through here — it runs the restaurant
   * wizard first, then its own hotel steps 4-5, using the session that
   * restaurant registration hands back rather than this ticket at all.
   */
  const startHotel = () => {
    try {
      sessionStorage.setItem(HOTEL_SIGNUP_TOKEN_KEY, signupToken || '');
      sessionStorage.setItem(HOTEL_SIGNUP_PHONE_KEY, phone || '');
    } catch {
      /* non-fatal — the wizard will bounce back to login if this is missing */
    }
    setOnboardingIntent('');
    setActiveWorkspace(WORKSPACE.HOTEL);
    window.location.assign('/hotel/partner/onboarding');
  };

  const handlePick = (id) => {
    if (id === 'restaurant') return startRestaurant('restaurant');
    if (id === 'both') return startRestaurant('both');
    return startHotel();
  };

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
