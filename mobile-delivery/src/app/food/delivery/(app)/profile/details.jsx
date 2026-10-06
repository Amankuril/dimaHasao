import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle, ArrowLeft, Banknote, Bike, Camera, Car, CheckCircle, Edit2, Eye, FileText,
  Image as ImageIcon, MapPin, Plus, QrCode, Shield, Smartphone, Truck, User, X,
} from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { mediaUrl } from '../../../../../api/client';
import BottomPopup from '../../../../../components/delivery/BottomPopup';
import { SelectField } from '../../../../../components/kit';
import { Spinner } from '../../../../../components/Loader';
import { Press, ThemedInput } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { showUserFacingApiError } from '../../../../../lib/apiError';
import { openCamera, openGallery, prepareUploadFile } from '../../../../../lib/images';
import { toast } from '../../../../../lib/notify';
import { useAnimatedValue } from '../../../../../lib/useAnimatedValue';
import { display, ff, gradients, shadow, tw } from '../../../../../theme';

/*
 * Web: DeliveryV2/pages/profile/ProfileDetailsV2.jsx (root has `font-poppins`,
 * which deliveryTheme.css rewrites to Nunito; h1-h4 / .font-black -> Sora).
 * Theme: rounded-2xl / rounded-3xl get the card shadow and #E5DDC3 borders;
 * blue-50/600/100 -> primary soft / primary / primary border; `p-6` -> 17.6 px;
 * bg-[#121212] -> night gradient; inputs are white with a #E8DEE7 border.
 * The web's Flutter bridge / <input type=file> become expo-image-picker.
 */

const AVATAR = require('../../../../../../assets/images/profile_avatar.webp');
const CARD_BORDER = '#E5DDC3';
const PURPLE300 = '#DAB2FF';
const PURPLE400 = '#C27AFF';
const BLUE600_50 = 'rgba(21,93,252,0.5)'; // text-blue-600/50 is not remapped
const BLUE500_50 = 'rgba(43,127,255,0.5)'; // text-blue-500/50 is not remapped

const EMPTY_BANK = { accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', panNumber: '', upiId: '', upiQrCode: null };

const bankFromProfile = (p) => ({
  accountHolderName: p?.documents?.bankDetails?.accountHolderName || '',
  accountNumber: p?.documents?.bankDetails?.accountNumber || '',
  ifscCode: p?.documents?.bankDetails?.ifscCode || '',
  bankName: p?.documents?.bankDetails?.bankName || '',
  panNumber: p?.documents?.pan?.number || '',
  upiId: p?.documents?.bankDetails?.upiId || '',
  upiQrCode: p?.documents?.bankDetails?.upiQrCode || null,
});

const parseWalletBalance = (response) => {
  const data = response?.data;
  const wallet = (data?.success && data?.data?.wallet) || data?.wallet || data?.data || data;
  const possibleBalance = wallet?.totalBalance || wallet?.balance || wallet?.pocketBalance || 0;
  return Number(possibleBalance) || 0;
};

function VehicleGlyph({ type: rawType, withBike = true, size, color }) {
  const type = String(rawType || '').toLowerCase();
  let Icon = Truck;
  if (type.includes('car')) Icon = Car;
  else if (withBike && (type.includes('bike') || type.includes('scooter') || type.includes('motorcycle'))) Icon = Bike;
  else if (type.includes('bicycle')) Icon = Bike;
  return <Icon size={size} color={color} />;
}

const VEHICLE_OPTIONS = [
  { value: 'bike', label: 'Bike' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'car', label: 'Car' },
];

const BANK_FIELDS = [
  { label: 'Account Holder', key: 'accountHolderName', icon: User, maxLength: 60 },
  { label: 'Account Number', key: 'accountNumber', icon: Banknote, maxLength: 20, isNumeric: true },
  { label: 'IFSC Code', key: 'ifscCode', icon: Shield, format: (v) => v.toUpperCase(), maxLength: 11 },
  { label: 'Bank Name', key: 'bankName', icon: MapPin, maxLength: 60 },
  { label: 'PAN Number', key: 'panNumber', icon: FileText, format: (v) => v.toUpperCase(), maxLength: 10 },
  { label: 'UPI ID', key: 'upiId', icon: Smartphone, maxLength: 60 },
];

function InfoCard({ icon, label, value, badge = null, onEdit = null }) {
  return (
    <View style={[styles.infoCard, shadow('card')]}>
      <View style={styles.infoLeft}>
        <View style={styles.infoIcon}>{icon}</View>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.infoLabel}>{label}</Text>
          <View style={styles.infoValueRow}>
            <Text style={styles.infoValue}>{value || '—'}</Text>
            {badge}
          </View>
        </View>
      </View>
      {onEdit ? (
        <Press onPress={onEdit} accessibilityLabel={`Edit ${label}`} style={{ padding: 8, borderRadius: 8 }}>
          <Edit2 size={16} color={tw.gray400} />
        </Press>
      ) : null}
    </View>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <View style={styles.sectionTitle}>
      {icon}
      <Text style={styles.sectionTitleText}>{children}</Text>
    </View>
  );
}

