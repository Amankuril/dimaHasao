import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Check, CheckCircle2, Mail, Phone, User } from 'lucide-react-native';
import Img from '../../components/Img';
import { Spinner } from '../../components/Loader';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, shadow, tw } from '../../theme';
import DriverImageSourceSheet from '../components/DriverImageSourceSheet';
import { useDriverImageUpload } from '../hooks/useDriverImageUpload';
import { getCurrentDriver, updateDriverProfile } from '../services/registrationService';

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
    <View style={[st.field, field.disabled ? { opacity: 0.7, backgroundColor: tw.slate50 } : focused && { borderColor: tw.slate900, boxShadow: '0 0 0 4px rgba(15,23,43,0.05)' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon size={16} color={tw.slate400} />
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
      <View style={[st.root, { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }]}>
        <Spinner size={32} color={tw.slate400} />
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
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 16, paddingBottom: 24 + insets.bottom }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <Press onPress={() => navigate(`${routePrefix}/profile`)} style={st.back}>
            <ArrowLeft size={18} color={tw.slate900} />
          </Press>
          <Text style={st.title}>Edit Profile</Text>
        </View>

        <View style={{ gap: 24 }}>
          {/* Profile Image with Cloudinary Upload */}
          <View style={{ alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <View>
              <View style={st.avatar}>
                {shownImage ? <Img source={{ uri: shownImage }} style={{ width: '100%', height: '100%', opacity: imageUploading ? 0.5 : 1 }} resizeMode="cover" accessibilityLabel="Profile" /> : <User size={48} color="#fff" strokeWidth={1.5} style={{ opacity: 0.2 }} />}
                {imageUploading ? (
                  <View style={st.avatarSpin}>
                    <Spinner size={24} color="#fff" />
                  </View>
                ) : null}
              </View>
              <Press onPress={() => setSourceOpen(true)} disabled={imageUploading} scale={0.9} accessibilityLabel="Change profile photo" style={st.camera}>
                <Camera size={16} color={tw.slate900} />
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
            <Press onPress={handleSave} disabled={submitting || imageUploading} scale={0.98} style={[st.save, (submitting || imageUploading) && { opacity: 0.5 }]}>
              {submitting ? (
                <Spinner size={20} color="#fff" />
              ) : (
                <>
                  <Text style={st.saveText}>Save Changes</Text>
                  <Check size={18} strokeWidth={3} color="#fff" />
                </>
              )}
            </Press>
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
          <CheckCircle2 size={20} strokeWidth={3} color="#fff" />
          <Text style={st.toastText}>Profile Updated Successfully</Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: tw.slate50 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  back: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  title: { fontSize: 18, letterSpacing: -0.45, color: tw.slate900, ...fo(700) },
  toast: { position: 'absolute', left: 24, right: 24, zIndex: 100, backgroundColor: tw.emerald500, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 25px 50px -12px rgba(0,188,125,0.2)' },
  toastText: { fontSize: 13, letterSpacing: 0.26, color: '#fff', ...fo(700) },
  avatar: { width: 96, height: 96, borderRadius: 32, backgroundColor: tw.slate900, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadow('lg') },
  avatarSpin: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  camera: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: tw.slate50, alignItems: 'center', justifyContent: 'center', ...shadow('xl') },
  photoLabel: { fontSize: 11, letterSpacing: 1.1, color: tw.slate400, ...fo(700) },
  field: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 20, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, gap: 8, ...shadow('sm') },
  fieldLabel: { fontSize: 10, letterSpacing: 1, color: tw.slate400, lineHeight: 10, ...fo(700) },
  input: { padding: 0, fontSize: 15, letterSpacing: -0.375, color: tw.slate900, ...fo(600) },
  error: { fontSize: 11, color: tw.rose500, ...fo(700) },
  save: { width: '100%', height: 60, backgroundColor: tw.slate900, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: '0 20px 25px -5px rgba(15,23,43,0.2), 0 8px 10px -6px rgba(15,23,43,0.2)' },
  saveText: { fontSize: 14, color: '#fff', ...fo(700) },
});
