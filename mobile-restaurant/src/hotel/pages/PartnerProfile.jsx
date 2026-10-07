import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CreditCard, Edit, Mail, MapPin, Phone, Save, Store, User } from 'lucide-react-native';
import { mediaUrl } from '../../api/client';
import { Press } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { openCamera, openGallery } from '../../lib/images';
import { localStore } from '../../lib/storage';
import { toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { hasRestaurantProfile, setActiveWorkspace } from '../../restaurant/utils/partnerSession';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { authService, hotelService, userService } from '../services/apiService';
import usePartnerStore from '../store/partnerStore';
import { getPartnerUser } from '../utils/partnerAuth';
import { HT, HT_GRADIENT } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerProfile.jsx
 * (/hotel/partner/profile).
 *
 * The web picks a photo with <input type=file> (or the Flutter camera bridge);
 * here the camera / gallery pickers upload it through hotelService.uploadImages.
 * "Sync with localStorage" is AuthContext.updateHotelUser, and
 * window.location.assign becomes a navigation. The gsap entrance is dropped.
 */

const Field = ({ label, value, icon: Icon, isEditing, onChange }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.field,
          isEditing
            ? [{ backgroundColor: '#fff', borderColor: HT.primary }, focused && { boxShadow: '0 0 0 4px rgba(10,77,43,0.1)' }]
            : { backgroundColor: 'rgba(249,250,251,0.5)', borderColor: tw.gray100 },
        ]}
      >
        <View style={[styles.fieldIcon, isEditing ? { backgroundColor: HT.primary } : [{ backgroundColor: '#fff' }, shadow('sm')]]}>
          <Icon size={18} color={isEditing ? '#fff' : tw.gray400} />
        </View>
        {isEditing ? (
          <TextInput
            value={value}
            onChangeText={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={`Enter ${label}`}
            placeholderTextColor={tw.gray300}
            style={styles.fieldInput}
          />
        ) : (
          <Text style={styles.fieldValue}>{value || 'Not set'}</Text>
        )}
      </View>
    </View>
  );
};

