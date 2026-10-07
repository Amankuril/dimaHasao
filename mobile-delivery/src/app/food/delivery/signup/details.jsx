import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, ScreenHeader, SectionHeader } from '../../../../components/ds';
import { SelectField } from '../../../../components/kit';
import OnboardingExitModal from '../../../../components/OnboardingExitModal';
import useDeliveryOnboardingExitGuard from '../../../../delivery/hooks/useDeliveryOnboardingExitGuard';
import { hasDeliveryStep1Progress } from '../../../../delivery/onboardingStorage';
import { prefetchModuleFcmToken } from '../../../../delivery/push';
import { sessionStore } from '../../../../lib/storage';
import { color, radii, space, touch, type } from '../../../../theme';

// Web: pages/auth/SignupStep1.jsx (/food/delivery/signup/details)

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;

const VEHICLE_TYPES = [
  { value: 'bike', label: 'Bike' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'car', label: 'Car' },
];

const sanitizeLocationValue = (value) => value.replace(/[^A-Za-z\s.-]/g, '').replace(/\s{2,}/g, ' ');
const sanitizeNameValue = (value) => value.replace(/[^A-Za-z\s]/g, '').replace(/\s{2,}/g, ' ');
const isValidLocationValue = (value) => /^[A-Za-z][A-Za-z\s.-]*[A-Za-z.]$/.test(value.trim());
const isValidNameValue = (value) => /^[A-Za-z][A-Za-z\s]*[A-Za-z]$/.test(value.trim());
const isValidEmailValue = (value) => EMAIL_REGEX.test(value.trim());
const sanitizeEmailValue = (value) => value.replace(/\s/g, '').toLowerCase();

function Label({ children, required = true }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? (
        <Text style={styles.star} accessibilityLabel="required">
          {' *'}
        </Text>
      ) : (
        <Text style={styles.optional}> (optional)</Text>
      )}
    </Text>
  );
}

function Err({ errors, name }) {
  return errors[name] ? (
    <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {errors[name]}
    </Text>
  ) : null;
}

