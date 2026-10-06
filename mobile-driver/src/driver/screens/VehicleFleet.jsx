import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bike, Camera, Car, CheckCircle2, Edit3, ImagePlus, Save, Truck, X } from 'lucide-react-native';
import Img from '../../components/Img';
import { BottomSheet } from '../../components/kit';
import { Spinner } from '../../components/Loader';
import { Press } from '../../components/ui';
import { localStore, sessionStore } from '../../lib/storage';
import { useKeyboardHeight } from '../../lib/useKeyboard';
import { useNavigate } from '../../lib/webRouter';
import { outfit, shadow, tw } from '../../theme';
import DriverBottomNav from '../components/DriverBottomNav';
import { useDriverImageUpload } from '../hooks/useDriverImageUpload';
import {
  getCurrentDriver,
  getDriverVehicleTypes,
  updateDriverVehicle,
} from '../services/registrationService';

const CarIcon = require('../../../assets/taxi/icons/car.png');
const BikeIcon = require('../../../assets/taxi/icons/bike.png');
const AutoIcon = require('../../../assets/taxi/icons/auto.png');
const TruckIcon = require('../../../assets/taxi/icons/truck.png');
const EhcvIcon = require('../../../assets/taxi/icons/ehcv.png');
const HcvIcon = require('../../../assets/taxi/icons/hcv.png');
const LcvIcon = require('../../../assets/taxi/icons/LCV.png');
const McvIcon = require('../../../assets/taxi/icons/mcv.png');
const LuxuryIcon = require('../../../assets/taxi/icons/Luxury.png');
const PremiumIcon = require('../../../assets/taxi/icons/Premium.png');
const SuvIcon = require('../../../assets/taxi/icons/SUV.png');
const ScootyIcon = require('../../../assets/taxi/icons/scooty.png');
const HatchbackIcon = require('../../../assets/taxi/icons/Hatchback.png');
const BusIcon = require('../../../assets/taxi/icons/bus.png');
const MiniBusIcon = require('../../../assets/taxi/icons/mini_bus.png');

const unwrap = (response) => response?.data?.data || response?.data || response;
const VEHICLE_FLEET_DRAFT_KEY = 'driver_vehicle_fleet_draft';
const VEHICLE_FLEET_EDITING_KEY = 'driver_vehicle_fleet_editing';
const DRIVER_VEHICLE_REAPPROVAL_PENDING_KEY = 'driver_vehicle_reapproval_pending';

const iconMap = {
  car: CarIcon,
  bike: BikeIcon,
  auto: AutoIcon,
  truck: TruckIcon,
  ehcb: EhcvIcon,
  HCV: HcvIcon,
  LCV: LcvIcon,
  MCV: McvIcon,
  Luxary: LuxuryIcon,
  premium: PremiumIcon,
  suv: SuvIcon,
  scooty: ScootyIcon,
  car_5_seater: HatchbackIcon,
  car_7_seater: SuvIcon,
  bus: BusIcon,
  mini_bus: MiniBusIcon,
};

const ICON_TYPE_ALIASES = {
  motor_bike: 'bike',
  motorbike: 'bike',
  hcv: 'HCV',
  lcv: 'LCV',
  mcv: 'MCV',
  luxary: 'Luxary',
  luxury: 'Luxary',
  mini_truck: 'truck',
  scooty: 'scooty',
  'car 5 seater': 'car_5_seater',
  'car 7 seater': 'car_7_seater',
  bus: 'bus',
  'mini bus': 'mini_bus',
};

const getVehicleTypes = (response) => {
  const data = unwrap(response);
  return data?.vehicle_types || data?.results || data?.data?.results || (Array.isArray(data) ? data : []);
};

const getTypeLabel = (type) => type?.name || type?.vehicle_type || type?.label || 'Vehicle';