const PartnerProfile = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const { updateHotelUser } = useAuth();
  const { formData } = usePartnerStore();
  const [isEditing, setIsEditing] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [memberSince, setMemberSince] = useState('');
  const [profile, setProfile] = useState({
    name: formData?.propertyName || '',
    email: '',
    phone: '',
    address: '',
    role: 'partner',
    aadhaarNumber: '',
    panNumber: '',
    profileImage: '',
    profileImagePublicId: '',
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userService.getProfile();
        const addr = data.address || {};
        const addrStr = [addr.street, addr.city, addr.state].filter(Boolean).join(', ');
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: addrStr,
          role: data.role || 'partner',
          aadhaarNumber: data.aadhaarNumber || '',
          panNumber: data.panNumber || '',
          profileImage: data.profileImage || '',
          profileImagePublicId: data.profileImagePublicId || '',
        });
        setApprovalStatus(data.partnerApprovalStatus || 'pending');
        setMemberSince(data.createdAt || data.partnerSince || '');
      } catch {
        console.error('Failed to load partner profile');
        setProfile((p) => ({
          ...p,
          name: p.name || 'Partner',
          role: 'partner',
        }));
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  const parseAddress = (str) => {
    const parts = (str || '').split(',').map((s) => s.trim()).filter(Boolean);
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      zipCode: '',
      country: 'India',
    };
  };

  const handleToggleEdit = async () => {
    if (isEditing) {
      const addressObj = parseAddress(profile.address);
      try {
        const res = await authService.updateProfile({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          address: addressObj,
        });
        const updated = res.user || {};
        const addr = updated.address || addressObj;
        const addrStr = [addr.street, addr.city, addr.state].filter(Boolean).join(', ');
        setProfile({
          ...profile,
          name: updated.name || profile.name,
          email: updated.email || profile.email,
          phone: updated.phone || profile.phone,
          address: addrStr,
          role: updated.role || profile.role,
          profileImage: updated.profileImage || profile.profileImage,
          profileImagePublicId: updated.profileImagePublicId || profile.profileImagePublicId,
        });

        // Sync with the stored partner session
        updateHotelUser(updated);

        setIsEditing(false);
      } catch {
        setIsEditing(false);
      }
    } else {
      setIsEditing(true);
    }
  };

  const updateProfileImage = async (newUrl, newPublicId) => {
    // Update Profile with new image
    const updateRes = await authService.updateProfile({
      profileImage: newUrl,
      profileImagePublicId: newPublicId,
    });

    if (updateRes.success) {
      setProfile((prev) => ({
        ...prev,
        profileImage: newUrl,
        profileImagePublicId: newPublicId,
      }));

      // Sync with the stored partner session
      updateHotelUser({ profileImage: newUrl, profileImagePublicId: newPublicId });
    }
  };

  const uploadPicked = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const body = new FormData();
      body.append('images', { uri: file.uri, name: file.name, type: file.type });

      const res = await hotelService.uploadImages(body);
      if (res.files && res.files.length > 0) {
        const newUrl = res.files[0].url;
        const newPublicId = res.files[0].publicId;
        await updateProfileImage(newUrl, newPublicId);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      toast.error('Could not upload the photo');
    } finally {
      setUploading(false);
    }
  };

  const choosePhoto = () => {
    if (uploading) return;
    Alert.alert('Profile photo', undefined, [
      { text: 'Take photo', onPress: () => openCamera({ fileNamePrefix: 'profile', onSelectFile: uploadPicked }) },
      { text: 'Choose from gallery', onPress: () => openGallery({ fileNamePrefix: 'profile', onSelectFile: uploadPicked }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const statusLabel = approvalStatus === 'approved' ? 'Verified Partner' : approvalStatus === 'rejected' ? 'Rejected' : 'Pending Approval';
  const statusTone =
    approvalStatus === 'approved' ? { fg: tw.green600, bg: tw.green50 } : approvalStatus === 'rejected' ? { fg: tw.red600, bg: tw.red50 } : { fg: tw.orange600, bg: tw.orange50 };

  /*
   * The restaurant wizard prefills its owner phone from the pending-phone
   * entry, which a hotel-only partner has never had set. Seed it from the
   * signed-in partner so they are not asked to retype the number they just
   * verified.
   */
  const startRestaurantOnboarding = () => {
    const phone = String(profile?.phone || getPartnerUser()?.phone || '').replace(/\D/g, '').slice(-10);
    if (phone) localStore.setItem('restaurant_pendingPhone', phone);
    setActiveWorkspace('restaurant');
    navigate('/food/restaurant/onboarding');
  };

  const photo = mediaUrl(profile.profileImage);

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      {/* Custom Header */}
      <PartnerHeader />

      <ScrollView contentContainerStyle={{ paddingBottom: 80 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 576, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 32 }}>
          {/* Avatar Section */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View>
              <LinearGradient colors={HT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                {uploading ? (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.saving}>Saving...</Text>
                  </View>
                ) : photo ? (
                  <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Profile" />
                ) : (
                  <Text style={styles.initials}>{(profile.name || 'P').substring(0, 2).toUpperCase()}</Text>
                )}
              </LinearGradient>

              {/* Permanent Camera Button */}
              <Press onPress={choosePhoto} disabled={uploading} accessibilityLabel="Change photo" style={styles.cam}>
                <Camera size={18} color={HT.primary} />
              </Press>
            </View>

            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={styles.name}>{profile.name || 'Partner'}</Text>
              <View style={[styles.statusPill, { backgroundColor: statusTone.bg }]}>
                <Text style={[styles.statusText, { color: statusTone.fg }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>

          {/*
           * One sign-in covers both partner businesses, so offer the
           * other one to a partner who does not run it yet.
           */}
          {!hasRestaurantProfile() ? (
            <Press onPress={startRestaurantOnboarding} scale={0.99} style={styles.alsoCard}>
              <View style={styles.alsoIcon}>
                <Store size={22} color={HT.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.alsoTitle}>Also list a restaurant</Text>
                <Text style={styles.alsoSub}>Run it from this same sign-in</Text>
              </View>
            </Press>
          ) : null}

          {/* Details Form Card */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View>
                <Text style={styles.kicker}>Account & Settings</Text>
                <Text style={styles.cardTitle}>Personal Profile</Text>
              </View>
              <Press
                onPress={handleToggleEdit}
                style={[styles.editBtn, isEditing ? [{ backgroundColor: HT.primary }, shadow('0 10px 15px -3px rgba(10,77,43,0.2)')] : [{ backgroundColor: tw.gray50 }, shadow('lg')]]}
              >
                {isEditing ? <Save size={16} color="#fff" /> : <Edit size={16} color={tw.gray600} />}
                <Text style={[styles.editText, { color: isEditing ? '#fff' : tw.gray600 }]}>{isEditing ? 'Save' : 'Edit Profile'}</Text>
              </Press>
            </View>

            <Field label="Full Name" value={profile.name} icon={User} isEditing={isEditing} onChange={(v) => handleChange('name', v)} />
            <Field label="Email Address" value={profile.email} icon={Mail} isEditing={isEditing} onChange={(v) => handleChange('email', v)} />
            <Field label="Phone Number" value={profile.phone} icon={Phone} isEditing={isEditing} onChange={(v) => handleChange('phone', v)} />
            <Field label="Address" value={profile.address} icon={MapPin} isEditing={isEditing} onChange={(v) => handleChange('address', v)} />

            {/* Non-Editable Fields */}
            <Field label="Aadhaar Number" value={profile.aadhaarNumber} icon={CreditCard} isEditing={false} onChange={() => {}} />
            <Field label="PAN Number" value={profile.panNumber} icon={CreditCard} isEditing={false} onChange={() => {}} />
          </View>

          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <Text style={styles.member}>
              Member since {memberSince ? new Date(memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: tw.gray400, marginBottom: 8, ...poppins(900) },
  field: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  fieldIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fieldInput: { flex: 1, padding: 0, fontSize: 14, color: tw.slate900, ...poppins(700) },
  fieldValue: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(700) },

  avatar: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', overflow: 'hidden', ...shadow('0 25px 50px -12px rgba(10,77,43,0.3)') },
  initials: { fontSize: 36, lineHeight: 40, color: '#fff', ...poppins(900) },
  saving: { fontSize: 10, lineHeight: 15, letterSpacing: -0.5, textTransform: 'uppercase', color: '#fff', ...poppins(700) },
  cam: { position: 'absolute', bottom: 4, right: 4, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.gray100, zIndex: 10, ...shadow('lg') },
  name: { fontSize: 24, lineHeight: 32, color: tw.slate900, ...poppins(900) },
  statusPill: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, lineHeight: 15, letterSpacing: 1.5, textTransform: 'uppercase', ...poppins(900) },

  alsoCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', padding: 20, borderRadius: 32, borderWidth: 1, borderColor: tw.gray100, marginBottom: 24, ...shadow('0 20px 25px -5px rgba(229,231,235,0.5)') },
  alsoIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: HT.primarySoft, alignItems: 'center', justifyContent: 'center' },
  alsoTitle: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(900) },
  alsoSub: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },

  card: { backgroundColor: '#fff', padding: 24, paddingBottom: 40, borderRadius: 40, borderWidth: 1, borderColor: tw.gray100, marginBottom: 24, ...shadow('0 20px 25px -5px rgba(229,231,235,0.5)') },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tw.gray50, gap: 8 },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 2, textTransform: 'uppercase', color: HT.primary, marginBottom: 4, ...poppins(900) },
  cardTitle: { fontSize: 20, lineHeight: 28, color: tw.slate900, ...poppins(900) },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16 },
  editText: { fontSize: 14, lineHeight: 20, ...poppins(700) },
  member: { fontSize: 10, lineHeight: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
});

export default PartnerProfile;