function LoadingScreen() {
  const spin = useAnimatedValue(0);
  useEffect(() => {
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={styles.loadingPage}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
          {/* border-4 border-orange-100 border-t-orange-500 (border-t-orange-500 is not remapped) */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { borderRadius: 32, borderWidth: 4, borderColor: tw.primaryBorder, borderTopColor: '#FF6900', transform: [{ rotate }] }]}
          />
          <User size={24} color={tw.primary} />
        </View>
        <Text style={styles.loadingText}>Initializing Profile...</Text>
      </View>
    </View>
  );
}

export default function ProfileDetailsV2() {
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [showVehiclePopup, setShowVehiclePopup] = useState(false);
  const [vehicleInput, setVehicleInput] = useState({ number: '', brand: '', type: '' });
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showBankDetailsPopup, setShowBankDetailsPopup] = useState(false);
  const [, setWalletBalance] = useState(null);
  const [bankDetails, setBankDetails] = useState(EMPTY_BANK);
  const [upiQrFile, setUpiQrFile] = useState(null);
  const [upiQrPreview, setUpiQrPreview] = useState(null);
  const [isUpdatingBankDetails, setIsUpdatingBankDetails] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const redirectTimer = useRef(null);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  // Fetch profile data
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const walletResponse = await deliveryAPI.getWallet();
        setWalletBalance(parseWalletBalance(walletResponse));
      } catch {
        // wallet balance is optional here
      }
    };

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [profileResponse] = await Promise.allSettled([deliveryAPI.getProfile(), fetchWalletBalance()]);

        if (
          profileResponse?.status === 'fulfilled' &&
          profileResponse?.value?.data?.success &&
          profileResponse?.value?.data?.data?.profile
        ) {
          const profileData = profileResponse.value.data.data.profile;
          setProfile(profileData);
          const vNum = profileData?.vehicle?.number || '';
          const vBrand = profileData?.vehicle?.brand || '';
          const vType = profileData?.vehicle?.type || '';
          setVehicleNumber(vNum);
          setVehicleBrand(vBrand);
          setVehicleType(vType);
          setVehicleInput({ number: vNum, brand: vBrand, type: vType });
          setBankDetails(bankFromProfile(profileData));
        } else {
          throw new Error('Profile fetch failed');
        }
      } catch (error) {
        if (error.response?.status === 401) {
          showUserFacingApiError(error, 'Session expired. Please login again.');
          redirectTimer.current = setTimeout(() => {
            router.replace('/food/delivery/login');
          }, 2000);
        } else {
          showUserFacingApiError(error, 'Failed to load profile data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const isAdminApproved = ['approved', 'active'].includes(String(profile?.status || '').toLowerCase());

  const getDocumentVerificationLabel = (doc) => {
    if (!doc?.document) return 'Not uploaded';
    if (doc?.verified || isAdminApproved) return 'Verified';
    return 'Pending Verification';
  };

  const getDocumentNumber = (doc) => String(doc?.number || doc?.idNumber || doc?.documentNumber || '').trim();

  const getDrivingLicenseNumber = () =>
    String(
      profile?.documents?.drivingLicense?.number ||
        profile?.documents?.drivingLicense?.idNumber ||
        profile?.documents?.drivingLicense?.documentNumber ||
        profile?.drivingLicenseNumber ||
        profile?.documents?.drivingLicenseNumber ||
        '',
    ).trim();

  const parseNumericValue = (...values) => {
    for (const value of values) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
    }
    return null;
  };

  const ratingValue = parseNumericValue(
    profile?.metrics?.rating,
    profile?.ratings?.average,
    profile?.averageRating,
    profile?.rating,
    profile?.stats?.averageRating,
    profile?.analytics?.averageRating,
  );

  const ratingCount = Number(
    profile?.metrics?.ratingCount ||
      profile?.ratings?.count ||
      profile?.totalRatings ||
      profile?.reviewCount ||
      profile?.reviewsCount ||
      profile?.stats?.totalRatings ||
      profile?.analytics?.totalRatings ||
      0,
  );

  const ratingDisplay = ratingValue ? `${ratingValue.toFixed(1)}${ratingCount > 0 ? ` (${ratingCount})` : ''}` : '-';

  const getRiderLevel = () => {
    if (!Number.isFinite(ratingValue) || ratingValue <= 0 || ratingCount <= 0) return 'New Rider';
    if (ratingValue >= 4.8 && ratingCount >= 100) return 'Champion';
    if (ratingValue >= 4.6 && ratingCount >= 50) return 'Elite';
    if (ratingValue >= 4.3 && ratingCount >= 20) return 'Pro';
    if (ratingValue >= 4.0 && ratingCount >= 10) return 'Rising';
    return 'Starter';
  };
  const riderLevel = getRiderLevel();

  const profileImageUrl = profile?.profileImage?.url || profile?.documents?.photo || null;

  const refreshProfile = async () => {
    const response = await deliveryAPI.getProfile();
    if (response?.data?.success && response?.data?.data?.profile) {
      setProfile(response.data.data.profile);
      setBankDetails(bankFromProfile(response.data.data.profile));
    }
  };

  const uploadProfileFile = async (file) => {
    try {
      setIsUploadingImage(true);
      const prepared = await prepareUploadFile(file, { preset: 'profile' });
      const formData = new FormData();
      formData.append('profilePhoto', { uri: prepared.uri, name: prepared.name, type: prepared.type });
      const response = await deliveryAPI.updateProfileMultipart(formData);
      if (response?.data?.success) {
        toast.success('Profile photo updated');
        await refreshProfile();
      } else {
        showUserFacingApiError({ response: { data: { message: response?.data?.message } } }, 'Update failed');
      }
    } catch (error) {
      showUserFacingApiError(error, 'Update failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const uploadUpiQrFile = (file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setUpiQrFile(file);
    setUpiQrPreview(file.uri);
    toast.success('UPI QR selected');
  };

  const onFileSelected = (target) => (file) => {
    if (target === 'profilePhoto') uploadProfileFile(file);
    else if (target === 'upiQrCode') uploadUpiQrFile(file);
  };

  const handleTakeCameraPhoto = (target) => openCamera({ onSelectFile: onFileSelected(target), fileNamePrefix: `profile-${target}` });
  const handlePickFromGallery = (target) => openGallery({ onSelectFile: onFileSelected(target), fileNamePrefix: `profile-${target}` });

  const handleDeletePhoto = async () => {
    try {
      setIsDeletingImage(true);
      const response = await deliveryAPI.updateProfileDetails({ profilePhoto: '' });
      // Backend might return different structures; check for success
      if (response?.status === 200) {
        toast.success('Profile photo removed');
        await refreshProfile();
        setShowDeletePopup(false);
      } else {
        toast.error('Failed to remove photo');
      }
    } catch (error) {
      showUserFacingApiError(error, 'Delete failed');
    } finally {
      setIsDeletingImage(false);
    }
  };

  const submitBankDetails = async () => {
    setIsUpdatingBankDetails(true);
    try {
      const { accountNumber, ifscCode, panNumber, upiId } = bankDetails;

      if (accountNumber && !/^\d{9,18}$/.test(accountNumber.trim())) {
        return toast.error('Invalid Account Number (9-18 digits)');
      }
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (ifscCode && !ifscRegex.test(ifscCode.trim().toUpperCase())) {
        return toast.error('Invalid IFSC Code (e.g. SBIN0001234)');
      }
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (panNumber && !panRegex.test(panNumber.trim().toUpperCase())) {
        return toast.error('Invalid PAN Card format (e.g. ABCDE1234F)');
      }
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (upiId && !upiRegex.test(upiId.trim())) {
        return toast.error('Invalid UPI ID (e.g. user@bank)');
      }

      // Send as FormData to support optional QR upload
      const formData = new FormData();
      formData.append('documents[bankDetails][accountHolderName]', (bankDetails.accountHolderName || '').trim());
      formData.append('documents[bankDetails][accountNumber]', (bankDetails.accountNumber || '').trim());
      formData.append('documents[bankDetails][ifscCode]', (bankDetails.ifscCode || '').trim().toUpperCase());
      formData.append('documents[bankDetails][bankName]', (bankDetails.bankName || '').trim());
      formData.append('documents[bankDetails][upiId]', (bankDetails.upiId || '').trim());
      formData.append('documents[pan][number]', (bankDetails.panNumber || '').trim().toUpperCase());

      if (upiQrFile) {
        const prepared = await prepareUploadFile(upiQrFile);
        formData.append('upiQrCode', { uri: prepared.uri, name: prepared.name, type: prepared.type });
      }

      await deliveryAPI.updateBankDetailsMultipart(formData);
      toast.success('Bank details updated');
      setShowBankDetailsPopup(false);
      setUpiQrFile(null);
      setUpiQrPreview(null);
      await refreshProfile();
    } catch (error) {
      showUserFacingApiError(error, 'Update failed');
    } finally {
      setIsUpdatingBankDetails(false);
    }
    return undefined;
  };

  const saveVehicle = async () => {
    const num = vehicleInput.number.trim();
    const brand = vehicleInput.brand.trim();
    const type = vehicleInput.type;

    if (!num) return toast.error('Vehicle number is required');
    if (!brand) return toast.error('Vehicle brand is required');

    // Accept common formats like MH12AB1234 or MH12A1234
    const numRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/i;
    if (!numRegex.test(num.replace(/\s+/g, ''))) {
      return toast.error('Please enter a valid vehicle number (e.g. MH12AB1234)');
    }

    try {
      await deliveryAPI.updateProfileDetails({ vehicle: { number: num, brand, type } });
      setVehicleNumber(num);
      setVehicleBrand(brand);
      setVehicleType(type);
      setShowVehiclePopup(false);
      toast.success('Flight details updated!');
      await refreshProfile();
    } catch {
      toast.error('Cloud storage sync failed');
    }
    return undefined;
  };

  if (loading) return <LoadingScreen />;

  const docs = [
    { icon: FileText, label: 'Aadhar Card', doc: profile?.documents?.aadhar },
    { icon: FileText, label: 'PAN Card', doc: profile?.documents?.pan },
    { icon: Truck, label: 'Driving License', doc: profile?.documents?.drivingLicense, number: getDrivingLicenseNumber() },
  ];
  const vehicleSelectValue = VEHICLE_OPTIONS.some((o) => o.value === vehicleInput.type) ? vehicleInput.type : 'bike';

  return (
    <View style={styles.page}>
      {/* ─── HEADER ─── */}
      <View style={[styles.header, { height: 64 + insets.top, paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          <Press onPress={goBack} accessibilityLabel="Back" hitSlop={10} style={{ padding: 8, borderRadius: 12 }}>
            <ArrowLeft size={20} color={tw.gray700} />
          </Press>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.idBadge}>
          <Text style={styles.idBadgeText}>ID: {profile?.deliveryId || '...'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 80 + insets.top, paddingBottom: 96 + insets.bottom }}>
        <View style={styles.content}>
          {/* ─── PROFILE AVATAR BLOCK ─── */}
          <View style={{ zIndex: 2 }}>
            <View style={[styles.avatar, shadow('2xl')]}>
              <Image source={profileImageUrl ? { uri: mediaUrl(profileImageUrl) } : AVATAR} resizeMode="cover" style={styles.avatarImg} />
              {isUploadingImage ? (
                <View style={styles.avatarBusy}>
                  <Spinner size={24} color="#fff" />
                </View>
              ) : null}
            </View>

            <View style={styles.avatarActions}>
              <Press onPress={() => handleTakeCameraPhoto('profilePhoto')} accessibilityLabel="Take Photo" style={[styles.avatarBtn, { backgroundColor: '#000' }, shadow('card')]}>
                <Camera size={20} color="#fff" />
              </Press>
              <Press onPress={() => handlePickFromGallery('profilePhoto')} accessibilityLabel="Gallery" style={[styles.avatarBtn, { backgroundColor: tw.primary }, shadow('card')]}>
                <ImageIcon size={20} color="#fff" />
              </Press>
              {profileImageUrl ? (
                <Press onPress={() => setShowDeletePopup(true)} accessibilityLabel="Remove" style={[styles.avatarBtn, { backgroundColor: tw.red500 }, shadow('card')]}>
                  <X size={20} color="#fff" />
                </Press>
              ) : null}
            </View>
          </View>

          <View style={{ alignItems: 'center', paddingTop: 24 }}>
            <Text style={styles.name}>{profile?.name}</Text>
            <Text style={styles.subtitle}>Delivery Partner • {profile?.location?.city}</Text>

            <View style={styles.pillRow}>
              <View style={[styles.pill, shadow('card'), isAdminApproved ? { backgroundColor: tw.primary } : { backgroundColor: tw.primarySoft }]}>
                <CheckCircle size={16} color={isAdminApproved ? '#fff' : tw.primary} />
                <Text style={[styles.pillText, { color: isAdminApproved ? '#fff' : tw.primary }]}>
                  {isAdminApproved ? 'Approved' : profile?.status || 'Pending'}
                </Text>
              </View>
              <View style={[styles.pill, shadow('card'), { backgroundColor: tw.primarySoft }]}>
                <Smartphone size={16} color={tw.primary} />
                <Text style={[styles.pillText, { color: tw.primary }]}>{profile?.phone}</Text>
              </View>
            </View>
          </View>

          {/* ─── RIDER STATS ─── */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.stat, shadow('card')]}>
              <Text style={styles.statLabel}>Rider Level</Text>
              <Text style={styles.statValue}>{riderLevel}</Text>
            </View>
            <View style={[styles.stat, shadow('card')]}>
              <Text style={styles.statLabel}>Total Rating</Text>
              <Text style={styles.statValue}>{ratingDisplay}</Text>
            </View>
          </View>

          {/* ─── VEHICLE SECTION ─── */}
          <View>
            <SectionTitle icon={<VehicleGlyph type={profile?.vehicle?.type} size={16} color={tw.gray400} />}>Vehicle Assets</SectionTitle>
            <View style={{ height: 12 }} />
            <InfoCard
              icon={<VehicleGlyph type={profile?.vehicle?.type} size={24} color={tw.primary} />}
              label="Vehicle Details"
              value={[profile?.vehicle?.type, profile?.vehicle?.brand, vehicleNumber].filter(Boolean).map((v) => String(v).toUpperCase()).join(' • ') || 'N/A'}
              badge={
                !vehicleNumber ? (
                  <View style={styles.missing}>
                    <Text style={styles.missingText}>Missing</Text>
                  </View>
                ) : null
              }
              onEdit={() => {
                setVehicleInput({ number: vehicleNumber, brand: vehicleBrand, type: vehicleType });
                setShowVehiclePopup(true);
              }}
            />
          </View>

          {/* ─── BANK & PAYMENTS SECTION ─── */}
          <View>
            <View style={styles.bankHead}>
              <SectionTitle icon={<Banknote size={16} color={tw.gray400} />}>Bank & Payments</SectionTitle>
              <Press
                onPress={() => {
                  // Reset state to current profile data when opening
                  setBankDetails(bankFromProfile(profile));
                  setUpiQrFile(null);
                  setUpiQrPreview(null);
                  setShowBankDetailsPopup(true);
                }}
                accessibilityLabel="Edit Details"
                scale={1}
              >
                <Text style={styles.editDetails}>Edit Details</Text>
              </Press>
            </View>

            <View style={{ gap: 12 }}>
              <LinearGradient colors={gradients.night} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={[styles.bankCard, shadow('card')]}>
                <View style={styles.bankTop}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.bankKicker}>Bank Account</Text>
                    <Text style={styles.bankName}>{bankDetails.bankName || 'Link Account'}</Text>
                  </View>
                  <Banknote size={32} color={BLUE500_50} />
                </View>
                <View style={styles.bankBottom}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.bankNumber}>
                      {bankDetails.accountNumber ? `•••• •••• •••• ${bankDetails.accountNumber.slice(-4)}` : 'XXXX XXXX XXXX XXXX'}
                    </Text>
                    <Text style={styles.bankHolder}>{bankDetails.accountHolderName || 'Account Holder'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.ifscLabel}>IFSC Code</Text>
                    <Text style={styles.ifsc}>{bankDetails.ifscCode || '—'}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* UPI Section */}
              <View style={[styles.upiCard, shadow('card')]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, flexShrink: 1 }}>
                  <View style={[styles.upiIcon, shadow('card')]}>
                    <Smartphone size={28} color={tw.purple600} />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.upiLabel}>UPI ID</Text>
                    <Text style={styles.upiValue}>{bankDetails.upiId || 'Not added'}</Text>
                  </View>
                </View>
                {bankDetails.upiQrCode ? (
                  <Press
                    onPress={() => {
                      setSelectedDocument({ name: 'UPI Scanner', url: bankDetails.upiQrCode });
                      setShowDocumentModal(true);
                    }}
                    accessibilityLabel="View UPI QR"
                    style={[styles.qrBtn, shadow('card')]}
                  >
                    <QrCode size={24} color={tw.gray400} />
                  </Press>
                ) : null}
              </View>
            </View>
          </View>

          {/* ─── DOCUMENTS SECTION ─── */}
          <View>
            <View style={{ marginBottom: 16, paddingHorizontal: 4 }}>
              <SectionTitle icon={<Shield size={16} color={tw.gray400} />}>Verification Docs</SectionTitle>
            </View>
            <View style={{ gap: 12 }}>
              {docs.map((item) => (
                <View key={item.label} style={[styles.docCard, shadow('card')]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 1 }}>
                    <View style={styles.docIcon}>
                      <item.icon size={20} color={tw.gray400} />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.docLabel}>{item.label}</Text>
                      <Text style={styles.docStatus}>{getDocumentVerificationLabel(item.doc)}</Text>
                      <Text style={styles.docNumber}>{item.number || getDocumentNumber(item.doc) || 'Number not added'}</Text>
                    </View>
                  </View>
                  {item.doc?.document ? (
                    <Press
                      onPress={() => {
                        setSelectedDocument({ name: item.label, url: item.doc.document });
                        setShowDocumentModal(true);
                      }}
                      accessibilityLabel={`View ${item.label}`}
                      style={{ padding: 8, backgroundColor: tw.gray50, borderRadius: 8 }}
                    >
                      <Eye size={16} color={tw.gray400} />
                    </Press>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ─── MODALS ─── */}

      {/* Delete Confirmation Popup */}
      <BottomPopup isOpen={showDeletePopup} onClose={() => setShowDeletePopup(false)} title="Remove Photo?" showCloseButton={false}>
        <View style={{ paddingTop: 16, paddingBottom: 40, alignItems: 'center' }}>
          <View style={styles.delIcon}>
            <AlertCircle size={40} color={tw.red500} />
          </View>
          <Text style={styles.delTitle}>Are you sure?</Text>
          <Text style={styles.delText}>This will remove your current profile picture.</Text>
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 8, width: '100%' }}>
            <Press onPress={() => setShowDeletePopup(false)} accessibilityLabel="Cancel" style={[styles.delBtn, { backgroundColor: tw.gray100 }, shadow('card')]}>
              <Text style={[styles.delBtnText, { color: tw.gray500 }]}>Cancel</Text>
            </Press>
            <Press onPress={handleDeletePhoto} disabled={isDeletingImage} accessibilityLabel="Yes, Remove" style={[styles.delBtn, { backgroundColor: tw.red500 }, shadow('card')]}>
              {isDeletingImage ? <Spinner size={16} color="#fff" /> : <Text style={[styles.delBtnText, { color: '#fff' }]}>Yes, Remove</Text>}
            </Press>
          </View>
        </View>
      </BottomPopup>

      {/* Vehicle Popup */}
      <BottomPopup isOpen={showVehiclePopup} onClose={() => setShowVehiclePopup(false)} title="Vehicle Info" closeOnHandleClick showCloseButton={false}>
        <View style={{ gap: 16, paddingBottom: 40 }}>
          <View style={styles.vehicleCard}>
            {/* Type Selection */}
            <View style={styles.vRow}>
              <View style={styles.vIcon}>
                <VehicleGlyph type={vehicleInput.type} withBike={false} size={20} color={tw.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vLabel}>Vehicle Type</Text>
                <SelectField
                  value={vehicleSelectValue}
                  options={VEHICLE_OPTIONS}
                  onChange={(v) => setVehicleInput((s) => ({ ...s, type: v }))}
                  accessibilityLabel="Vehicle Type"
                  chevronColor={tw.gray700}
                  style={styles.vSelect}
                  textStyle={styles.vInputText}
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Name/Brand Input */}
            <View style={styles.vRow}>
              <View style={styles.vIcon}>
                <Plus size={16} color={BLUE600_50} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vLabel}>Vehicle Name/Brand</Text>
                <ThemedInput
                  value={vehicleInput.brand}
                  onChangeText={(v) => setVehicleInput((s) => ({ ...s, brand: v }))}
                  placeholder="E.g. Honda Splendor"
                  placeholderTextColor={tw.gray200}
                  radius={0}
                  borderWidth={0}
                  style={[styles.vInput, styles.vInputText]}
                  accessibilityLabel="Vehicle Name/Brand"
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Number Input */}
            <View style={styles.vRow}>
              <View style={styles.vIcon}>
                <QrCode size={16} color={BLUE600_50} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vLabel}>Vehicle Number</Text>
                <ThemedInput
                  value={vehicleInput.number}
                  onChangeText={(v) => setVehicleInput((s) => ({ ...s, number: v.toUpperCase() }))}
                  placeholder="E.g. UP 80 AB 1234"
                  placeholderTextColor={tw.gray200}
                  autoCapitalize="characters"
                  radius={0}
                  borderWidth={0}
                  style={[styles.vInput, styles.vInputText]}
                  accessibilityLabel="Vehicle Number"
                />
              </View>
            </View>
          </View>

          <Press onPress={saveVehicle} accessibilityLabel="Save Changes" style={[styles.bigBtn, { backgroundColor: '#000' }, shadow('xl')]}>
            <Text style={styles.bigBtnText}>Save Changes</Text>
          </Press>
        </View>
      </BottomPopup>

      {/* Bank Details Modal (Expanded with UPI) */}
      <BottomPopup
        isOpen={showBankDetailsPopup}
        onClose={() => setShowBankDetailsPopup(false)}
        title="Bank & Payments"
        maxHeight="85vh"
        closeOnHandleClick
        showCloseButton={false}
      >
        <View style={{ gap: 20, paddingBottom: 40 }}>
          <View style={{ gap: 16 }}>
            {BANK_FIELDS.map((field) => (
              <View key={field.key} style={[styles.fieldCard, shadow('card')]}>
                <View style={styles.fieldLabelRow}>
                  <field.icon size={14} color={tw.gray400} />
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                </View>
                <ThemedInput
                  value={bankDetails[field.key]}
                  onChangeText={(text) => {
                    let val = text;
                    if (field.isNumeric) val = val.replace(/\D/g, '');
                    if (field.maxLength && val.length > field.maxLength) return;
                    if (field.format) val = field.format(val);
                    setBankDetails((b) => ({ ...b, [field.key]: val }));
                  }}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  keyboardType={field.isNumeric ? 'number-pad' : 'default'}
                  autoCapitalize={field.format ? 'characters' : 'sentences'}
                  radius={0}
                  borderWidth={0}
                  style={styles.fieldInput}
                  accessibilityLabel={field.label}
                />
              </View>
            ))}

            {/* UPI Scanner Upload */}
            <View style={[styles.qrCard, shadow('card')]}>
              <Text style={styles.qrTitle}>UPI Payment QR Scanner</Text>

              {upiQrPreview || bankDetails.upiQrCode ? (
                <View>
                  <Image source={{ uri: upiQrPreview || mediaUrl(bankDetails.upiQrCode) }} resizeMode="cover" style={[styles.qrImg, shadow('xl')]} />
                  <Press
                    onPress={() => {
                      setUpiQrFile(null);
                      setUpiQrPreview(null);
                    }}
                    accessibilityLabel="Remove QR"
                    style={[styles.qrRemove, shadow('lg')]}
                  >
                    <X size={14} color="#fff" />
                  </Press>
                </View>
              ) : (
                <View style={{ width: '100%', flexDirection: 'row', gap: 12 }}>
                  <Press onPress={() => handleTakeCameraPhoto('upiQrCode')} scale={1} accessibilityLabel="Camera" style={styles.qrPick}>
                    <Camera size={24} color={PURPLE300} />
                    <Text style={styles.qrPickText}>Camera</Text>
                  </Press>
                  <Press onPress={() => handlePickFromGallery('upiQrCode')} scale={1} accessibilityLabel="Gallery" style={styles.qrPick}>
                    <ImageIcon size={24} color={PURPLE300} />
                    <Text style={styles.qrPickText}>Gallery</Text>
                  </Press>
                </View>
              )}
              <Text style={styles.qrHelp}>Upload your UPI QR code from Google Pay, PhonePe, etc. to receive easy payouts.</Text>
            </View>
          </View>

          <Press
            onPress={submitBankDetails}
            disabled={isUpdatingBankDetails}
            accessibilityLabel="Update Systems"
            style={[styles.bigBtn, { backgroundColor: tw.primary, flexDirection: 'row', gap: 12 }, shadow('xl'), isUpdatingBankDetails && { opacity: 0.5 }]}
          >
            {isUpdatingBankDetails ? (
              <>
                <Spinner size={20} color="#fff" />
                <Text style={styles.bigBtnText}>saving...</Text>
              </>
            ) : (
              <Text style={styles.bigBtnText}>Update Systems</Text>
            )}
          </Press>
        </View>
      </BottomPopup>

      {/* Fullscreen Document Viewer */}
      <Modal visible={Boolean(showDocumentModal && selectedDocument)} transparent animationType="fade" onRequestClose={() => setShowDocumentModal(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={[styles.viewer, { paddingTop: 17.6 + insets.top, paddingBottom: 17.6 + insets.bottom }]}>
          <View style={styles.viewerHead}>
            <Text style={styles.viewerTitle}>{selectedDocument?.name}</Text>
            <Press onPress={() => setShowDocumentModal(false)} accessibilityLabel="Close" style={[styles.viewerClose, shadow('card')]}>
              <X size={24} color="#fff" />
            </Press>
          </View>
          <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            {selectedDocument ? <Image source={{ uri: mediaUrl(selectedDocument.url) }} resizeMode="contain" style={styles.viewerImg} /> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FDFEFE' },
  loadingPage: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, lineHeight: 20, color: tw.gray400, textTransform: 'uppercase', letterSpacing: 1.4, ...ff(700) },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
    backgroundColor: 'rgba(255,255,255,0.8)', borderBottomWidth: 1, borderBottomColor: tw.gray100,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTitle: { fontSize: 18, lineHeight: 18, color: '#000', textTransform: 'uppercase', ...display(900, 18) },
  idBadge: { backgroundColor: tw.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, boxShadow: '0 10px 15px -3px rgba(10,77,43,0.35), 0 4px 6px -4px rgba(10,77,43,0.35)' },
  idBadgeText: { fontSize: 10, lineHeight: 15, color: '#fff', textTransform: 'uppercase', ...display(900, 10) },

  content: { width: '100%', maxWidth: 512, alignSelf: 'center', paddingHorizontal: 16, gap: 24 },

  avatar: { width: 128, height: 128, borderRadius: 40, backgroundColor: tw.gray100, borderWidth: 2, borderColor: '#fff', alignSelf: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarBusy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  avatarActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8, transform: [{ translateY: 26 }] },
  avatarBtn: { padding: 12, borderRadius: 16, borderWidth: 4, borderColor: CARD_BORDER, alignItems: 'center', justifyContent: 'center' },

  name: { fontSize: 24, lineHeight: 24, color: tw.gray900, ...display(900, 24) },
  subtitle: { fontSize: 11, lineHeight: 16.5, color: tw.gray400, textTransform: 'uppercase', letterSpacing: 2.2, marginTop: 8, marginBottom: 16, ...ff(700) },
  pillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER },
  pillText: { fontSize: 12, lineHeight: 16, textTransform: 'uppercase', ...display(900, 12) },

  stat: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: CARD_BORDER, padding: 16, borderRadius: 24, alignItems: 'center' },
  statLabel: { fontSize: 9, lineHeight: 13.5, color: tw.gray400, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 4, textAlign: 'center', ...ff(700) },
  statValue: { fontSize: 20, lineHeight: 28, color: tw.gray900, textAlign: 'center', ...display(900, 20) },

  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  sectionTitleText: { fontSize: 12, lineHeight: 16, color: tw.gray950, textTransform: 'uppercase', ...display(900, 12) },
  bankHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  editDetails: { fontSize: 10, lineHeight: 15, color: tw.primary, textTransform: 'uppercase', marginRight: 4, ...display(900, 10) },

  infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 1 },
  infoIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: tw.primarySoft, borderWidth: 1, borderColor: tw.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, textTransform: 'uppercase', marginBottom: 2, ...display(900, 10) },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  infoValue: { fontSize: 14, lineHeight: 20, color: tw.gray900, flexShrink: 1, ...display(700, 14) },
  missing: { backgroundColor: tw.red50, paddingHorizontal: 6, borderRadius: 4 },
  missingText: { fontSize: 9, lineHeight: 13.5, color: tw.red500, textTransform: 'uppercase', ...ff(700) },

  bankCard: { borderRadius: 24, padding: 17.6, overflow: 'hidden' },
  bankTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
  bankKicker: { fontSize: 9, lineHeight: 13.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4, ...display(900, 9) },
  bankName: { fontSize: 18, lineHeight: 28, color: '#fff', ...display(700, 18) },
  bankBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bankNumber: { fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.6)', letterSpacing: 2.4, fontFamily: 'monospace', fontWeight: '500' },
  bankHolder: { fontSize: 10, lineHeight: 15, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, ...ff(700) },
  ifscLabel: { fontSize: 9, lineHeight: 13.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4, ...display(900, 9) },
  ifsc: { fontSize: 14, lineHeight: 20, color: '#fff', ...display(900, 14) },

  upiCard: { backgroundColor: '#fff', borderRadius: 24, padding: 17.6, borderWidth: 1, borderColor: CARD_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upiIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: tw.purple50, borderWidth: 1, borderColor: CARD_BORDER, alignItems: 'center', justifyContent: 'center' },
  upiLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, textTransform: 'uppercase', marginBottom: 4, ...display(900, 10) },
  upiValue: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...display(900, 16) },
  qrBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: tw.gray50, borderWidth: 1, borderColor: CARD_BORDER, alignItems: 'center', justifyContent: 'center' },

  docCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docIcon: { width: 40, height: 40, backgroundColor: tw.gray50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, textTransform: 'uppercase', ...display(900, 10) },
  docStatus: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...ff(700) },
  docNumber: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, marginTop: 2, ...ff(600) },

  delIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  delTitle: { fontSize: 20, lineHeight: 28, color: tw.gray950, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center', ...display(900, 20) },
  delText: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginBottom: 32, maxWidth: 200, textAlign: 'center', ...ff(500) },
  delBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minHeight: 49 },
  delBtnText: { fontSize: 11, lineHeight: 16.5, textTransform: 'uppercase', ...display(900, 11) },

  vehicleCard: { backgroundColor: tw.gray50, padding: 17.6, borderRadius: 24, borderWidth: 1, borderColor: CARD_BORDER, gap: 16, ...shadow('card') },
  vRow: { flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%' },
  vIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  vLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, textTransform: 'uppercase', marginBottom: 4, ...display(900, 10) },
  vSelect: { backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#E8DEE7' },
  vInput: { borderBottomWidth: 2, borderBottomColor: '#E8DEE7', padding: 0, height: 30 },
  vInputText: { fontSize: 18, lineHeight: 28, color: '#1F1F24', ...display(900, 18) },
  divider: { height: 1, backgroundColor: tw.gray200, width: '100%' },
  bigBtn: { width: '100%', paddingVertical: 20, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bigBtnText: { fontSize: 16, lineHeight: 24, color: '#fff', textTransform: 'uppercase', ...display(900, 16) },

  fieldCard: { backgroundColor: 'rgba(249,250,251,0.5)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, textTransform: 'uppercase', ...display(900, 10) },
  fieldInput: { padding: 0, height: 20, fontSize: 14, lineHeight: 20, color: '#1F1F24', ...ff(700) },

  qrCard: { backgroundColor: tw.purple50, padding: 17.6, borderRadius: 24, borderWidth: 1, borderColor: CARD_BORDER, alignItems: 'center', gap: 16 },
  qrTitle: { fontSize: 10, lineHeight: 15, color: tw.purple600, textTransform: 'uppercase', textAlign: 'center', ...display(900, 10) },
  qrImg: { width: 128, height: 128, borderRadius: 12, borderWidth: 4, borderColor: '#fff' },
  qrRemove: { position: 'absolute', top: -12, right: -12, backgroundColor: tw.red500, padding: 6, borderRadius: 999 },
  qrPick: { flex: 1, aspectRatio: 1, borderRadius: 24, backgroundColor: tw.gray50, borderWidth: 2, borderStyle: 'dashed', borderColor: CARD_BORDER, alignItems: 'center', justifyContent: 'center', gap: 8 },
  qrPickText: { fontSize: 8, lineHeight: 12, color: PURPLE400, textTransform: 'uppercase', ...display(900, 8) },
  qrHelp: { fontSize: 9, lineHeight: 13.5, color: PURPLE400, textAlign: 'center', ...ff(500) },

  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', paddingHorizontal: 17.6 },
  viewerHead: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  viewerTitle: { flexShrink: 1, fontSize: 18, lineHeight: 28, color: '#fff', textTransform: 'uppercase', ...display(900, 18) },
  viewerClose: { padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  viewerImg: { width: '100%', height: '100%', borderRadius: 24 },
});
