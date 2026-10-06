import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gift, Mail, Phone, Tag, User } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { Press } from '../../components/ui';
import {
  getStoredDriverRegistrationSession,
  saveDriverPersonalDetails,
  saveDriverReferral,
  saveDriverRegistrationSession,
} from '../services/registrationService';
import OnboardingShell from '../components/OnboardingShell';
import { ChipGroup, Field, ReadOnlyRow } from '../components/OnboardingFields';
import { OB, jk, obCard } from '../components/onboardingTheme';

/* Port of driver/pages/registration/StepPersonal.jsx (/taxi/driver/step-personal). */

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

  // Keep the draft on the device so a driver who drops out mid-form comes back to what they typed.
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

      // An invalid code is the driver's mistake to correct, not a reason to lose the details.
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
      <View style={[obCard, styles.card]}>
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
      </View>

      {showReferral ? (
        <View style={[obCard, styles.card]}>
          <Field
            label="Referral code"
            icon={Tag}
            value={referral}
            onChange={(value) => setReferral(value.toUpperCase())}
            placeholder="ZETO-BONUS-9080"
            hint="Optional — leave it blank if you do not have one."
            autoFocus
          />
        </View>
      ) : (
        <Press scale={1} onPress={() => setShowReferral(true)} style={styles.referral}>
          <Gift size={16} strokeWidth={2.4} color={OB.primary} />
          <Text style={styles.referralText}>I have a referral code</Text>
        </Press>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: 16 },
  referral: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  referralText: { ...jk(700), fontSize: 13, color: OB.primary },
});
