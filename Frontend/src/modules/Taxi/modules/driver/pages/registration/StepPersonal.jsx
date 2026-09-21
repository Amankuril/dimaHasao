/**
 * Step 3 — who the driver is.
 *
 * The referral code used to be a screen of its own between this and the vehicle
 * step, asking for one optional field. It is folded in here as a row a driver
 * opens only if they have a code, which removes a whole step from the walk
 * without losing the feature.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Mail, Phone, Tag, User } from 'lucide-react';

import {
  getStoredDriverRegistrationSession,
  saveDriverPersonalDetails,
  saveDriverReferral,
  saveDriverRegistrationSession,
} from '../../services/registrationService';
import OnboardingShell from './OnboardingShell';
import { ChipGroup, Field, ReadOnlyRow } from './OnboardingFields';

const NAME_REGEX = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const GENDERS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export default function StepPersonal() {
  const navigate = useNavigate();
  const session = getStoredDriverRegistrationSession();
  const phone = String(session.phone || '').replace(/\D/g, '').slice(-10);
  const registrationId = String(session.registrationId || '').trim();

  const [fullName, setFullName] = useState(session.fullName || '');
  const [email, setEmail] = useState(session.email || '');
  const [gender, setGender] = useState(session.gender || '');
  const [referral, setReferral] = useState(session.referralCode || '');
  const [showReferral, setShowReferral] = useState(Boolean(session.referralCode));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phone || !registrationId) {
      navigate('/taxi/driver/login', { replace: true });
    }
  }, [navigate, phone, registrationId]);

  // Keep the draft on the device so a driver who drops out mid-form — or whose
  // webview is evicted in the background — comes back to what they typed.
  useEffect(() => {
    saveDriverRegistrationSession({
      ...getStoredDriverRegistrationSession(),
      fullName,
      email,
      gender,
      referralCode: referral,
    });
  }, [fullName, email, gender, referral]);

  const nameValid = NAME_REGEX.test(fullName.trim());
  const emailValid = EMAIL_REGEX.test(email.trim());
  const ready = nameValid && emailValid && Boolean(gender);

  const handleContinue = async () => {
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedReferral = referral.trim().toUpperCase();

    if (!nameValid) {
      setError('Your name should contain letters only.');
      return;
    }

    if (!emailValid) {
      setError('Enter a valid email address, for example name@gmail.com.');
      return;
    }

    if (!gender) {
      setError('Select a gender to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await saveDriverPersonalDetails({
        registrationId,
        phone,
        fullName: normalizedName,
        email: normalizedEmail,
        gender,
      });

      // An invalid code is the driver's mistake to correct, not a reason to
      // lose the details they just entered — so it is reported here and the
      // step stays put rather than failing the whole save.
      if (normalizedReferral) {
        try {
          await saveDriverReferral({ registrationId, phone, referralCode: normalizedReferral });
        } catch (referralError) {
          setError(referralError?.message || 'That referral code was not recognised.');
          setShowReferral(true);
          return;
        }
      }

      saveDriverRegistrationSession({
        ...getStoredDriverRegistrationSession(),
        fullName: normalizedName,
        email: normalizedEmail,
        gender,
        referralCode: normalizedReferral,
      });

      navigate('/taxi/driver/step-vehicle');
    } catch (saveError) {
      setError(saveError?.message || 'Could not save your details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell
      step="personal"
      eyebrow="About you"
      title="Tell us who you are"
      subtitle="Riders see your name when you accept a trip."
      error={error}
      onBack={() => navigate('/taxi/driver/login')}
      primaryDisabled={!ready}
      primaryLoading={loading}
      onPrimary={handleContinue}
    >
      <div className="dh-card space-y-4 p-5">
        <Field
          label="Full name"
          icon={User}
          value={fullName}
          onChange={(value) => setFullName(value.replace(/[^A-Za-z .'-]/g, ''))}
          placeholder="As printed on your licence"
          valid={nameValid}
          autoFocus
        />

        <Field
          label="Email address"
          icon={Mail}
          type="email"
          value={email}
          onChange={(value) => setEmail(value.trim())}
          placeholder="name@gmail.com"
          valid={emailValid}
        />

        <ChipGroup label="Gender" value={gender} onChange={setGender} options={GENDERS} />

        <ReadOnlyRow label="Verified number" icon={Phone} value={`+91 ${phone}`} />
      </div>

      {showReferral ? (
        <div className="dh-card p-5">
          <Field
            label="Referral code"
            icon={Tag}
            value={referral}
            onChange={(value) => setReferral(value.toUpperCase())}
            placeholder="ZETO-BONUS-9080"
            hint="Optional — leave it blank if you do not have one."
            autoFocus
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowReferral(true)}
          className="dh-ghost flex w-full items-center justify-center gap-2 py-3 text-[13px]"
        >
          <Gift size={16} strokeWidth={2.4} />
          I have a referral code
        </button>
      )}
    </OnboardingShell>
  );
}
