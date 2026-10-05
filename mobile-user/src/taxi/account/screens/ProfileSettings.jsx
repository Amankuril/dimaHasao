import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Camera, CheckCircle2, ImagePlus, Mail, Smartphone, User } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { openCamera, openGallery, prepareUploadFile } from '../../../lib/images';
import { localStore } from '../../../lib/storage';
import { toast } from '../../../lib/notify';
import { tw } from '../../../theme';
import { uploadImage } from '../../api/accountApi';
import { userAuthService } from '../../services/authService';
import { BackBtn, fo, useHeaderTop } from '../ui';

// Web: Taxi/modules/user/pages/profile/ProfileSettings.jsx (/taxi/user/profile/settings)

export default function ProfileSettings() {
  const top = useHeaderTop();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [focus, setFocus] = useState('');

  const avatarSrc = useMemo(
    () => preview || profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=E85D04&color=fff&format=png`,
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
      <View style={[st.flex, { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={tw.slate300} />
      </View>
    );
  }

  const fieldStyle = (k) => [st.field, focus === k && { backgroundColor: '#fff', borderColor: tw.slate900 }];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[st.flex, { backgroundColor: '#fff' }]}>
      <View style={[st.header, { paddingTop: top + 8 }]}>
        <BackBtn size={40} radius={20} style={{ borderWidth: 0, backgroundColor: 'transparent' }} onPress={() => router.navigate('/taxi/user/profile')} strokeWidth={3} />
        <View>
          <Text style={st.eyebrow}>Account Settings</Text>
          <Text style={st.h2}>Your Profile</Text>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 40 }}>
        <View style={{ alignItems: 'center', gap: 16, paddingVertical: 16 }}>
          <View>
            <View style={st.avatarBox}>
              <Image source={{ uri: avatarSrc }} style={[st.avatar, uploading && { opacity: 0.5 }]} resizeMode="cover" />
              {uploading ? <View style={st.upl}><ActivityIndicator color={tw.orange600} size="large" /></View> : null}
            </View>
            <View style={st.camBadge}><Camera size={18} color={tw.slate900} strokeWidth={2.5} /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, width: 280, marginTop: 4 }}>
            <Press onPress={() => openGallery({ fileNamePrefix: 'profile', onSelectFile: onPicked })} disabled={uploading} scale={0.99} style={[st.pick, uploading ? st.pickOff : { backgroundColor: '#fff', borderColor: tw.slate200 }]}>
              <ImagePlus size={14} color={uploading ? tw.slate400 : tw.slate700} />
              <Text style={[st.pickText, { color: uploading ? tw.slate400 : tw.slate700 }]}>Gallery</Text>
            </Press>
            <Press onPress={() => openCamera({ fileNamePrefix: 'profile', onSelectFile: onPicked })} disabled={uploading} scale={0.99} style={[st.pick, uploading ? st.pickOff : { backgroundColor: tw.slate950, borderColor: tw.slate900 }]}>
              <Camera size={14} color={uploading ? tw.slate400 : '#fff'} />
              <Text style={[st.pickText, { color: uploading ? tw.slate400 : '#fff' }]}>Camera</Text>
            </Press>
          </View>
          <Text style={st.change}>{uploading ? 'Optimizing For WebP...' : 'Change Profile Photo'}</Text>
        </View>

        <View style={{ gap: 24 }}>
          <View style={{ gap: 8 }}>
            <Text style={st.label}>Full Name</Text>
            <View style={fieldStyle('name')}>
              <User size={18} color={tw.slate400} />
              <TextInput value={name} onChangeText={setName} onFocus={() => setFocus('name')} onBlur={() => setFocus('')} placeholder="Your full name" placeholderTextColor={tw.slate400} style={st.input} />
              {name ? <CheckCircle2 size={16} color={tw.emerald500} /> : null}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={st.label}>Email Address</Text>
            <View style={fieldStyle('email')}>
              <Mail size={18} color={tw.slate400} />
              <TextInput value={email} onChangeText={setEmail} onFocus={() => setFocus('email')} onBlur={() => setFocus('')} keyboardType="email-address" autoCapitalize="none" placeholder="yourname@example.com" placeholderTextColor={tw.slate400} style={st.input} />
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={st.label}>Phone Number</Text>
            <View style={[st.field, { backgroundColor: 'rgba(241,245,249,0.5)', borderColor: tw.slate50, opacity: 0.7 }]}>
              <Smartphone size={18} color={tw.slate400} />
              <Text style={[st.input, { color: tw.slate400 }]}>{phone ? `+91 ${phone}` : '+91'}</Text>
              <View style={st.verified}><Text style={st.verifiedText}>Verified</Text></View>
            </View>
          </View>
        </View>
        {saveError ? <Text style={st.saveErr}>{saveError}</Text> : null}
      </ScrollView>

      <View style={st.footer}>
        <Press onPress={handleSave} disabled={uploading || saving} scale={0.98} style={[st.save, (uploading || saving) && { opacity: 0.5 }]}>
          <Text style={st.saveText}>{saving ? 'Saving Changes...' : 'Save Profile'}</Text>
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: tw.gray50, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: tw.slate400, opacity: 0.6, marginBottom: 6, ...fo(700) },
  h2: { fontSize: 18, color: tw.slate900, letterSpacing: -0.3, ...fo(700) },
  avatarBox: { width: 110, height: 110, borderRadius: 42, backgroundColor: tw.slate50, padding: 6, borderWidth: 1, borderColor: tw.slate100, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  avatar: { width: '100%', height: '100%', borderRadius: 34 },
  upl: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  camBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#fff', padding: 10, borderRadius: 16, borderWidth: 1, borderColor: tw.slate50, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  pick: { flex: 1, height: 44, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pickOff: { backgroundColor: tw.slate100, borderColor: tw.slate200 },
  pickText: { fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', ...fo(700) },
  change: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: tw.slate400, ...fo(600) },
  label: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: tw.slate400, marginLeft: 4, ...fo(700) },
  field: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(248,250,252,0.5)', borderWidth: 1, borderColor: tw.slate100, borderRadius: 28, paddingVertical: 4, paddingHorizontal: 20, minHeight: 56, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  input: { flex: 1, fontSize: 15, color: tw.slate900, paddingVertical: 10, ...fo(700) },
  verified: { backgroundColor: tw.emerald100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  verifiedText: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.emerald700, ...fo(700) },
  saveErr: { fontSize: 14, color: tw.rose500, textAlign: 'center', ...fo(700) },
  footer: { padding: 24, paddingBottom: 112, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray50 },
  save: { height: 60, borderRadius: 28, backgroundColor: tw.slate900, alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 25px -5px rgba(15,23,42,0.1)' },
  saveText: { fontSize: 15, color: '#fff', ...fo(700) },
});
