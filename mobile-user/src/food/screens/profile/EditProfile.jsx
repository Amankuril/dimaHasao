import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeft, Camera, ChevronDown, Image as ImageIcon, Pencil, X } from 'lucide-react-native';
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
import { poppins, shadow, tw } from '../../../theme';
import { F } from '../../components/shell';

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

/** `<fieldset><legend>`: a bordered box with its label sitting on the top edge. */
function Fieldset({ legend, focused, disabled, children, style }) {
  return (
    <View style={[styles.fieldset, focused ? styles.fieldsetFocus : null, disabled ? { opacity: 0.7 } : null, style]}>
      <Text style={styles.legend}>{legend}</Text>
      {children}
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
    <View style={{ flex: 1, backgroundColor: F.cream }}>
      <View style={styles.header}>
        <Press scale={0.92} onPress={goBack} accessibilityLabel="Go back" style={styles.back} hitSlop={6}>
          <ArrowLeft size={20} color={tw.gray700} />
        </Press>
        <Text style={styles.title} accessibilityRole="header">Your Profile</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 32 + 80, paddingBottom: 112 + insets.bottom }}>
        <View style={styles.card}>
          <View pointerEvents="none" style={styles.hump}>
            <Svg width={320} height={50} viewBox="0 0 320 50">
              <Path d="M0 50 C 50 50, 70 0, 92 0 L 228 0 C 250 0, 270 50, 320 50 Z" fill="#fff" />
            </Svg>
          </View>

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
              hitSlop={8}
            >
              {isUploadingImage ? <ActivityIndicator size="small" color={F.green} /> : <Pencil size={18} color={F.green} strokeWidth={2.5} />}
            </Press>
          </View>

          <View style={{ gap: 16, paddingTop: 24 }}>
            <Fieldset legend="Name" focused={focus === 'name'}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => handleChange('name', text)}
                  onFocus={() => setFocus('name')}
                  onBlur={() => setFocus('')}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  accessibilityLabel="Name"
                  style={styles.input}
                />
                {formData.name ? (
                  <Press scale={0.9} onPress={() => handleChange('name', '')} accessibilityLabel="Clear name" hitSlop={10}>
                    <X size={16} color={tw.gray400} />
                  </Press>
                ) : null}
              </View>
            </Fieldset>

            <View>
              <Fieldset legend="Email" focused={focus === 'email'}>
                <TextInput
                  ref={emailRef}
                  value={formData.email}
                  onChangeText={(text) => handleChange('email', text)}
                  onFocus={() => setFocus('email')}
                  onBlur={() => setFocus('')}
                  placeholder="yourname@example.com"
                  placeholderTextColor={tw.gray400}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 4 }}>
                <Text style={styles.phone}>{formData.mobile ? `+91 ${formData.mobile}` : '+91'}</Text>
                <Text style={styles.verified}>VERIFIED</Text>
              </View>
            </Fieldset>

            <Fieldset legend="Gender" focused={genderOpen}>
              <Press scale={1} onPress={() => setGenderOpen(true)} accessibilityRole="combobox" accessibilityLabel={`Gender, ${genderLabel || 'not selected'}`} style={styles.select}>
                <Text style={[styles.selectText, genderLabel ? null : { color: tw.gray400 }]}>{genderLabel || 'Select gender'}</Text>
                <ChevronDown size={16} color={tw.gray400} />
              </Press>
            </Fieldset>
          </View>

          <Press scale={0.98} disabled={disabled} onPress={handleUpdate} accessibilityLabel="Update profile" accessibilityState={{ disabled, busy: isSaving }} style={[styles.submit, disabled ? { backgroundColor: 'rgba(10,77,43,0.7)', elevation: 0, shadowOpacity: 0 } : null]}>
            {isSaving ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={styles.submitText}>{isSaving ? 'Saving...' : 'Update profile'}</Text>
          </Press>
        </View>
      </ScrollView>

      {/* Delete / change photo (web: dropdown under the pencil) */}
      <BottomSheet visible={photoMenuOpen} onClose={() => setPhotoMenuOpen(false)} panelStyle={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <Press
          scale={0.98}
          onPress={() => {
            setPhotoMenuOpen(false);
            setProfileImage('');
            setImagePreview('');
            setPendingImageFile(null);
          }}
          accessibilityLabel="Delete photo"
          style={styles.menuBtn}
        >
          <Text style={[styles.menuText, { color: F.green }]}>Delete Photo</Text>
        </Press>
        <Press
          scale={0.98}
          onPress={() => {
            setPhotoMenuOpen(false);
            setPhotoPickerOpen(true);
          }}
          accessibilityLabel="Change photo"
          style={styles.menuBtn}
        >
          <Text style={styles.menuText}>Change photo</Text>
        </Press>
      </BottomSheet>

      {/* Camera or gallery */}
      <BottomSheet visible={photoPickerOpen} onClose={() => setPhotoPickerOpen(false)} panelStyle={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <Text style={styles.sheetTitle}>Update profile photo</Text>
        <Text style={styles.sheetBody}>Choose how you want to upload your profile photo.</Text>
        <Press scale={0.98} onPress={() => pickPhoto('camera')} accessibilityLabel="Take a photo" style={styles.sourceRow}>
          <Camera size={20} color={F.green} />
          <Text style={styles.sourceText}>Camera</Text>
        </Press>
        <Press scale={0.98} onPress={() => pickPhoto('gallery')} accessibilityLabel="Choose from gallery" style={styles.sourceRow}>
          <ImageIcon size={20} color={F.green} />
          <Text style={styles.sourceText}>Gallery</Text>
        </Press>
      </BottomSheet>

      <BottomSheet visible={genderOpen} onClose={() => setGenderOpen(false)} panelStyle={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
        {genderOptions.map((option) => {
          const on = formData.gender === option.value;
          return (
            <Press
              key={option.value}
              scale={0.99}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => {
                handleChange('gender', option.value);
                setGenderOpen(false);
              }}
              style={[styles.option, on ? { backgroundColor: tw.gray100 } : null]}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </Press>
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) },
  card: { backgroundColor: '#fff', borderRadius: 32, paddingTop: 64, paddingBottom: 32, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(243,244,246,0.5)', ...shadow('0 2px 20px rgba(0,0,0,0.04)') },
  hump: { position: 'absolute', top: -49, left: 0, right: 0, alignItems: 'center', height: 50, overflow: 'hidden' },
  avatarWrap: { position: 'absolute', top: -105, alignSelf: 'center', width: 112, height: 112 },
  avatar: { width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#FFF5E6', ...shadow('sm') },
  pencil: { position: 'absolute', bottom: 4, right: 4, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: tw.gray100, ...shadow('md') },
  fieldset: { borderWidth: 1, borderColor: tw.gray300, borderRadius: 14, paddingHorizontal: 12, paddingBottom: 8, paddingTop: 10 },
  fieldsetFocus: { borderColor: F.green, borderWidth: 1.5 },
  legend: { position: 'absolute', top: -10, left: 10, backgroundColor: '#fff', paddingHorizontal: 4, fontSize: 13, lineHeight: 19.5, letterSpacing: 0.325, color: tw.gray400, ...poppins(400) },
  input: { flex: 1, paddingVertical: 0, paddingBottom: 4, minHeight: 28, fontSize: 16, color: tw.gray800, ...poppins(500) },
  error: { fontSize: 12, lineHeight: 16, color: tw.red600, marginTop: 4, ...poppins(400) },
  phone: { fontSize: 16, lineHeight: 24, color: tw.gray500, ...poppins(500) },
  verified: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: '#007A55', backgroundColor: '#D0FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden', ...poppins(700) },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 32 },
  selectText: { fontSize: 16, lineHeight: 24, color: tw.gray800, ...poppins(500) },
  submit: { marginTop: 32, marginBottom: 8, height: 52, borderRadius: 12, backgroundColor: F.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow('md') },
  submitText: { fontSize: 15, lineHeight: 22, color: '#fff', ...poppins(600) },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, gap: 8 },
  menuBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center' },
  menuText: { fontSize: 15.5, lineHeight: 22, letterSpacing: 0.4, color: tw.gray900, ...poppins(500) },
  sheetTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) },
  sheetBody: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginBottom: 8, ...poppins(400) },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200 },
  sourceText: { fontSize: 15, lineHeight: 22, color: tw.gray900, ...poppins(500) },
  option: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12 },
  optionText: { fontSize: 15, lineHeight: 22, color: tw.gray900, ...poppins(500) },
});
