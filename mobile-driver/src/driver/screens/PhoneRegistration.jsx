import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loader2, Phone } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../lib/webRouter';
import {
  buildDriverOnboardingSessionSnapshot,
  clearDriverRegistrationSession,
  getDriverOnboardingResumeStep,
  getDriverOnboardingSession,
  getStoredDriverRegistrationSession,
  saveDriverRegistrationSession,
  sendDriverOtp,
} from '../services/registrationService';
import AuthLegalLinks from '../../components/AuthLegalLinks';
import usePlatformSettings from '../../shared/hooks/usePlatformSettings';
import { Alert, CtaButton, FieldBox, Spin } from '../components/OnboardingFields';
import { DRIVER_BRAND_LOGO } from '../components/OnboardingShell';
import { OB, jk, obLabel } from '../components/onboardingTheme';

/*
 * Port of driver/pages/registration/PhoneRegistration.jsx. Mounted at both
 * /taxi/driver/login and /taxi/driver/reg-phone.
 */

const ROUTE_PREFIX = '/taxi/driver';

const errorMessage = (error) =>
  String(error?.message || error?.error || error?.response?.data?.message || '').trim();

export default function PhoneRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const insets = useSafeAreaInsets();
  const brand = usePlatformSettings({ brandName: 'Dima Hasao' });

  const stored = getStoredDriverRegistrationSession();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const referralCode = String(
    searchParams.get('ref') || searchParams.get('referral') || searchParams.get('code') || stored.referralCode || '',
  ).trim().toUpperCase();

  const storedPhone = String(stored.phone || '').replace(/\D/g, '').slice(-10);
  const storedRegistrationId = String(stored.registrationId || '').trim();
  const isLoginPage = location.pathname.replace(/\/$/, '') === `${ROUTE_PREFIX}/login`;

  const [phone, setPhone] = useState(() =>
    String(location.state?.phone || stored.phone || '').replace(/\D/g, '').slice(-10),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  // Resume, but only on /reg-phone. On /login a driver is deliberately starting
  // over, and silently bouncing them into an old half-application is the bug
  // this guard exists to prevent.
  useEffect(() => {
    let active = true;

    (async () => {
      if (isLoginPage || !storedPhone || !storedRegistrationId) return;

      if (stored.otpVerified) {
        navigate(`${ROUTE_PREFIX}/${getDriverOnboardingResumeStep(stored)}`, { replace: true, state: stored });
        return;
      }

      try {
        const response = await getDriverOnboardingSession({
          registrationId: storedRegistrationId,
          phone: storedPhone,
        });

        if (!active) return;

        const payload = response?.data?.data || response?.data || response;
        const next = saveDriverRegistrationSession(buildDriverOnboardingSessionSnapshot(payload, stored));

        navigate(
          next.otpVerified ? `${ROUTE_PREFIX}/${getDriverOnboardingResumeStep(next)}` : `${ROUTE_PREFIX}/otp-verify`,
          { replace: true, state: next },
        );
      } catch {
        if (active) navigate(`${ROUTE_PREFIX}/otp-verify`, { replace: true, state: stored });
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginPage, navigate, storedPhone, storedRegistrationId]);

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setError('Enter all 10 digits of your mobile number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      clearDriverRegistrationSession();

      const response = await sendDriverOtp({ phone });
      const payload = response?.data?.data || response?.data || response;
      const sessionData = payload?.session || {};

      const next = saveDriverRegistrationSession({
        phone,
        role: sessionData.role || 'driver',
        roleConfirmed: true,
        registrationId: sessionData.registrationId || '',
        debugOtp: sessionData.debugOtp || '',
        loginMode: Boolean(payload?.loginMode || sessionData?.loginMode),
        existingAccount: Boolean(payload?.existingAccount || sessionData?.existingAccount),
        entryPath: `${ROUTE_PREFIX}/login`,
        referralCode,
        status: sessionData.status || '',
      });

      navigate(`${ROUTE_PREFIX}/otp-verify`, { state: next });
    } catch (requestError) {
      setError(errorMessage(requestError) || 'Could not send the code. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const disabled = phone.length !== 10 || loading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: OB.bg }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56 + insets.top, paddingBottom: 32 + insets.bottom }}
    >
      <View style={styles.maxW}>
        <Image source={DRIVER_BRAND_LOGO} style={{ width: 64, height: 64, borderRadius: 32 }} />

        <Text style={styles.h1}>Drive with {brand.brandName || 'Dima Hasao'}</Text>
        <Text style={styles.sub}>Enter your mobile number. We will send a code to confirm it is you.</Text>

        <View style={{ marginTop: 32 }}>
          <Text style={[obLabel, { marginBottom: 6, paddingHorizontal: 4 }]}>Mobile number</Text>
          <FieldBox focused={focused} style={{ paddingVertical: 14 }}>
            <Phone size={18} strokeWidth={2.2} color={OB.muted} />
            <Text style={{ ...jk(700), fontSize: 15, color: OB.muted }}>+91</Text>
            <TextInput
              value={phone}
              onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
              placeholder="98765 43210"
              placeholderTextColor="#c2bda9"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{ ...jk(600), fontSize: 15, color: OB.text, padding: 0, flex: 1, minWidth: 0, letterSpacing: 1.2 }}
            />
          </FieldBox>
        </View>

        {error ? <Alert style={{ marginTop: 16 }}>{error}</Alert> : null}
      </View>

      <View style={[styles.maxW, { gap: 20, marginTop: 24 }]}>
        <CtaButton onPress={handleSendOtp} disabled={disabled}>
          {loading ? (
            <Spin>
              <Loader2 size={18} color="#fff" />
            </Spin>
          ) : (
            'Send code'
          )}
        </CtaButton>

        <AuthLegalLinks
          module="taxi"
          style={styles.legal}
          linkStyle={styles.legal}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  maxW: { width: '100%', maxWidth: 448, alignSelf: 'center' },
  h1: { ...jk(800), fontSize: 30, lineHeight: 37.5, letterSpacing: -0.6, color: OB.text, marginTop: 24 },
  sub: { ...jk(500), fontSize: 14, lineHeight: 22.75, color: OB.muted, marginTop: 8, maxWidth: 240 },
  legal: { ...jk(600), fontSize: 12, color: OB.muted, textAlign: 'center' },
});
