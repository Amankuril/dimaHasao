import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Camera, CheckCircle2, ImagePlus, Mail, Smartphone, User } from 'lucide-react-native';
import { Button, Card, StatusBadge } from '../../../components/ds';
import { openCamera, openGallery, prepareUploadFile } from '../../../lib/images';
import { localStore } from '../../../lib/storage';
import { toast } from '../../../lib/notify';
import { color, elevation, radii, space, touch, type } from '../../../theme';
import { uploadImage } from '../../api/accountApi';
import { userAuthService } from '../../services/authService';
import { CtaBar, Field, LoadingState, PageTitle } from '../ui';

// Web: Taxi/modules/user/pages/profile/ProfileSettings.jsx (/taxi/user/profile/settings)

export default function ProfileSettings() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const avatarSrc = useMemo(
    () => preview || profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=062C16&color=FCD34D&format=png`,
    [name, profileImage, preview],
  );

  useEffect(() => {
    let stored = {};
    try {
      stored = JSON.parse(localStore.getItem('userInfo') || '{}') || {};
    } catch {
      stored = {};
    }
    if (stored?.name) setName(stored.name);
    if (stored?.email) setEmail(stored.email);
    if (stored?.phone) setPhone(stored.phone);
    if (stored?.profileImage) setProfileImage(stored.profileImage);

    (async () => {
      try {
        const res = await userAuthService.getCurrentUser();
        const user = res?.data?.user || {};
        setName(user.name || stored?.name || '');
        setEmail(user.email || stored?.email || '');
        setPhone(user.phone || stored?.phone || '');
        setProfileImage(user.profileImage || stored?.profileImage || '');
        localStore.setItem('userInfo', JSON.stringify(user));
      } catch {
        // keep the stored values
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onPicked = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const prepared = await prepareUploadFile(file, { preset: 'profile' });
      const b64 = await readAsStringAsync(prepared.uri, { encoding: 'base64' });
      const dataUrl = `data:${prepared.type || 'image/jpeg'};base64,${b64}`;
      if (!dataUrl.startsWith('data:image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      setPreview(dataUrl);
      const result = await uploadImage(dataUrl, 'user-profiles');
      const url = result?.secureUrl || result?.url;
      setProfileImage(url);
      toast.success('Professional branding image uploaded');
    } catch {
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await userAuthService.updateCurrentUser({ name, email, profileImage });
      const user = res?.data?.user || {};
      localStore.setItem('userInfo', JSON.stringify(user));
      toast.success('Profile updated successfully');
      router.navigate('/taxi/user/profile');
    } catch (e) {
      setSaveError(e?.message || 'Save failed');
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={st.flex}>
        <LoadingState label="Loading your profile" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.flex}>
      <PageTitle title="Your profile" subtitle="Account settings" onBack={() => router.navigate('/taxi/user/profile')} />

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        <Card style={st.photoCard}>
          <View>
            <View style={st.avatarBox}>
              <Image source={{ uri: avatarSrc }} style={[st.avatar, uploading && { opacity: 0.5 }]} resizeMode="cover" accessibilityLabel="Profile photo" />
              {uploading ? (
                <View style={st.upl}>
                  <ActivityIndicator color={color.primary} size="large" />
                </View>
              ) : null}
            </View>
            <View style={st.camBadge}>
              <Camera size={16} color={color.primary} />
            </View>
          </View>
          <Text style={[type.small, { color: color.textMuted, textAlign: 'center' }]}>{uploading ? 'Optimizing for WebP...' : 'Change profile photo'}</Text>
          <View style={st.pickRow}>
            <Button
              title="Gallery"
              icon={ImagePlus}
              variant="outline"
              size="md"
              disabled={uploading}
              onPress={() => openGallery({ fileNamePrefix: 'profile', onSelectFile: onPicked })}
              style={st.pick}
            />
            <Button
              title="Camera"
              icon={Camera}
              variant="secondary"
              size="md"
              disabled={uploading}
              onPress={() => openCamera({ fileNamePrefix: 'profile', onSelectFile: onPicked })}
              style={st.pick}
            />
          </View>
        </Card>

        <Card style={{ gap: space.lg }}>
          <Field
            label="Full name"
            icon={User}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            autoComplete="name"
            right={name ? <CheckCircle2 size={16} color={color.success} accessibilityLabel="Name entered" /> : null}
          />
          <Field
            label="Email address"
            icon={Mail}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="yourname@example.com"
          />
          <View style={{ gap: space.xs + 2 }}>
            <Text style={[type.label, { color: color.text }]}>Phone number</Text>
            <View style={st.readonly} accessible accessibilityLabel={`Phone number ${phone ? `+91 ${phone}` : 'not set'}, verified`}>
              <Smartphone size={18} color={color.textMuted} />
              <Text style={[type.body, { color: color.textSecondary, flex: 1 }]} numberOfLines={1}>
                {phone ? `+91 ${phone}` : '+91'}
              </Text>
              <StatusBadge label="Verified" tone="success" style={{ alignSelf: 'center' }} />
            </View>
            <Text style={[type.caption, { color: color.textMuted }]}>Your phone number is used to sign in and cannot be changed here.</Text>
          </View>
        </Card>
        {saveError ? <Text style={[type.small, { color: color.danger, textAlign: 'center' }]}>{saveError}</Text> : null}
      </ScrollView>

      <CtaBar>
        <Button title={saving ? 'Saving changes...' : 'Save profile'} size="lg" onPress={handleSave} loading={saving} disabled={uploading || saving} />
      </CtaBar>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xxl, gap: space.md },
  photoCard: { alignItems: 'center', gap: space.md },
  avatarBox: { width: 104, height: 104, borderRadius: radii.xl, backgroundColor: color.surfaceMuted, overflow: 'hidden', borderWidth: 1, borderColor: color.border },
  avatar: { width: '100%', height: '100%' },
  upl: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  camBadge: { position: 'absolute', bottom: -6, right: -6, width: 34, height: 34, borderRadius: 17, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center', ...elevation.card },
  pickRow: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' },
  pick: { flex: 1 },
  readonly: { minHeight: touch, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted },
});
