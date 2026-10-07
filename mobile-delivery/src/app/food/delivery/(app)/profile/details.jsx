import { useEffect, useRef, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle, Banknote, Bike, Camera, Car, CheckCircle, Edit2, Eye, FileText,
  Image as ImageIcon, MapPin, QrCode, Shield, Smartphone, Truck, User, X,
} from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { mediaUrl } from '../../../../../api/client';
import BottomPopup from '../../../../../components/delivery/BottomPopup';
import { Button, Card, IconButton, ScreenHeader, SectionHeader, StatusBadge } from '../../../../../components/ds';
import { SelectField } from '../../../../../components/kit';
import { Spinner } from '../../../../../components/Loader';
import { Press, ThemedInput } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { showUserFacingApiError } from '../../../../../lib/apiError';
import { openCamera, openGallery, prepareUploadFile } from '../../../../../lib/images';
import { toast } from '../../../../../lib/notify';
import { color, radii, space, touch, type as typo } from '../../../../../theme';

/*
 * Profile details: photo, rider stats, vehicle, bank & UPI, and the
 * verification documents. Edits happen in bottom sheets (BottomPopup lifts
 * itself above the keyboard). The web's Flutter bridge / <input type=file>
 * become expo-image-picker.
 */

const AVATAR = require('../../../../../../assets/images/profile_avatar.webp');
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

const statusTone = (status) => {
  const s = String(status || '').toLowerCase();
  if (['approved', 'active', 'verified'].includes(s)) return 'success';
  if (['rejected', 'blocked', 'suspended', 'inactive'].includes(s)) return 'danger';
  return 'warning';
};

const sentence = (s) => {
  const str = String(s || '');
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
};

// "Account Holder" -> "Account holder", keeping acronyms (IFSC, PAN, UPI, ID).
const sentenceLabel = (label) =>
  String(label)
    .split(' ')
    .map((w, i) => (i === 0 || /^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase()))
    .join(' ');

const docTone = (label) => (label === 'Verified' ? 'success' : label === 'Not uploaded' ? 'neutral' : 'warning');

function SectionTitle({ children, action, onAction }) {
  return <SectionHeader title={children} action={action} onAction={onAction} style={{ marginTop: space.md }} />;
}

function FieldLabel({ icon: Icon, children }) {
  return (
    <View style={styles.fieldLabelRow}>
      {Icon ? <Icon size={16} color={color.textMuted} /> : null}
      <Text style={styles.fieldLabel}>{children}</Text>
    </View>
  );
}

