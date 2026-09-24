/**
 * Add the stay business to a partner who already runs a restaurant.
 *
 * The other way in — choosing "both" at sign-up — runs these same two steps
 * inline as steps 4-5 of the restaurant wizard (see Onboarding.jsx). Here the
 * partner already has a session, so there's no signup ticket to spend: step 1
 * goes straight to POST /partner/profiles/hotel, then step 2 to the KYC
 * endpoint, both with the live session.
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createHotelProfile, submitHotelKyc, fetchPartnerProfiles } from './partnerApi';
import {
  setPartnerProfiles,
  setActiveWorkspace,
  WORKSPACE,
  hasHotelProfile,
} from './partnerSession';
import { setPartnerSession } from '@/modules/Hotel/utils/partnerAuth';
import {
  HotelBusinessFields,
  HotelDocumentsFields,
  HOTEL_BUSINESS_DEFAULTS,
  HOTEL_DOCUMENTS_DEFAULTS,
  validateHotelBusinessFields,
  validateHotelDocumentFields,
  buildHotelKycFormData,
} from './hotelOnboardingFields';

export default function AddHotelBusiness() {
  const navigate = useNavigate();
  const location = useLocation();

  /*
   * Arriving from the "both" signup, the owner details were just collected by
   * the restaurant wizard — asking for the same name a second time would be a
   * poor welcome. Coming from settings there is no state and these start empty.
   */
  const prefill = location.state || {};
  const continuingSignup = Boolean(prefill.name || prefill.email);

  const [step, setStep] = useState(1);
  const [business, setBusiness] = useState({
    ...HOTEL_BUSINESS_DEFAULTS,
    businessName: prefill.name || '',
    ownerName: prefill.name || '',
    email: prefill.email || '',
  });
  const [documents, setDocuments] = useState(HOTEL_DOCUMENTS_DEFAULTS);
  const [loading, setLoading] = useState(false);

  const goNext = () => {
    const errors = validateHotelBusinessFields(business);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const submit = async () => {
    const errors = validateHotelDocumentFields(documents);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }

    setLoading(true);

    try {
      const session = await createHotelProfile({ name: business.businessName.trim(), email: business.email.trim() });

      if (session?.token) {
        setPartnerSession(session.token, session.user);
      }

      await submitHotelKyc(buildHotelKycFormData(business, documents));

      // Re-read from the server rather than assuming, so the switcher matches
      // what actually exists.
      try {
        const profiles = await fetchPartnerProfiles();
        setPartnerProfiles(profiles?.profiles || []);
      } catch {
        setPartnerProfiles([WORKSPACE.RESTAURANT, WORKSPACE.HOTEL]);
      }

      setActiveWorkspace(WORKSPACE.HOTEL);
      toast.success('Submitted for review');
      navigate('/hotel/partner/under-review', { replace: true });
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
        onClick={() => {
          if (step === 2) {
            setStep(1);
            return;
          }
          continuingSignup
            ? navigate('/food/restaurant/pending-verification', { replace: true })
            : navigate(-1);
        }}
        className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"
      >
        <ArrowLeft size={14} />
        {step === 1 && continuingSignup ? 'Skip for now' : 'Back'}
      </button>

      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Building2 size={22} />
        </span>
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {step === 1 ? (continuingSignup ? 'Now your stay' : 'List a hotel or stay') : 'Verify your identity'}
          </h1>
          <p className="text-xs text-slate-500">
            {step === 1
              ? continuingSignup
                ? 'Your restaurant is in for review. Next, set up your stay.'
                : 'Runs alongside your restaurant on the same sign-in.'
              : 'Required before you can list a property.'}
          </p>
        </div>
      </div>

      {step === 1 ? (
        <HotelBusinessFields values={business} onChange={setBusiness} />
      ) : (
        <HotelDocumentsFields values={documents} onChange={setDocuments} />
      )}

      <button
        type="button"
        onClick={step === 1 ? goNext : submit}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {loading ? 'Submitting' : step === 1 ? 'Continue' : 'Submit for review'}
      </button>
    </div>
  );
}