const normalizeIconType = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return 'car';
  const lower = raw.toLowerCase();
  if (ICON_TYPE_ALIASES[lower]) return ICON_TYPE_ALIASES[lower];
  const exactKey = Object.keys(iconMap).find((key) => key.toLowerCase() === lower);
  return exactKey || 'car';
};

const getVehicleTypeImage = (type = {}) => (
  type?.image
  || type?.icon
  || type?.map_icon
  || iconMap[normalizeIconType(type?.icon_types || type?.icon_types_for || type?.name)]
  || CarIcon
);

// <img src>: an API image is a URL string, a bundled icon is a module id.
const toSource = (image) => (typeof image === 'string' ? { uri: image } : image);

const getDriverVehicleTypeId = (driver) => {
  if (!driver?.vehicleTypeId) {
    return '';
  }

  return String(driver.vehicleTypeId?._id || driver.vehicleTypeId);
};

const iconKind = (iconType = '') => {
  const value = String(iconType).toLowerCase();

  if (value.includes('bike')) {
    return 'bike';
  }

  if (value.includes('truck') || value.includes('hcv') || value.includes('lcv') || value.includes('mcv')) {
    return 'truck';
  }

  return 'car';
};

// lucide icon for a vehicle icon type (the web's iconFor(...) used as a component)
function VehicleGlyph({ iconType, size, color }) {
  const kind = iconKind(iconType);
  if (kind === 'bike') return <Bike size={size} color={color} />;
  if (kind === 'truck') return <Truck size={size} color={color} />;
  return <Car size={size} color={color} />;
}

const buildForm = (driver) => ({
  vehicleTypeId: getDriverVehicleTypeId(driver),
  vehicleMake: driver?.vehicleMake || '',
  vehicleModel: driver?.vehicleModel || '',
  vehicleNumber: driver?.vehicleNumber || '',
  vehicleColor: driver?.vehicleColor || '',
  vehicleImage: driver?.vehicleImage || '',
});

const buildComparableVehicleSnapshot = (value = {}) => ({
  vehicleTypeId: String(value?.vehicleTypeId || ''),
  vehicleMake: String(value?.vehicleMake || '').trim(),
  vehicleModel: String(value?.vehicleModel || '').trim(),
  vehicleNumber: String(value?.vehicleNumber || '').trim().toUpperCase(),
  vehicleColor: String(value?.vehicleColor || '').trim(),
  vehicleImage: String(value?.vehicleImage || '').trim(),
});

const readVehicleFleetDraft = () => {
  try {
    const raw = sessionStore.getItem(VEHICLE_FLEET_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const buildVisibleVehicleTypes = (allTypes, driver) => {
  const driverMode = String(driver?.registerFor || 'taxi').toLowerCase();
  const savedVehicleTypeId = getDriverVehicleTypeId(driver);

  const activeTypes = allTypes.filter((type) => {
    const isActive = type.active !== false && Number(type.status ?? 1) !== 0;
    const transportType = String(type.transport_type || type.is_taxi || 'taxi').toLowerCase();

    if (!isActive) {
      return false;
    }

    if (driverMode === 'both') {
      return true;
    }

    return transportType === driverMode || transportType === 'both' || transportType === 'all';
  });

  const activeMatchingTypes = activeTypes.length ? activeTypes : allTypes.filter((type) => type.active !== false && Number(type.status ?? 1) !== 0);

  if (!savedVehicleTypeId) {
    return activeMatchingTypes;
  }

  const savedType = allTypes.find((type) => String(type._id || type.id) === String(savedVehicleTypeId));

  if (!savedType) {
    return activeMatchingTypes;
  }

  const alreadyIncluded = activeMatchingTypes.some((type) => String(type._id || type.id) === String(savedVehicleTypeId));

  return alreadyIncluded ? activeMatchingTypes : [savedType, ...activeMatchingTypes];
};

// A bordered field that turns border-slate-400 while focused (`focus-within:border-slate-400`).
function VehicleField({ label, value, onChangeText, placeholder, style, inputStyle, autoCapitalize }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused ? { borderColor: tw.slate400 } : null, style]}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={tw.slate300}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
        style={[styles.fieldInput, inputStyle]}
      />
    </View>
  );
}

