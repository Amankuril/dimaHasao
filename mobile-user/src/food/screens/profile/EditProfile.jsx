import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Check, ChevronDown, Image as ImageIcon, Pencil, ShieldCheck, Trash2, X } from 'lucide-react-native';
import Image from '../../../components/Img';
import { BottomSheet } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { userAPI } from '../../../api/food';
import { API_ORIGIN } from '../../../api/client';
import { useProfile } from '../../context/ProfileContext';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { normalizeImageUrl } from '../../utils/common';
import { events } from '../../../lib/events';
import { openCamera, openGallery } from '../../../lib/images';
import { localStore } from '../../../lib/storage';
import { toast } from '../../../lib/notify';
import { navigateTo } from '../../../lib/webRouter';
import { Button, Card, IconButton, ListRow, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { PageHeader } from '../../components/profile/ProfileChrome';
import { color, elevation, radii, space, type } from '../../../theme';

const PROFILE_AVATAR = require('../../../../assets/food/profile_avatar.webp');
const EDIT_PROFILE_DRAFT_KEY = 'user_edit_profile_draft';
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const loadProfileFromStorage = () => {
  try {
    for (const key of ['user_user', 'userProfile', 'helloparth_user_profile']) {
      const stored = localStore.getItem(key);
      if (stored) return JSON.parse(stored);
    }
  } catch {}
  return null;
};

const saveProfileToStorage = (data) => {
  try {
    localStore.setItem('user_user', JSON.stringify(data));
    localStore.setItem('userProfile', JSON.stringify(data));
  } catch {}
};

const normalizePhoneToTenDigits = (value) => String(value || '').replace(/\D/g, '').slice(-10);

const buildFormDataFromProfile = (profile = {}) => ({
  name: profile.name || '',
  mobile: normalizePhoneToTenDigits(profile.mobile || profile.phone || ''),
  email: profile.email || '',
  gender: profile.gender || '',
});

const hasImage = (value) => typeof value === 'string' && value.trim() !== '' && value !== 'null' && value !== 'undefined';
const validateEmail = (value) => (!value ? '' : EMAIL_REGEX.test(value) ? '' : 'Please enter a valid email');

/** Label-above field box (48 px), primary border when focused. */
function Fieldset({ legend, focused, disabled, error, children, style }) {
  return (
    <View style={[{ gap: space.xs }, style]}>
      <Text style={styles.legend}>{legend}</Text>
      <View style={[styles.fieldset, focused ? styles.fieldsetFocus : null, error ? { borderColor: color.danger } : null, disabled ? styles.fieldsetDisabled : null]}>{children}</View>
    </View>
  );
}

/** Port of pages/user/profile/EditProfile.jsx. */
export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const goBack = useAppBackNavigation();
  const { userProfile, updateUserProfile } = useProfile();

  const [initialProfile] = useState(() => loadProfileFromStorage() || userProfile || {});
  const [initialData] = useState(() => buildFormDataFromProfile(initialProfile));
  const [formData, setFormData] = useState(initialData);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState(initialProfile?.profileImage || userProfile?.profileImage || '');
  const [imagePreview, setImagePreview] = useState(initialProfile?.profileImage || userProfile?.profileImage || '');
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: '' });
  const [focus, setFocus] = useState('');
  const savedProfileImageRef = useRef(initialProfile?.profileImage || userProfile?.profileImage || '');
  const emailRef = useRef(null);

  useEffect(() => {
    localStore.removeItem(EDIT_PROFILE_DRAFT_KEY);
  }, []);

  // Until the customer edits something, follow the profile as it loads.
  useEffect(() => {
    if (hasChanges) return;
    const profile = loadProfileFromStorage() || userProfile || {};
    setFormData(buildFormDataFromProfile(profile));
    if (profile.profileImage) {
      setProfileImage(profile.profileImage);
      setImagePreview(profile.profileImage);
      savedProfileImageRef.current = profile.profileImage;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  useEffect(() => {
    const isImageChanged = pendingImageFile !== null || profileImage !== (savedProfileImageRef.current || '');
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(initialData) || isImageChanged);
  }, [formData, initialData, pendingImageFile, profileImage]);

  const handleChange = (field, value) => {
    let normalizedValue = value;
    if (field === 'name') normalizedValue = String(value || '').replace(/[^a-zA-Z\s]/g, '');
    else if (field === 'email') {
      normalizedValue = String(value || '').trim();
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(normalizedValue) }));
    }
    setFormData((prev) => ({ ...prev, [field]: normalizedValue }));
  };

  const pickPhoto = async (source) => {
    setPhotoPickerOpen(false);
    try {
      // The system picker's square crop stands in for the web's crop dialog.
      const file = await (source === 'camera' ? openCamera : openGallery)({ allowsEditing: true, aspect: [1, 1] });
      if (!file) return;
      if (!String(file.type || '').startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      setImagePreview(file.uri);
      setPendingImageFile(file);
    } catch {
      toast.error('Could not read this image. Please try another photo.');
    }
  };

  const handleUpdate = async () => {
    if (isSaving) return;
    const emailError = validateEmail(formData.email);
    setFieldErrors({ email: emailError });
    if (emailError) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    try {
      setIsSaving(true);
      let finalImageUrl = profileImage;
      if (pendingImageFile) {
        setIsUploadingImage(true);
        try {
          const uploadRes = await userAPI.uploadProfileImage(pendingImageFile);
          finalImageUrl = uploadRes?.data?.data?.profileImage || uploadRes?.data?.profileImage || uploadRes?.data?.data?.user?.profileImage || profileImage;
          if (!finalImageUrl) throw new Error('Upload succeeded but profile image URL was missing');
        } catch (uploadErr) {
          toast.error(uploadErr?.response?.data?.error || uploadErr?.response?.data?.message || uploadErr?.message || 'Failed to upload image');
          setIsUploadingImage(false);
          setIsSaving(false);
          return;
        }
        setIsUploadingImage(false);
      }

      const response = await userAPI.updateProfile({
        name: formData.name,
        email: formData.email || undefined,
        gender: formData.gender || undefined,
        profileImage: finalImageUrl,
      });
      const updatedUser = response?.data?.data?.user || response?.data?.user;
      if (updatedUser) {
        updateUserProfile({ ...updatedUser, phone: updatedUser.phone || formData.mobile, profileImage: finalImageUrl });
        saveProfileToStorage({
          name: updatedUser.name || formData.name,
          phone: updatedUser.phone || formData.mobile,
          mobile: updatedUser.phone || formData.mobile,
          email: updatedUser.email || formData.email,
          profileImage: updatedUser.profileImage || finalImageUrl,
          gender: updatedUser.gender || formData.gender,
        });
        localStore.removeItem(EDIT_PROFILE_DRAFT_KEY);
        events.emit('userAuthChanged');
        navigateTo('/user/profile');
      } else {
        setIsSaving(false);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
      setIsSaving(false);
    }
  };

  const showImage = hasImage(imagePreview);
  const previewUri = showImage ? (/^(file:|content:)/.test(imagePreview) ? imagePreview : normalizeImageUrl(imagePreview, API_ORIGIN)) : null;
  const disabled = !hasChanges || isSaving || isUploadingImage;
  const genderLabel = genderOptions.find((o) => o.value === formData.gender)?.label;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageHeader title="Your Profile" onBack={goBack} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingBottom: NAV_CLEARANCE + space.xxl + insets.bottom }}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Image source={previewUri ? { uri: previewUri } : PROFILE_AVATAR} style={{ width: '100%', height: '100%' }} accessibilityLabel={formData.name || 'User'} />
          </View>
          <Press
            scale={0.92}
            disabled={isUploadingImage}
            onPress={() => (showImage ? setPhotoMenuOpen(true) : setPhotoPickerOpen(true))}
            accessibilityLabel="Change profile photo"
            style={[styles.pencil, isUploadingImage ? { opacity: 0.5 } : null]}
          >
            {isUploadingImage ? <ActivityIndicator size="small" color={color.onPrimary} /> : <Pencil size={18} color={color.onPrimary} strokeWidth={2.5} />}
          </Press>
        </View>

        <Card style={{ gap: space.lg }}>
          <Fieldset legend="Name" focused={focus === 'name'}>
            <TextInput
              value={formData.name}
              onChangeText={(text) => handleChange('name', text)}
              onFocus={() => setFocus('name')}
              onBlur={() => setFocus('')}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              accessibilityLabel="Name"
              placeholder="Your name"
              placeholderTextColor={color.textMuted}
              style={styles.input}
            />
            {formData.name ? <IconButton icon={X} iconSize={16} size={36} label="Clear name" iconColor={color.textMuted} onPress={() => handleChange('name', '')} /> : null}
          </Fieldset>

          <View style={{ gap: space.xs }}>
            <Fieldset legend="Email" focused={focus === 'email'} error={fieldErrors.email}>
              <TextInput
                ref={emailRef}
                value={formData.email}
                onChangeText={(text) => handleChange('email', text)}
                onFocus={() => setFocus('email')}
                onBlur={() => setFocus('')}
                placeholder="yourname@example.com"
                placeholderTextColor={color.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                accessibilityLabel="Email"
                style={styles.input}
              />
            </Fieldset>
            {fieldErrors.email ? <Text style={styles.error}>{fieldErrors.email}</Text> : null}
          </View>

          <Fieldset legend="Phone Number" disabled>
            <Text style={[styles.input, styles.phone]}>{formData.mobile ? `+91 ${formData.mobile}` : '+91'}</Text>
            <StatusBadge icon={ShieldCheck} label="Verified" tone="success" style={{ alignSelf: 'center' }} />
          </Fieldset>

          <Fieldset legend="Gender" focused={genderOpen}>
            <Press scale={1} onPress={() => setGenderOpen(true)} accessibilityRole="combobox" accessibilityLabel={`Gender, ${genderLabel || 'not selected'}`} style={styles.select}>
              <Text style={[styles.selectText, genderLabel ? null : { color: color.textMuted }]}>{genderLabel || 'Select gender'}</Text>
              <ChevronDown size={18} color={color.textMuted} />
            </Press>
          </Fieldset>

          <Button
            title={isSaving ? 'Saving...' : 'Update profile'}
            size="lg"
            loading={isSaving}
            disabled={disabled}
            onPress={handleUpdate}
            accessibilityLabel="Update profile"
            style={{ marginTop: space.sm }}
          />
        </Card>
      </ScrollView>

      {/* Delete / change photo (web: dropdown under the pencil) */}
      <BottomSheet visible={photoMenuOpen} onClose={() => setPhotoMenuOpen(false)} backdrop={color.overlay} panelStyle={[styles.sheet, { paddingBottom: space.lg + insets.bottom }]}>
        <View style={styles.grab} />
        <ListRow
          icon={Trash2}
          tone="danger"
          title="Delete Photo"
          onPress={() => {
            setPhotoMenuOpen(false);
            setProfileImage('');
            setImagePreview('');
            setPendingImageFile(null);
          }}
          chevron={false}
          style={styles.sheetRow}
        />
        <ListRow
          icon={Camera}
          title="Change photo"
          onPress={() => {
            setPhotoMenuOpen(false);
            setPhotoPickerOpen(true);
          }}
          chevron={false}
          style={styles.sheetRow}
        />
      </BottomSheet>

      {/* Camera or gallery */}
      <BottomSheet visible={photoPickerOpen} onClose={() => setPhotoPickerOpen(false)} backdrop={color.overlay} panelStyle={[styles.sheet, { paddingBottom: space.lg + insets.bottom }]}>
        <View style={styles.grab} />
        <Text style={styles.sheetTitle}>Update profile photo</Text>
        <Text style={styles.sheetBody}>Choose how you want to upload your profile photo.</Text>
        <ListRow icon={Camera} title="Camera" onPress={() => pickPhoto('camera')} chevron={false} style={styles.sheetRow} />
        <ListRow icon={ImageIcon} title="Gallery" onPress={() => pickPhoto('gallery')} chevron={false} style={styles.sheetRow} />
      </BottomSheet>

      <BottomSheet visible={genderOpen} onClose={() => setGenderOpen(false)} backdrop={color.overlay} panelStyle={[styles.sheet, { paddingBottom: space.lg + insets.bottom }]}>
        <View style={styles.grab} />
        <Text style={styles.sheetTitle}>Gender</Text>
        {genderOptions.map((option) => {
          const on = formData.gender === option.value;
          return (
            <Press
              key={option.value}
              scale={0.99}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={option.label}
              onPress={() => {
                handleChange('gender', option.value);
                setGenderOpen(false);
              }}
              style={[styles.option, on ? styles.optionOn : null]}
            >
              <Text style={[styles.optionText, on ? { color: color.primary } : null]}>{option.label}</Text>
              {on ? <Check size={18} color={color.primary} /> : null}
            </Press>
          );
        })}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignSelf: 'center', width: 112, height: 112, marginTop: space.sm, marginBottom: space.xl },
  avatar: { width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: color.gold, overflow: 'hidden', backgroundColor: color.goldSoft, ...elevation.card },
  pencil: { position: 'absolute', bottom: 0, right: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: color.bg },
  legend: { ...type.label, color: color.text },
  fieldset: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingLeft: space.md, paddingRight: space.xs, backgroundColor: color.surface },
  fieldsetFocus: { borderColor: color.primary, borderWidth: 1.5 },
  fieldsetDisabled: { backgroundColor: color.surfaceMuted, paddingRight: space.md },
  input: { flex: 1, minWidth: 0, minHeight: 46, paddingVertical: 0, ...type.body, color: color.text },
  error: { ...type.small, color: color.danger },
  phone: { color: color.textSecondary, lineHeight: 46 },
  select: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46, paddingRight: space.sm },
  selectText: { ...type.body, color: color.text },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: space.lg, gap: space.xs, ...elevation.sheet },
  grab: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: color.borderStrong, marginBottom: space.md },
  sheetRow: { paddingHorizontal: space.sm, borderRadius: radii.md },
  sheetTitle: { ...type.heading, color: color.text },
  sheetBody: { ...type.small, color: color.textSecondary, marginBottom: space.sm },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, borderRadius: radii.md },
  optionOn: { backgroundColor: color.primarySoft },
  optionText: { ...type.body, color: color.text },
});
