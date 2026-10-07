import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Check, CheckCircle2, Mail, Phone, User } from 'lucide-react-native';
import Img from '../../components/Img';
import { Spinner } from '../../components/Loader';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, shadow } from '../../theme';
import DriverImageSourceSheet from '../components/DriverImageSourceSheet';
import { useDriverImageUpload } from '../hooks/useDriverImageUpload';
import { getCurrentDriver, updateDriverProfile } from '../services/registrationService';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { CtaButton } from '../ui/Surface';

// Web: Taxi/modules/driver/pages/settings/EditProfile.jsx (/taxi/driver/edit-profile)

const NAME_REGEX = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const normalizeName = (value) => String(value || '').replace(/[^A-Za-z .'-]/g, '').replace(/\s+/g, ' ');
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const unwrapDriver = (response) => response?.data?.data || response?.data || response || {};

function ProfileField({ field, onChange, error }) {
  const [focused, setFocused] = useState(false);
  const Icon = field.Icon;
  return (
    <View style={[st.field, field.disabled ? { opacity: 0.7, backgroundColor: DT.bgSoft } : focused && { borderColor: DT.brand }, error ? { borderColor: DT.danger } : null]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon size={16} color={DT.brand} />
        <Text style={st.fieldLabel}>{field.label.toUpperCase()}</Text>
      </View>
      <TextInput
        value={field.value}
        editable={!field.disabled}
        keyboardType={field.keyboardType}
        autoCapitalize={field.key === 'name' ? 'words' : 'none'}
        autoCorrect={false}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={field.label}
        style={st.input}
      />
      {error ? <Text style={st.error}>{error}</Text> : null}
    </View>
  );
}

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const routePrefix = '/taxi/driver';
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [driver, setDriver] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState({});
  const [sourceOpen, setSourceOpen] = useState(false);

  const { uploading: imageUploading, preview: imagePreview, pickImage } = useDriverImageUpload({
    folder: 'driver-profiles',
    onSuccess: (url) => setDriver((prev) => ({ ...prev, profileImage: url })),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getCurrentDriver();
        const data = unwrapDriver(res);
        setDriver(data);
        setFormData({ name: data.name || '', phone: data.phone || '', email: data.email || '' });
      } catch (error) {
        console.error('Failed to load profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    const nextErrors = {};
    const trimmedName = String(formData.name || '').trim();
    const email = normalizeEmail(formData.email);

    if (!NAME_REGEX.test(trimmedName)) {
      nextErrors.name = 'Full name can contain alphabets only';
    }

    if (email && (!EMAIL_REGEX.test(email) || email.includes('..'))) {
      nextErrors.email = 'Please enter a valid email address, example aa@gmail.com';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = { ...formData, name: trimmedName, email, profileImage: driver.profileImage };
      await updateDriverProfile(payload);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate(-1);
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[st.root, { backgroundColor: DT.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <Spinner size={32} color={DT.brand} />
      </View>
    );
  }

  const fields = [
    { key: 'name', label: 'Full Name', value: formData.name, Icon: User },
    { key: 'phone', label: 'Mobile Number', value: formData.phone, Icon: Phone, keyboardType: 'phone-pad', disabled: true },
    { key: 'email', label: 'Email Address', value: formData.email, Icon: Mail, keyboardType: 'email-address' },
  ];
  const shownImage = imagePreview || driver?.profileImage;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.root}>
      <ScreenHeader title="Edit Profile" subtitle="Update your personal details" onBack={() => navigate(`${routePrefix}/profile`)} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 24 + insets.bottom }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ gap: 24 }}>
          {/* Profile Image with Cloudinary Upload */}
          <View style={{ alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <View>
              <View style={st.avatar}>
                {shownImage ? <Img source={{ uri: shownImage }} style={{ width: '100%', height: '100%', opacity: imageUploading ? 0.5 : 1 }} resizeMode="cover" accessibilityLabel="Profile" /> : <User size={44} color={DT.brand} strokeWidth={1.6} />}
                {imageUploading ? (
                  <View style={st.avatarSpin}>
                    <Spinner size={24} color={DT.onBrand} />
                  </View>
                ) : null}
              </View>
              <Press onPress={() => setSourceOpen(true)} disabled={imageUploading} scale={0.9} accessibilityLabel="Change profile photo" style={st.camera}>
                <Camera size={18} color={DT.ctaInk} />
              </Press>
            </View>
            <Text style={st.photoLabel}>{imageUploading ? 'OPTIMIZING FOR WEBP...' : 'PROFILE PHOTO'}</Text>
          </View>

          <View style={{ gap: 16 }}>
            {fields.map((field) => (
              <ProfileField
                key={field.key}
                field={field}
                error={errors[field.key]}
                onChange={(text) => {
                  const value = field.key === 'name' ? normalizeName(text) : field.key === 'email' ? normalizeEmail(text) : text;
                  setFormData((prev) => ({ ...prev, [field.key]: value }));
                  setErrors((prev) => ({ ...prev, [field.key]: '' }));
                }}
              />
            ))}
          </View>

          <View style={{ paddingTop: 24 }}>
            <CtaButton
              variant="cta"
              title="Save Changes"
              onPress={handleSave}
              disabled={submitting || imageUploading}
              loading={submitting}
              accessibilityLabel="Save Changes"
              icon={submitting ? null : <Check size={18} strokeWidth={3} color={DT.ctaInk} />}
            />
          </View>
        </View>
      </ScrollView>

      <DriverImageSourceSheet
        visible={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onPick={(source) => {
          setSourceOpen(false);
          pickImage(source);
        }}
      />

      {showSuccess ? (
        <View style={[st.toast, { top: insets.top + 16 }]} pointerEvents="none">
          <CheckCircle2 size={20} strokeWidth={3} color={DT.onBrand} />
          <Text style={st.toastText}>Profile Updated Successfully</Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: DT.bg },
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 100, backgroundColor: DT.success, padding: 16, borderRadius: DT.radius.lg, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow('lg') },
  toastText: { fontSize: 13, letterSpacing: 0.26, color: DT.onBrand, ...fo(700) },
  avatar: { width: 104, height: 104, borderRadius: 34, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: DT.gold, ...shadow('md') },
  avatarSpin: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,56,30,0.35)' },
  camera: { position: 'absolute', bottom: -2, right: -2, width: 44, height: 44, borderRadius: 16, backgroundColor: DT.cta, borderWidth: 3, borderColor: DT.bg, alignItems: 'center', justifyContent: 'center', ...shadow('md') },
  photoLabel: { fontSize: 11, letterSpacing: 1.1, minWidth: 100, textAlign: 'center', color: DT.muted, ...fo(700) },
  field: { backgroundColor: DT.card, paddingHorizontal: 16, paddingVertical: 14, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.border, gap: 8 },
  fieldLabel: { fontSize: 10, letterSpacing: 1, minWidth: 90, color: DT.muted, lineHeight: 14, ...fo(800) },
  input: { padding: 0, minHeight: 24, fontSize: 15, color: DT.ink, ...fo(600) },
  error: { fontSize: 12, color: DT.dangerInk, ...fo(700) },
});
