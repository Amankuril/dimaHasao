import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CreditCard, Edit, Mail, MapPin, Phone, Save, Store, User } from 'lucide-react-native';
import { mediaUrl } from '../../api/client';
import { Button, Card, IconButton, ListRow, StatusBadge } from '../../components/ds';
import { useAuth } from '../../context/AuthContext';
import { openCamera, openGallery } from '../../lib/images';
import { localStore } from '../../lib/storage';
import { toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { hasRestaurantProfile, setActiveWorkspace } from '../../restaurant/utils/partnerSession';
import { color, elevation, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { authService, hotelService, userService } from '../services/apiService';
import usePartnerStore from '../store/partnerStore';
import { getPartnerUser } from '../utils/partnerAuth';
import { Field as InputField } from '../components/dashboard/partnerUi';

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
  if (isEditing) {
    return (
      <InputField
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={`Enter ${label.toLowerCase()}`}
        right={<Icon size={18} color={color.textMuted} />}
      />
    );
  }
  return (
    <View style={styles.readRow}>
      <View style={styles.fieldIcon}>
        <Icon size={18} color={color.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !value && { color: color.textMuted }]} numberOfLines={2}>
          {value || 'Not set'}
        </Text>
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

  const statusLabel = approvalStatus === 'approved' ? 'Verified partner' : approvalStatus === 'rejected' ? 'Rejected' : 'Pending approval';
  const statusTone = approvalStatus === 'approved' ? 'success' : approvalStatus === 'rejected' ? 'danger' : 'warning';

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
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {/* Custom Header */}
      <PartnerHeader />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl + insets.bottom }} keyboardShouldPersistTaps="handled">
          <View style={{ maxWidth: 576, width: '100%', alignSelf: 'center', padding: space.lg, gap: space.lg }}>
            {/* Avatar Section */}
            <View style={{ alignItems: 'center', paddingTop: space.md }}>
              <View>
                <View style={styles.avatar}>
                  {uploading ? (
                    <View style={{ alignItems: 'center', gap: space.xs }}>
                      <ActivityIndicator color={color.textInverse} />
                      <Text style={styles.saving}>Saving...</Text>
                    </View>
                  ) : photo ? (
                    <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Profile" />
                  ) : (
                    <Text style={styles.initials}>{(profile.name || 'P').substring(0, 2).toUpperCase()}</Text>
                  )}
                </View>

                {/* Permanent Camera Button */}
                <IconButton icon={Camera} label="Change photo" variant="soft" onPress={choosePhoto} disabled={uploading} iconColor={color.primary} style={styles.cam} />
              </View>

              <Text style={styles.name} numberOfLines={2}>
                {profile.name || 'Partner'}
              </Text>
              <StatusBadge label={statusLabel} tone={statusTone} style={{ alignSelf: 'center', marginTop: space.xs }} />
            </View>

            {/*
             * One sign-in covers both partner businesses, so offer the
             * other one to a partner who does not run it yet.
             */}
            {!hasRestaurantProfile() ? (
              <Card padded={false}>
                <ListRow icon={Store} title="Also list a restaurant" subtitle="Run it from this same sign-in" onPress={startRestaurantOnboarding} />
              </Card>
            ) : null}

            {/* Details Form Card */}
            <Card style={{ gap: space.lg }}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.kicker}>Account</Text>
                  <Text style={styles.cardTitle}>Personal profile</Text>
                </View>
                <Button
                  title={isEditing ? 'Save' : 'Edit profile'}
                  icon={isEditing ? Save : Edit}
                  variant={isEditing ? 'primary' : 'secondary'}
                  size="sm"
                  fullWidth={false}
                  onPress={handleToggleEdit}
                  style={{ minHeight: 44 }}
                />
              </View>

              <Field label="Full name" value={profile.name} icon={User} isEditing={isEditing} onChange={(v) => handleChange('name', v)} />
              <Field label="Email address" value={profile.email} icon={Mail} isEditing={isEditing} onChange={(v) => handleChange('email', v)} />
              <Field label="Phone number" value={profile.phone} icon={Phone} isEditing={isEditing} onChange={(v) => handleChange('phone', v)} />
              <Field label="Address" value={profile.address} icon={MapPin} isEditing={isEditing} onChange={(v) => handleChange('address', v)} />

              {/* Non-Editable Fields */}
              <Field label="Aadhaar number" value={profile.aadhaarNumber} icon={CreditCard} isEditing={false} onChange={() => {}} />
              <Field label="PAN number" value={profile.panNumber} icon={CreditCard} isEditing={false} onChange={() => {}} />

              {isEditing ? <Button title="Save changes" icon={Save} onPress={handleToggleEdit} /> : null}
            </Card>

            <Text style={styles.member}>
              Member since {memberSince ? new Date(memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  readRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  fieldLabel: { ...type.caption, color: color.textMuted },
  fieldIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  fieldValue: { ...type.bodyStrong, color: color.text },

  avatar: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: color.surface, overflow: 'hidden', backgroundColor: color.primary, ...elevation.card },
  initials: { ...type.heroSerif, fontSize: 32, lineHeight: 40, color: color.goldOnDark },
  saving: { ...type.caption, color: color.textInverse },
  cam: { position: 'absolute', bottom: 0, right: 0, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.card },
  name: { ...type.heading, fontSize: 22, lineHeight: 30, color: color.text, marginTop: space.md, textAlign: 'center' },

  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, gap: space.sm },
  kicker: { ...type.overline, color: color.goldText },
  cardTitle: { ...type.heading, color: color.text },
  member: { ...type.caption, color: color.textMuted, textAlign: 'center' },
});

export default PartnerProfile;