export default function SignupStep1() {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState(() => {
    const base = {
      name: '',
      phone: '',
      countryCode: '+91',
      ref: '',
      email: '',
      address: '',
      city: '',
      state: '',
      vehicleType: 'bike',
      vehicleName: '',
      vehicleNumber: '',
      drivingLicenseNumber: '',
      panNumber: '',
      aadharNumber: '',
    };
    const saved = sessionStore.getItem('deliverySignupDetails');
    if (saved) {
      try {
        return { ...base, ...JSON.parse(saved) };
      } catch {
        /* fall back to empty */
      }
    }
    return base;
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasUnsavedProgress = useCallback(() => hasDeliveryStep1Progress(formData), [formData]);
  const { showExitModal, handleBack, handleStay, handleExit } = useDeliveryOnboardingExitGuard('details', hasUnsavedProgress);

  useEffect(() => {
    prefetchModuleFcmToken('delivery');
  }, []);

  useEffect(() => {
    sessionStore.setItem('deliverySignupDetails', JSON.stringify(formData));
  }, [formData]);

  const handleChange = (name) => (value) => {
    let updatedValue = value;
    if (name === 'vehicleNumber' || name === 'panNumber' || name === 'drivingLicenseNumber') updatedValue = value.toUpperCase();
    if (name === 'name') updatedValue = sanitizeNameValue(value);
    if (name === 'vehicleNumber') updatedValue = updatedValue.slice(0, 10);
    if (name === 'drivingLicenseNumber') updatedValue = updatedValue.replace(/[^A-Z0-9]/g, '').slice(0, 15);
    if (name === 'aadharNumber') updatedValue = value.replace(/\D/g, '').slice(0, 12);
    if (name === 'city' || name === 'state') updatedValue = sanitizeLocationValue(value);
    if (name === 'email') {
      updatedValue = sanitizeEmailValue(value);
      if (updatedValue && !isValidEmailValue(updatedValue)) {
        setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address (e.g., aaa@gmail.com)' }));
      } else if (!updatedValue) {
        setErrors((prev) => ({ ...prev, email: 'Email is required' }));
      } else {
        setErrors((prev) => ({ ...prev, email: '' }));
      }
    }
    setFormData((prev) => ({ ...prev, [name]: updatedValue }));
    if (name !== 'email' && errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    else if (!isValidNameValue(formData.name)) e.name = 'Name can contain letters only';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!isValidEmailValue(formData.email)) e.email = 'Please enter a valid email address (e.g., aaa@gmail.com)';
    if (!formData.address.trim()) e.address = 'Address is required';
    if (!formData.city.trim()) e.city = 'City is required';
    else if (!isValidLocationValue(formData.city)) e.city = 'City can contain letters only';
    if (!formData.state.trim()) e.state = 'State is required';
    else if (!isValidLocationValue(formData.state)) e.state = 'State can contain letters only';
    if (!formData.vehicleNumber.trim()) e.vehicleNumber = 'Vehicle number is required';
    else if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/.test(formData.vehicleNumber)) {
      e.vehicleNumber = 'Invalid Indian vehicle number format (e.g., MH12AB1234)';
    }
    if (!formData.drivingLicenseNumber.trim()) e.drivingLicenseNumber = 'Driving license number is required';
    else if (!/^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/.test(formData.drivingLicenseNumber)) {
      e.drivingLicenseNumber = 'Invalid DL format (e.g., MH1220110012345)';
    }
    if (!formData.panNumber.trim()) e.panNumber = 'PAN number is required';
    else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber)) e.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
    if (!formData.aadharNumber.trim()) e.aadharNumber = 'Aadhar number is required';
    else if (!/^\d{12}$/.test(formData.aadharNumber.replace(/\s/g, ''))) e.aadharNumber = 'Aadhar number must be 12 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const details = {
        name: formData.name.trim(),
        phone: String(formData.phone || '').replace(/\D/g, '').slice(0, 15),
        countryCode: formData.countryCode || '+91',
        ref: String(formData.ref || '').trim() || '',
        email: formData.email?.trim() || '',
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        vehicleType: formData.vehicleType || 'bike',
        vehicleName: formData.vehicleName?.trim() || '',
        vehicleNumber: formData.vehicleNumber.trim(),
        drivingLicenseNumber: formData.drivingLicenseNumber.trim().toUpperCase(),
        panNumber: formData.panNumber.trim().toUpperCase(),
        aadharNumber: formData.aadharNumber.replace(/\s/g, ''),
      };
      sessionStore.setItem('deliverySignupDetails', JSON.stringify(details));
      router.push('/food/delivery/signup/documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDisabled =
    isSubmitting || !formData.email || !isValidEmailValue(formData.email) || Object.values(errors).some((err) => err !== '');

  const field = (name, label, props = {}) => (
    <FormInput
      value={formData[name]}
      onChangeText={handleChange(name)}
      accessibilityLabel={label}
      invalid={Boolean(errors[name])}
      {...props}
    />
  );

  return (
    <View style={styles.page}>
      <ScreenHeader title="Complete your profile" subtitle="Step 1 of 2 · Basic details" onBack={handleBack} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.intro}>
            <Text style={styles.h2} accessibilityRole="header">
              Basic details
            </Text>
            <Text style={styles.sub}>Please provide your information to continue</Text>
          </View>

          <SectionHeader title="Personal" style={styles.sectionHeader} />
          <Card style={styles.group}>
            <View>
              <Label>Full name</Label>
              {field('name', 'Full name', { placeholder: 'Enter your full name', autoCapitalize: 'words', autoComplete: 'name' })}
              <Err errors={errors} name="name" />
            </View>
            <View>
              <Label>Email</Label>
              {field('email', 'Email', {
                placeholder: 'Enter your email',
                keyboardType: 'email-address',
                autoCapitalize: 'none',
                autoCorrect: false,
                autoComplete: 'email',
              })}
              <Err errors={errors} name="email" />
            </View>
            <View>
              <Label>Address</Label>
              {field('address', 'Address', {
                placeholder: 'Enter your address',
                multiline: true,
                numberOfLines: 3,
                textAlignVertical: 'top',
                style: styles.textarea,
              })}
              <Err errors={errors} name="address" />
            </View>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Label>City</Label>
                {field('city', 'City', { placeholder: 'City' })}
                <Err errors={errors} name="city" />
              </View>
              <View style={styles.cell}>
                <Label>State</Label>
                {field('state', 'State', { placeholder: 'State' })}
                <Err errors={errors} name="state" />
              </View>
            </View>
          </Card>

          <SectionHeader title="Vehicle" style={styles.sectionHeader} />
          <Card style={styles.group}>
            <View>
              <Label>Vehicle type</Label>
              <SelectField
                value={formData.vehicleType}
                options={VEHICLE_TYPES}
                onChange={(v) => setFormData((prev) => ({ ...prev, vehicleType: v }))}
                accessibilityLabel="Vehicle type"
                style={styles.select}
                textStyle={styles.selectText}
                chevronColor={color.textMuted}
              />
            </View>
            <View>
              <Label required={false}>Vehicle name / model</Label>
              {field('vehicleName', 'Vehicle name or model, optional', { placeholder: 'e.g., Honda Activa' })}
            </View>
            <View>
              <Label>Vehicle number</Label>
              {field('vehicleNumber', 'Vehicle number', { placeholder: 'e.g., MH12AB1234', maxLength: 10, autoCapitalize: 'characters' })}
              <Err errors={errors} name="vehicleNumber" />
            </View>
          </Card>

          <SectionHeader title="Identity" style={styles.sectionHeader} />
          <Card style={styles.group}>
            <View>
              <Label>Driving licence number</Label>
              {field('drivingLicenseNumber', 'Driving licence number', {
                placeholder: 'e.g., MH1220110012345',
                maxLength: 15,
                autoCapitalize: 'characters',
              })}
              <Err errors={errors} name="drivingLicenseNumber" />
            </View>
            <View>
              <Label>PAN number</Label>
              {field('panNumber', 'PAN number', { placeholder: 'ABCDE1234F', maxLength: 10, autoCapitalize: 'characters' })}
              <Err errors={errors} name="panNumber" />
            </View>
            <View>
              <Label>Aadhar number</Label>
              {field('aadharNumber', 'Aadhar number', { placeholder: '123456789012', maxLength: 12, keyboardType: 'number-pad' })}
              <Err errors={errors} name="aadharNumber" />
            </View>
          </Card>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
          <Button title={isSubmitting ? 'Saving...' : 'Continue'} size="lg" onPress={handleSubmit} disabled={submitDisabled} accessibilityLabel="Continue" />
        </View>
      </KeyboardAvoidingView>

      <OnboardingExitModal open={showExitModal} onStay={handleStay} onExit={handleExit} theme="delivery" />
    </View>
  );
}