/** Port of Taxi/modules/driver/pages/settings/VehicleFleet.jsx (/taxi/driver/vehicle-fleet[/edit/:vehicleId]). */
export default function VehicleFleet() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboard = useKeyboardHeight();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [formData, setFormData] = useState(buildForm(null));
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [gridWidth, setGridWidth] = useState(0);
  const {
    uploading: imageUploading,
    preview: imagePreview,
    pickImage,
    setPreview: setVehicleImagePreview,
  } = useDriverImageUpload({
    folder: 'driver-vehicles',
    onSuccess: (url) => {
      setFormData((prev) => ({ ...prev, vehicleImage: url }));
    },
  });

  const selectedType = useMemo(() => {
    const selectedId = formData.vehicleTypeId || getDriverVehicleTypeId(driver);
    return vehicleTypes.find((type) => String(type._id || type.id) === String(selectedId));
  }, [driver, formData.vehicleTypeId, vehicleTypes]);

  const activeIconType = selectedType?.icon_types || driver?.vehicleIconType || driver?.vehicleType;
  const activeVehicleName = getTypeLabel(selectedType) || driver?.vehicleType || 'Vehicle';
  const vehicleModel = [driver?.vehicleMake, driver?.vehicleModel].filter(Boolean).join(' ') || activeVehicleName;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setMessage('');

      try {
        const [driverResponse, typeResponse] = await Promise.all([
          getCurrentDriver(),
          getDriverVehicleTypes(),
        ]);

        if (!active) {
          return;
        }

        const nextDriver = unwrap(driverResponse);
        const nextTypes = buildVisibleVehicleTypes(getVehicleTypes(typeResponse), nextDriver);

        const savedDraft = readVehicleFleetDraft();
        const wasEditing = sessionStore.getItem(VEHICLE_FLEET_EDITING_KEY) === 'true';

        setDriver(nextDriver);
        setVehicleTypes(nextTypes);
        setFormData(savedDraft ? { ...buildForm(nextDriver), ...savedDraft } : buildForm(nextDriver));
        setVehicleImagePreview(savedDraft?.vehicleImage || nextDriver?.vehicleImage || null);
        setIsEditing(wasEditing);
      } catch (error) {
        if (active) {
          setMessage(error.message || 'Could not load vehicle details.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sessionStore.setItem(VEHICLE_FLEET_DRAFT_KEY, JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    sessionStore.setItem(VEHICLE_FLEET_EDITING_KEY, isEditing ? 'true' : 'false');
  }, [isEditing]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      if (field === 'vehicleTypeId' && String(prev.vehicleTypeId) !== String(value)) {
        setVehicleImagePreview(null);
        return {
          vehicleTypeId: value,
          vehicleMake: '',
          vehicleModel: '',
          vehicleNumber: '',
          vehicleColor: '',
          vehicleImage: '',
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const openVehicleGalleryPicker = () => {
    if (imageUploading) {
      return;
    }

    pickImage('gallery');
  };

  const openVehicleCameraPicker = () => {
    if (imageUploading) {
      return;
    }

    pickImage('camera');
  };

  const handleSave = async () => {
    if (!formData.vehicleTypeId) {
      setMessage('Select a vehicle type first.');
      return;
    }

    const requiresReapproval =
      JSON.stringify(buildComparableVehicleSnapshot(buildForm(driver))) !==
      JSON.stringify(buildComparableVehicleSnapshot(formData));

    setIsSaving(true);
    setMessage('');

    try {
      const response = await updateDriverVehicle(formData);
      const nextDriver = unwrap(response);
      setDriver(nextDriver);
      setFormData(buildForm(nextDriver));
      setVehicleImagePreview(nextDriver?.vehicleImage || null);
      setIsEditing(false);
      if (nextDriver?.status === 'pending' || nextDriver?.approve === false || nextDriver?.vehicleApprovalRequested || requiresReapproval) {
        localStore.setItem(DRIVER_VEHICLE_REAPPROVAL_PENDING_KEY, 'true');
        setMessage(response?.data?.message || 'Vehicle updated and sent to admin for approval. Driver status is now pending.');
        sessionStore.removeItem(VEHICLE_FLEET_DRAFT_KEY);
        sessionStore.setItem(VEHICLE_FLEET_EDITING_KEY, 'false');
        navigate('/taxi/driver/registration-status', {
          replace: true,
          state: {
            role: 'driver',
            statusReason: 'vehicle-update',
          },
        });
        return;
      } else {
        localStore.removeItem(DRIVER_VEHICLE_REAPPROVAL_PENDING_KEY);
        setMessage(response?.data?.message || 'Vehicle updated successfully.');
      }
      sessionStore.removeItem(VEHICLE_FLEET_DRAFT_KEY);
      sessionStore.setItem(VEHICLE_FLEET_EDITING_KEY, 'false');
    } catch (error) {
      setMessage(error.message || 'Could not update vehicle.');
    } finally {
      setIsSaving(false);
    }
  };

  const cardWidth = gridWidth ? (gridWidth - 24) / 3 : undefined;
  const previewSrc = imagePreview || formData.vehicleImage;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fb' }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 56 + insets.top, paddingBottom: 128 + insets.bottom }}>
        <View style={styles.header}>
          <Press onPress={() => navigate('/taxi/driver/profile')} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={18} color={tw.slate900} />
          </Press>
          <Text style={styles.title} accessibilityRole="header">My Vehicle</Text>
        </View>

        {isLoading ? (
          <View style={{ minHeight: 420, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="progressbar" accessibilityLabel="Loading">
            <Spinner size={28} color={tw.slate400} />
          </View>
        ) : (
          <View style={{ gap: 24 }}>
            <View style={styles.hero}>
              <View style={{ gap: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <View style={{ gap: 6, minWidth: 0, flex: 1 }}>
                    <Text style={styles.heroKicker}>PRIMARY VEHICLE</Text>
                    <Text style={styles.heroTitle} numberOfLines={1}>{vehicleModel}</Text>
                    <Text style={styles.heroNumber} numberOfLines={1}>{String(driver?.vehicleNumber || 'Number not set').toUpperCase()}</Text>
                    <Text style={styles.heroMeta} numberOfLines={1}>{activeVehicleName} • {driver?.vehicleColor || 'Color not set'}</Text>
                  </View>
                  {driver?.vehicleImage ? (
                    <View style={styles.heroImage}>
                      <Img source={{ uri: driver.vehicleImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Vehicle" />
                    </View>
                  ) : (
                    <View style={styles.heroIcon}>
                      <VehicleGlyph iconType={activeIconType} size={26} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={styles.heroBadge}>
                  <CheckCircle2 size={15} color={tw.emerald400} />
                  <Text style={styles.heroBadgeText}>MAP ICON LINKED TO SELECTED TYPE</Text>
                </View>
              </View>
            </View>

            {message ? <Text style={styles.message}>{message.toUpperCase()}</Text> : null}

            <View style={{ gap: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                <Text style={styles.section}>CONFIGURATION</Text>
                <Press
                  scale={1}
                  onPress={() => {
                    setFormData(buildForm(driver));
                    setIsEditing(true);
                  }}
                  accessibilityLabel="Edit Details"
                  style={styles.edit}
                >
                  <Edit3 size={13} color={tw.blue600} />
                  <Text style={styles.editText}>Edit Details</Text>
                </Press>
              </View>

              <View style={styles.dispatch}>
                <Text style={styles.dispatchTitle}>DISPATCH MATCHING</Text>
                <Text style={styles.dispatchBody}>
                  Update the primary vehicle here if requests are not reaching this driver. The system uses the selected vehicle type exactly for job distribution.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <BottomSheet
        visible={isEditing}
        onClose={() => setIsEditing(false)}
        backdrop="rgba(15,23,43,0.5)"
        blur={8}
        spring={{ stiffness: 320, damping: 28 }}
        panelStyle={[styles.sheet, { maxHeight: height * 0.88 }]}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 40 + Math.max(keyboard, insets.bottom), gap: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.sheetKicker}>SETTINGS</Text>
              <Text style={styles.sheetTitle}>Vehicle Details</Text>
            </View>
            <Press scale={1} onPress={() => setIsEditing(false)} accessibilityLabel="Close" style={styles.sheetClose}>
              <X size={22} color={tw.slate500} />
            </Press>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <Text style={[styles.fieldLabel, { paddingLeft: 4, color: tw.slate400, marginBottom: 0 }]}>SELECTION</Text>
              <View onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {vehicleTypes.map((type) => {
                  const id = String(type._id || type.id);
                  const selected = String(formData.vehicleTypeId) === id;
                  const typeImage = getVehicleTypeImage(type);

                  return (
                    <Press
                      key={id}
                      scale={1}
                      onPress={() => handleChange('vehicleTypeId', id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={getTypeLabel(type)}
                      style={[styles.typeCard, { width: cardWidth }, selected ? styles.typeCardOn : styles.typeCardOff]}
                    >
                      <View style={[styles.typeImageBox, { backgroundColor: selected ? 'rgba(255,255,255,0.14)' : tw.slate50 }]}>
                        <Img source={toSource(typeImage)} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityLabel={getTypeLabel(type)} />
                      </View>
                      <Text style={[styles.typeLabel, { color: selected ? '#fff' : tw.slate400 }]}>{getTypeLabel(type).toUpperCase()}</Text>
                    </Press>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 16 }}>
              <VehicleField label="Make" value={formData.vehicleMake} onChangeText={(text) => handleChange('vehicleMake', text)} placeholder="e.g. Suzuki" style={{ flex: 1 }} />
              <VehicleField label="Model" value={formData.vehicleModel} onChangeText={(text) => handleChange('vehicleModel', text)} placeholder="e.g. WagonR" style={{ flex: 1 }} />
            </View>

            <VehicleField
              label="Plate Number"
              value={formData.vehicleNumber}
              onChangeText={(text) => handleChange('vehicleNumber', text.toUpperCase())}
              placeholder="e.g. MP 09 AB 1234"
              autoCapitalize="characters"
            />

            <VehicleField label="Color" value={formData.vehicleColor} onChangeText={(text) => handleChange('vehicleColor', text)} placeholder="e.g. White, Black" />

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { marginBottom: 12 }]}>VEHICLE IMAGE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.imageBox}>
                  {previewSrc ? (
                    <Img source={{ uri: previewSrc }} style={{ width: '100%', height: '100%', opacity: imageUploading ? 0.6 : 1 }} resizeMode="cover" accessibilityLabel="Vehicle" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <VehicleGlyph iconType={activeIconType} size={22} color={tw.slate300} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Press scale={1} onPress={openVehicleGalleryPicker} disabled={imageUploading} accessibilityLabel="Choose From Gallery" style={[styles.pickBtn, imageUploading ? { opacity: 0.6 } : null]}>
                    {imageUploading ? <Spinner size={16} color={tw.slate700} /> : <ImagePlus size={16} color={tw.slate700} />}
                    <Text style={styles.pickText}>{imageUploading ? 'Uploading...' : 'Choose From Gallery'}</Text>
                  </Press>
                  <Press scale={1} onPress={openVehicleCameraPicker} disabled={imageUploading} accessibilityLabel="Use Camera" style={[styles.pickBtn, imageUploading ? { opacity: 0.6 } : null]}>
                    {imageUploading ? <Spinner size={16} color={tw.slate700} /> : <Camera size={16} color={tw.slate700} />}
                    <Text style={styles.pickText}>{imageUploading ? 'Uploading...' : 'Use Camera'}</Text>
                  </Press>
                </View>
              </View>
            </View>
          </View>

          <Press scale={0.95} onPress={handleSave} disabled={isSaving || imageUploading} accessibilityLabel="Update Vehicle" style={[styles.save, isSaving || imageUploading ? { opacity: 0.5 } : null]}>
            {isSaving || imageUploading ? <Spinner size={20} color="#fff" /> : <Save size={20} color="#fff" />}
            <Text style={styles.saveText}>UPDATE VEHICLE</Text>
          </Press>
        </ScrollView>
      </BottomSheet>
      <DriverBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  back: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  title: { fontSize: 20, lineHeight: 28, letterSpacing: -0.5, color: tw.slate900, ...outfit(700) },
  hero: { backgroundColor: tw.slate900, padding: 28, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', ...shadow('xl') },
  heroKicker: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.1, color: 'rgba(255,255,255,0.4)', ...outfit(700) },
  heroTitle: { fontSize: 22, lineHeight: 22, letterSpacing: -0.55, color: '#fff', ...outfit(700) },
  heroNumber: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: 'rgba(255,255,255,0.5)', marginTop: 4, ...outfit(600) },
  heroMeta: { fontSize: 11, lineHeight: 16.5, color: 'rgba(255,255,255,0.3)', ...outfit(500) },
  heroImage: { height: 64, width: 80, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', ...shadow('lg') },
  heroIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', ...shadow('lg') },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,188,125,0.1)', borderWidth: 1, borderColor: 'rgba(0,188,125,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  heroBadgeText: { fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, color: tw.emerald400, ...outfit(600) },
  message: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.1, color: tw.slate500, paddingHorizontal: 4, ...outfit(700) },
  section: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.1, color: tw.slate400, ...outfit(700) },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tw.blue50, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editText: { fontSize: 11, lineHeight: 16.5, color: tw.blue600, ...outfit(700) },
  dispatch: { backgroundColor: 'rgba(255,251,235,0.5)', borderWidth: 1, borderColor: 'rgba(254,243,198,0.5)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16 },
  dispatchTitle: { fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, color: tw.amber600, marginBottom: 4, ...outfit(700) },
  dispatchBody: { fontSize: 12, lineHeight: 19.5, color: tw.slate500, ...outfit(500) },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, width: '100%', maxWidth: 512, alignSelf: 'center', overflow: 'hidden', ...shadow('2xl') },
  sheetKicker: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.1, color: tw.slate400, ...outfit(700) },
  sheetTitle: { fontSize: 24, lineHeight: 32, color: tw.slate900, ...outfit(700) },
  sheetClose: { width: 40, height: 40, borderRadius: 16, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  typeCard: { minHeight: 90, padding: 12, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 8 },
  typeCardOn: { backgroundColor: tw.slate950, borderColor: tw.slate950, ...shadow('0 20px 25px -5px rgba(3,6,24,0.2), 0 8px 10px -6px rgba(3,6,24,0.2)') },
  typeCardOff: { backgroundColor: '#fff', borderColor: tw.slate100 },
  typeImageBox: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 10, lineHeight: 10, letterSpacing: 0.5, textAlign: 'center', ...outfit(700) },
  field: { backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate200, padding: 16, borderRadius: 16 },
  fieldLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate500, marginBottom: 4, ...outfit(700) },
  fieldInput: { padding: 0, fontSize: 15, color: tw.slate900, ...outfit(700) },
  imageBox: { height: 64, width: 80, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', ...shadow('sm') },
  pickBtn: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', paddingHorizontal: 12 },
  pickText: { fontSize: 12, lineHeight: 16, color: tw.slate700, ...outfit(700) },
  save: { height: 64, backgroundColor: tw.slate950, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, ...shadow('0 20px 25px -5px rgba(3,6,24,0.2), 0 8px 10px -6px rgba(3,6,24,0.2)') },
  saveText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: '#fff', ...outfit(700) },
});
