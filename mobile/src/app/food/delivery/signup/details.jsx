import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { SelectField } from '../../../../components/kit';
import { Press, ThemedInput } from '../../../../components/ui';
import OnboardingExitModal from '../../../../components/OnboardingExitModal';
import useDeliveryOnboardingExitGuard from '../../../../delivery/hooks/useDeliveryOnboardingExitGuard';
import { hasDeliveryStep1Progress } from '../../../../delivery/onboardingStorage';
import { prefetchModuleFcmToken } from '../../../../delivery/push';
import { sessionStore } from '../../../../lib/storage';
import { display, gradients, poppins, shadow, tw } from '../../../../theme';

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
      {required ? <Text style={styles.star}> *</Text> : null}
    </Text>
  );
}

function Err({ errors, name }) {
  return errors[name] ? <Text style={styles.error}>{errors[name]}</Text> : null;
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

  const field = (name, props = {}) => (
    <ThemedInput
      value={formData[name]}
      onChangeText={handleChange(name)}
      radius={8}
      borderWidth={1}
      style={styles.input}
      accessibilityLabel={name}
      {...props}
    />
  );

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={handleBack} accessibilityLabel="Back" style={styles.back} scale={1}>
          <ArrowLeft size={20} color="#1F1F24" />
        </Press>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.h2}>Basic Details</Text>
            <Text style={styles.sub}>Please provide your information to continue</Text>
          </View>

          <View style={{ gap: 16 }}>
            <View>
              <Label>Full Name</Label>
              {field('name', { placeholder: 'Enter your full name', autoCapitalize: 'words', autoComplete: 'name' })}
              <Err errors={errors} name="name" />
            </View>
            <View>
              <Label>Email</Label>
              {field('email', {
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
              {field('address', {
                placeholder: 'Enter your address',
                multiline: true,
                numberOfLines: 3,
                textAlignVertical: 'top',
                style: [styles.input, styles.textarea],
              })}
              <Err errors={errors} name="address" />
            </View>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Label>City</Label>
                {field('city', { placeholder: 'City' })}
                <Err errors={errors} name="city" />
              </View>
              <View style={styles.cell}>
                <Label>State</Label>
                {field('state', { placeholder: 'State' })}
                <Err errors={errors} name="state" />
              </View>
            </View>
            <View>
              <Label>Vehicle Type</Label>
              <SelectField
                value={formData.vehicleType}
                options={VEHICLE_TYPES}
                onChange={(v) => setFormData((prev) => ({ ...prev, vehicleType: v }))}
                accessibilityLabel="Vehicle Type"
                style={styles.select}
                textStyle={styles.selectText}
              />
            </View>
            <View>
              <Label required={false}>Vehicle Name/Model (Optional)</Label>
              {field('vehicleName', { placeholder: 'e.g., Honda Activa' })}
            </View>
            <View>
              <Label>Vehicle Number</Label>
              {field('vehicleNumber', { placeholder: 'e.g., MH12AB1234', maxLength: 10, autoCapitalize: 'characters' })}
              <Err errors={errors} name="vehicleNumber" />
            </View>
            <View>
              <Label>Driving License Number</Label>
              {field('drivingLicenseNumber', { placeholder: 'e.g., MH1220110012345', maxLength: 15, autoCapitalize: 'characters' })}
              <Err errors={errors} name="drivingLicenseNumber" />
            </View>
            <View>
              <Label>PAN Number</Label>
              {field('panNumber', { placeholder: 'ABCDE1234F', maxLength: 10, autoCapitalize: 'characters' })}
              <Err errors={errors} name="panNumber" />
            </View>
            <View>
              <Label>Aadhar Number</Label>
              {field('aadharNumber', { placeholder: '123456789012', maxLength: 12, keyboardType: 'number-pad' })}
              <Err errors={errors} name="aadharNumber" />
            </View>

            {/* mt-6 inside space-y-4 collapses to 24 */}
            <Press
              onPress={handleSubmit}
              disabled={submitDisabled}
              scale={0.98}
              accessibilityLabel="Continue"
              style={[styles.submit, { marginTop: 8 }, !submitDisabled && shadow('button')]}
            >
              {submitDisabled ? (
                <View style={[styles.submitInner, { backgroundColor: tw.gray400 }]}>
                  <Text style={styles.submitText}>{isSubmitting ? 'Saving...' : 'Continue'}</Text>
                </View>
              ) : (
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitInner}>
                  <Text style={styles.submitText}>{isSubmitting ? 'Saving...' : 'Continue'}</Text>
                </LinearGradient>
              )}
            </Press>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <OnboardingExitModal open={showExitModal} onStay={handleStay} onExit={handleExit} theme="delivery" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.gray100 },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: tw.gray200,
  },
  back: { padding: 8, borderRadius: 999 },
  // h1 text-lg font-medium -> Sora (500 resolves to 600)
  headerTitle: { fontSize: 18, lineHeight: 28, color: '#1F1F24', ...display(500, 18) },
  content: { paddingHorizontal: 16, paddingTop: 24 },
  h2: { fontSize: 20, lineHeight: 28, color: tw.gray900, marginBottom: 8, ...display(700, 20) },
  sub: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  label: { fontSize: 14, lineHeight: 20, color: tw.gray700, marginBottom: 4, ...poppins(500) },
  star: { color: tw.red500 },
  input: { height: 50, paddingHorizontal: 16, fontSize: 16, ...poppins(400) },
  // An inline-block <textarea> leaves 7 px of descender space below it.
  textarea: { height: 98, paddingTop: 12, paddingBottom: 12, marginBottom: 7 },
  error: { marginTop: 4, fontSize: 14, lineHeight: 20, color: tw.red500, ...poppins(400) },
  grid: { flexDirection: 'row', gap: 16 },
  cell: { flex: 1 },
  // Chrome draws the <select> 1 px taller than the inputs (51 px).
  select: { height: 51, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E8DEE7', borderRadius: 8, backgroundColor: '#fff' },
  selectText: { fontSize: 16, color: '#1F1F24', ...poppins(400) },
  submit: { borderRadius: 8 },
  submitInner: { borderRadius: 8, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: 16, lineHeight: 24, ...poppins(700) },
});
