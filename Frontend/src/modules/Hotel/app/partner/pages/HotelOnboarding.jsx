/**
 * Hotel-only onboarding: two steps (business/owner details, then Aadhaar/PAN),
 * replacing the old single name+email form. Reached from OnboardingChoice with
 * a signup ticket stashed in sessionStorage — a full navigation, same as the
 * restaurant wizard's entry, so the ticket has to survive the reload.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { completePartnerSignup } from '@/services/api/auth';
import { submitHotelKyc } from '@/shared/partner/partnerApi';
import { storePartnerSession, setActiveWorkspace, clearOnboardingIntent, WORKSPACE } from '@/shared/partner/partnerSession';
import {
  HotelBusinessFields,
  HotelDocumentsFields,
  HOTEL_BUSINESS_DEFAULTS,
  HOTEL_DOCUMENTS_DEFAULTS,
  validateHotelBusinessFields,
  validateHotelDocumentFields,
  buildHotelKycFormData,
} from '@/shared/partner/hotelOnboardingFields';

const SIGNUP_TOKEN_KEY = 'hotel_onboarding_signup_token';
const PHONE_KEY = 'hotel_onboarding_phone';

export default function HotelOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [business, setBusiness] = useState(HOTEL_BUSINESS_DEFAULTS);
  const [documents, setDocuments] = useState(HOTEL_DOCUMENTS_DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [signupToken] = useState(() => {
    try {
      return sessionStorage.getItem(SIGNUP_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (!signupToken) {
      toast.error('Your sign-in has expired. Please verify your number again.');
      navigate('/food/restaurant/login', { replace: true });
    }
  }, [signupToken, navigate]);

  const goNext = () => {
    const errors = validateHotelBusinessFields(business);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const goBack = () => {
    setStep(1);
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
      const response = await completePartnerSignup(signupToken, {
        name: business.businessName.trim(),
        email: business.email.trim(),
      });
      const data = response?.data?.data || response?.data || {};
      storePartnerSession(data);

      await submitHotelKyc(buildHotelKycFormData(business, documents));

      try {
        sessionStorage.removeItem(SIGNUP_TOKEN_KEY);
        sessionStorage.removeItem(PHONE_KEY);
      } catch {
        /* non-fatal */
      }

      setActiveWorkspace(WORKSPACE.HOTEL);
      clearOnboardingIntent();
      toast.success('Submitted for review.');
      navigate('/hotel/partner/under-review', { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Could not submit your details. Please try again.';
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex items-center justify-between border-b bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={step === 1 ? () => navigate(-1) : goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200/80 bg-gray-50 shadow-sm transition-all active:scale-90 hover:bg-gray-100"
            aria-label={step === 1 ? 'Back' : 'Previous step'}
          >
            <ArrowLeft className="h-[18px] w-[18px] text-gray-700" strokeWidth={2.5} />
          </button>
          <div className="text-sm font-semibold text-black">Hotel onboarding</div>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Step {step} of 2</div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Building2 size={22} />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {step === 1 ? 'Tell us about your stay' : 'Verify your identity'}
            </h1>
            <p className="text-xs text-slate-500">
              {step === 1 ? 'So guests know who they are booking with.' : 'Required before you can list a property.'}
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
      </main>
    </div>
  );
}