function LoadingScreen({ onBack }) {
  return (
    <View style={styles.page}>
      <ScreenHeader title="Profile" onBack={onBack} />
      <View style={styles.loadingPage} accessibilityLabel="Loading profile">
        <Spinner size={28} color={color.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
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


  if (loading) return <LoadingScreen onBack={goBack} />;

  const docs = [
    { icon: FileText, label: 'Aadhar Card', doc: profile?.documents?.aadhar },
    { icon: FileText, label: 'PAN Card', doc: profile?.documents?.pan },
    { icon: Truck, label: 'Driving License', doc: profile?.documents?.drivingLicense, number: getDrivingLicenseNumber() },
  ];
  const vehicleSelectValue = VEHICLE_OPTIONS.some((o) => o.value === vehicleInput.type) ? vehicleInput.type : 'bike';
  const vehicleSummary = [sentence(profile?.vehicle?.type), profile?.vehicle?.brand, vehicleNumber ? String(vehicleNumber).toUpperCase() : '']
    .filter(Boolean)
    .join(' • ');
  const city = profile?.location?.city;

  return (
    <View style={styles.page}>
      <ScreenHeader title="Profile" subtitle={`ID: ${profile?.deliveryId || '...'}`} onBack={goBack} />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.xxxl + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {/* ─── PROFILE AVATAR BLOCK ─── */}
        <Card style={styles.hero}>
          <View style={styles.avatar}>
            <Image source={profileImageUrl ? { uri: mediaUrl(profileImageUrl) } : AVATAR} resizeMode="cover" style={styles.avatarImg} accessibilityIgnoresInvertColors />
            {isUploadingImage ? (
              <View style={styles.avatarBusy} accessibilityLabel="Uploading photo">
                <Spinner size={24} color={color.textInverse} />
              </View>
            ) : null}
          </View>

          <View style={styles.avatarActions}>
            <Button title="Camera" icon={Camera} variant="secondary" size="sm" fullWidth={false} onPress={() => handleTakeCameraPhoto('profilePhoto')} accessibilityLabel="Take Photo" style={styles.avatarBtn} />
            <Button title="Gallery" icon={ImageIcon} variant="secondary" size="sm" fullWidth={false} onPress={() => handlePickFromGallery('profilePhoto')} accessibilityLabel="Gallery" style={styles.avatarBtn} />
            {profileImageUrl ? (
              <Button title="Remove" icon={X} variant="dangerSoft" size="sm" fullWidth={false} onPress={() => setShowDeletePopup(true)} accessibilityLabel="Remove" style={styles.avatarBtn} />
            ) : null}
          </View>

          <View style={styles.heroText}>
            <Text style={styles.name} numberOfLines={2}>
              {profile?.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Delivery Partner{city ? ` • ${city}` : ''}
            </Text>
          </View>

          <View style={styles.pillRow}>
            <StatusBadge
              icon={CheckCircle}
              tone={isAdminApproved ? 'success' : statusTone(profile?.status)}
              label={isAdminApproved ? 'Approved' : sentence(profile?.status) || 'Pending'}
            />
            {profile?.phone ? <StatusBadge icon={Smartphone} tone="neutral" label={profile.phone} /> : null}
          </View>
        </Card>

        {/* ─── RIDER STATS ─── */}
        <View style={styles.statRow}>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Rider level</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {riderLevel}
            </Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {ratingDisplay}
            </Text>
          </Card>
        </View>

        {/* ─── VEHICLE SECTION ─── */}
        <SectionTitle>Vehicle</SectionTitle>
        <Card style={styles.row}>
          <View style={styles.iconTile}>
            <VehicleGlyph type={profile?.vehicle?.type} size={22} color={color.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Vehicle details</Text>
            <Text style={styles.rowValue} numberOfLines={2}>
              {vehicleSummary || 'Not added'}
            </Text>
            {!vehicleNumber ? <StatusBadge tone="danger" label="Number missing" style={{ marginTop: space.xs }} /> : null}
          </View>
          <IconButton
            icon={Edit2}
            label="Edit Vehicle Details"
            variant="soft"
            iconSize={18}
            onPress={() => {
              setVehicleInput({ number: vehicleNumber, brand: vehicleBrand, type: vehicleType });
              setShowVehiclePopup(true);
            }}
          />
        </Card>

        {/* ─── BANK & PAYMENTS SECTION ─── */}
        <SectionTitle
          action="Edit details"
          onAction={() => {
            // Reset state to current profile data when opening
            setBankDetails(bankFromProfile(profile));
            setUpiQrFile(null);
            setUpiQrPreview(null);
            setShowBankDetailsPopup(true);
          }}
        >
          Bank & payments
        </SectionTitle>
        <Card>
          <View style={styles.bankTop}>
            <View style={styles.iconTile}>
              <Banknote size={22} color={color.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Bank account</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {bankDetails.bankName || 'No bank account linked'}
              </Text>
            </View>
          </View>
          <View style={styles.bankGrid}>
            <View style={styles.bankCell}>
              <Text style={styles.rowLabel}>Account number</Text>
              <Text style={styles.mono} numberOfLines={1}>
                {bankDetails.accountNumber ? `•••• ${bankDetails.accountNumber.slice(-4)}` : '—'}
              </Text>
            </View>
            <View style={styles.bankCell}>
              <Text style={styles.rowLabel}>IFSC code</Text>
              <Text style={styles.mono} numberOfLines={1}>
                {bankDetails.ifscCode || '—'}
              </Text>
            </View>
          </View>
          <View style={styles.bankHolder}>
            <Text style={styles.rowLabel}>Account holder</Text>
            <Text style={styles.rowValueSm} numberOfLines={1}>
              {bankDetails.accountHolderName || '—'}
            </Text>
          </View>
        </Card>

        {/* UPI Section */}
        <Card style={styles.row}>
          <View style={styles.iconTile}>
            <Smartphone size={22} color={color.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>UPI ID</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {bankDetails.upiId || 'Not added'}
            </Text>
          </View>
          {bankDetails.upiQrCode ? (
            <IconButton
              icon={QrCode}
              label="View UPI QR"
              variant="soft"
              onPress={() => {
                setSelectedDocument({ name: 'UPI Scanner', url: bankDetails.upiQrCode });
                setShowDocumentModal(true);
              }}
            />
          ) : null}
        </Card>

        {/* ─── DOCUMENTS SECTION ─── */}
        <SectionTitle>Verification documents</SectionTitle>
        <Card padded={false}>
          {docs.map((item, i) => {
            const status = getDocumentVerificationLabel(item.doc);
            return (
              <View key={item.label} style={[styles.docRow, i < docs.length - 1 && styles.docDivider]}>
                <View style={[styles.iconTile, { backgroundColor: color.surfaceMuted }]}>
                  <item.icon size={20} color={color.textSecondary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowValue} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={styles.docNumber} numberOfLines={1}>
                    {item.number || getDocumentNumber(item.doc) || 'Number not added'}
                  </Text>
                  <StatusBadge tone={docTone(status)} label={status} style={{ marginTop: space.xs }} />
                </View>
                {item.doc?.document ? (
                  <IconButton
                    icon={Eye}
                    label={`View ${item.label}`}
                    variant="soft"
                    iconSize={20}
                    onPress={() => {
                      setSelectedDocument({ name: item.label, url: item.doc.document });
                      setShowDocumentModal(true);
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </Card>
      </ScrollView>

      {/* ─── MODALS ─── */}

      {/* Delete Confirmation Popup */}
      <BottomPopup isOpen={showDeletePopup} onClose={() => setShowDeletePopup(false)} title="Remove photo?" showCloseButton={false}>
        <View style={styles.sheetCenter}>
          <View style={styles.delIcon}>
            <AlertCircle size={32} color={color.danger} />
          </View>
          <Text style={styles.delTitle}>Are you sure?</Text>
          <Text style={styles.delText}>This will remove your current profile picture.</Text>
          <View style={styles.btnRow}>
            <Button title="Cancel" variant="outline" onPress={() => setShowDeletePopup(false)} style={styles.flex1} />
            <Button title="Yes, remove" variant="danger" onPress={handleDeletePhoto} disabled={isDeletingImage} loading={isDeletingImage} accessibilityLabel="Yes, Remove" style={styles.flex1} />
          </View>
        </View>
      </BottomPopup>

      {/* Vehicle Popup */}
      <BottomPopup isOpen={showVehiclePopup} onClose={() => setShowVehiclePopup(false)} title="Vehicle info" closeOnHandleClick showCloseButton={false}>
        <View style={styles.sheetBody}>
          <View style={styles.field}>
            <FieldLabel icon={({ size, color: c }) => <VehicleGlyph type={vehicleInput.type} withBike={false} size={size} color={c} />}>Vehicle type</FieldLabel>
            <SelectField
              value={vehicleSelectValue}
              options={VEHICLE_OPTIONS}
              onChange={(v) => setVehicleInput((s) => ({ ...s, type: v }))}
              accessibilityLabel="Vehicle Type"
              chevronColor={color.textSecondary}
              style={styles.select}
              textStyle={styles.inputText}
            />
          </View>

          <View style={styles.field}>
            <FieldLabel>Vehicle name / brand</FieldLabel>
            <ThemedInput
              value={vehicleInput.brand}
              onChangeText={(v) => setVehicleInput((s) => ({ ...s, brand: v }))}
              placeholder="E.g. Honda Splendor"
              placeholderTextColor={color.textDisabled}
              radius={radii.md}
              borderWidth={1.5}
              style={styles.input}
              accessibilityLabel="Vehicle Name/Brand"
            />
          </View>

          <View style={styles.field}>
            <FieldLabel>Vehicle number</FieldLabel>
            <ThemedInput
              value={vehicleInput.number}
              onChangeText={(v) => setVehicleInput((s) => ({ ...s, number: v.toUpperCase() }))}
              placeholder="E.g. UP 80 AB 1234"
              placeholderTextColor={color.textDisabled}
              autoCapitalize="characters"
              radius={radii.md}
              borderWidth={1.5}
              style={styles.input}
              accessibilityLabel="Vehicle Number"
            />
          </View>

          <Button title="Save changes" size="lg" onPress={saveVehicle} accessibilityLabel="Save Changes" style={{ marginTop: space.sm }} />
        </View>
      </BottomPopup>

      {/* Bank Details Modal (Expanded with UPI) */}
      <BottomPopup
        isOpen={showBankDetailsPopup}
        onClose={() => setShowBankDetailsPopup(false)}
        title="Bank & payments"
        maxHeight="85vh"
        closeOnHandleClick
        showCloseButton={false}
      >
        <View style={styles.sheetBody}>
          {BANK_FIELDS.map((field) => (
            <View key={field.key} style={styles.field}>
              <FieldLabel icon={field.icon}>{sentenceLabel(field.label)}</FieldLabel>
              <ThemedInput
                value={bankDetails[field.key]}
                onChangeText={(text) => {
                  let val = text;
                  if (field.isNumeric) val = val.replace(/\D/g, '');
                  if (field.maxLength && val.length > field.maxLength) return;
                  if (field.format) val = field.format(val);
                  setBankDetails((b) => ({ ...b, [field.key]: val }));
                }}
                placeholder={`Enter ${sentenceLabel(field.label).replace(/^[A-Z][a-z]/, (m) => m.toLowerCase())}`}
                placeholderTextColor={color.textDisabled}
                keyboardType={field.isNumeric ? 'number-pad' : 'default'}
                autoCapitalize={field.format ? 'characters' : 'sentences'}
                radius={radii.md}
                borderWidth={1.5}
                style={styles.input}
                accessibilityLabel={field.label}
              />
            </View>
          ))}

          {/* UPI Scanner Upload */}
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>UPI payment QR</Text>

            {upiQrPreview || bankDetails.upiQrCode ? (
              <View style={styles.qrWrap}>
                <Image source={{ uri: upiQrPreview || mediaUrl(bankDetails.upiQrCode) }} resizeMode="cover" style={styles.qrImg} accessibilityLabel="UPI QR code" />
                <IconButton
                  icon={X}
                  label="Remove QR"
                  variant="danger"
                  size={36}
                  iconSize={18}
                  onPress={() => {
                    setUpiQrFile(null);
                    setUpiQrPreview(null);
                  }}
                  style={styles.qrRemove}
                />
              </View>
            ) : (
              <View style={styles.qrPickRow}>
                <Press onPress={() => handleTakeCameraPhoto('upiQrCode')} scale={0.98} accessibilityLabel="Camera" style={styles.qrPick}>
                  <Camera size={24} color={color.primary} />
                  <Text style={styles.qrPickText}>Camera</Text>
                </Press>
                <Press onPress={() => handlePickFromGallery('upiQrCode')} scale={0.98} accessibilityLabel="Gallery" style={styles.qrPick}>
                  <ImageIcon size={24} color={color.primary} />
                  <Text style={styles.qrPickText}>Gallery</Text>
                </Press>
              </View>
            )}
            <Text style={styles.qrHelp}>Upload your UPI QR code from Google Pay, PhonePe, etc. to receive easy payouts.</Text>
          </View>

          <Button
            title={isUpdatingBankDetails ? 'Saving...' : 'Save bank details'}
            size="lg"
            onPress={submitBankDetails}
            disabled={isUpdatingBankDetails}
            loading={isUpdatingBankDetails}
            accessibilityLabel="Update Systems"
            style={{ marginTop: space.sm }}
          />
        </View>
      </BottomPopup>

      {/* Fullscreen Document Viewer */}
      <Modal visible={Boolean(showDocumentModal && selectedDocument)} transparent animationType="fade" onRequestClose={() => setShowDocumentModal(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={[styles.viewer, { paddingTop: space.lg + insets.top, paddingBottom: space.lg + insets.bottom }]}>
          <View style={styles.viewerHead}>
            <Text style={styles.viewerTitle} numberOfLines={1}>
              {selectedDocument?.name}
            </Text>
            <IconButton icon={X} label="Close" variant="inverse" onPress={() => setShowDocumentModal(false)} />
          </View>
          <View style={styles.viewerBody}>
            {selectedDocument ? <Image source={{ uri: mediaUrl(selectedDocument.url) }} resizeMode="contain" style={styles.viewerImg} /> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  loadingPage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  loadingText: { ...typo.body, color: color.textSecondary },

  scroll: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: space.lg, gap: space.md },

  hero: { alignItems: 'center', gap: space.md },
  avatar: { width: 112, height: 112, borderRadius: radii.xl, backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarBusy: { ...StyleSheet.absoluteFill, backgroundColor: color.overlay, alignItems: 'center', justifyContent: 'center' },
  avatarActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  avatarBtn: { height: 40 },
  heroText: { alignItems: 'center', gap: space.xxs, alignSelf: 'stretch' },
  name: { ...typo.title, color: color.text, textAlign: 'center' },
  subtitle: { ...typo.small, color: color.textMuted, textAlign: 'center' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: space.sm },

  statRow: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, alignItems: 'center', gap: space.xxs },
  statLabel: { ...typo.caption, color: color.textMuted, textAlign: 'center' },
  statValue: { ...typo.heading, color: color.text, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconTile: { width: touch, height: touch, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: space.xxs },
  rowLabel: { ...typo.caption, color: color.textMuted },
  rowValue: { ...typo.bodyStrong, color: color.text },
  rowValueSm: { ...typo.body, color: color.text },

  bankTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bankGrid: { flexDirection: 'row', gap: space.md, marginTop: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  bankCell: { flex: 1, minWidth: 0, gap: space.xxs },
  bankHolder: { marginTop: space.md, gap: space.xxs },
  mono: { ...typo.bodyStrong, color: color.text, letterSpacing: 1 },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  docDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  docNumber: { ...typo.small, color: color.textMuted },

  sheetCenter: { alignItems: 'center', paddingHorizontal: space.xs, paddingTop: space.lg, paddingBottom: space.xl },
  sheetBody: { gap: space.lg, paddingHorizontal: space.xs, paddingTop: space.xs, paddingBottom: space.xl },
  delIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  delTitle: { ...typo.heading, color: color.text, textAlign: 'center' },
  delText: { ...typo.body, color: color.textSecondary, textAlign: 'center', marginTop: space.xs, marginBottom: space.xxl },
  btnRow: { flexDirection: 'row', gap: space.md, alignSelf: 'stretch' },
  flex1: { flex: 1 },

  field: { gap: space.sm },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fieldLabel: { ...typo.label, color: color.text },
  input: { height: touch, paddingHorizontal: space.lg, ...typo.body, color: color.text },
  select: { height: touch, paddingHorizontal: space.lg, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.borderStrong, backgroundColor: color.surface, gap: space.sm },
  inputText: { ...typo.body, color: color.text },

  qrCard: { backgroundColor: color.surfaceMuted, padding: space.lg, borderRadius: radii.lg, alignItems: 'center', gap: space.md },
  qrTitle: { ...typo.label, color: color.text, textAlign: 'center' },
  qrWrap: { padding: space.sm },
  qrImg: { width: 144, height: 144, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  qrRemove: { position: 'absolute', top: -space.xs, right: -space.xs },
  qrPickRow: { width: '100%', flexDirection: 'row', gap: space.md },
  qrPick: { flex: 1, height: 96, borderRadius: radii.md, backgroundColor: color.surface, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  qrPickText: { ...typo.label, color: color.primary },
  qrHelp: { ...typo.small, color: color.textMuted, textAlign: 'center' },

  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingHorizontal: space.lg },
  viewerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, marginBottom: space.xxl },
  viewerTitle: { flex: 1, minWidth: 0, ...typo.heading, color: color.textInverse },
  viewerBody: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '100%', borderRadius: radii.lg },
});