/** Text input on the design-system tokens: 48 px, focus ring, red border when invalid. */
function FormInput({ style, invalid, onFocus, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={color.textDisabled}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[styles.input, invalid && styles.inputInvalid, focused && styles.inputFocused, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, paddingBottom: space.xxxl },
  intro: { marginBottom: space.xxl, paddingHorizontal: space.xs },
  h2: { ...type.title, color: color.text },
  sub: { ...type.body, color: color.textSecondary, marginTop: space.xs },
  sectionHeader: { marginTop: space.xs },
  group: { gap: space.lg, marginBottom: space.xxl },
  label: { ...type.label, color: color.text, marginBottom: space.sm },
  star: { color: color.danger },
  optional: { ...type.caption, color: color.textMuted },
  // No lineHeight on TextInput: it misaligns the caret on Android and web.
  input: {
    height: touch,
    paddingHorizontal: space.md + 2,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    borderRadius: radii.md,
    backgroundColor: color.surface,
    color: color.text,
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize + 1,
    outlineWidth: 0,
    outlineStyle: 'none',
  },
  inputFocused: { borderColor: color.primary, boxShadow: `0 0 0 3px ${color.primarySoft}` },
  inputInvalid: { borderColor: color.danger },
  textarea: { height: 96, paddingTop: space.md, paddingBottom: space.md },
  error: { ...type.small, marginTop: space.xs, color: color.danger },
  grid: { flexDirection: 'row', gap: space.md },
  cell: { flex: 1, minWidth: 0 },
  select: {
    height: touch,
    paddingHorizontal: space.md + 2,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    borderRadius: radii.md,
    backgroundColor: color.surface,
  },
  selectText: { ...type.body, fontSize: type.body.fontSize + 1, color: color.text },
  footer: {
    backgroundColor: color.surface,
    padding: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.borderStrong,
  },
});
