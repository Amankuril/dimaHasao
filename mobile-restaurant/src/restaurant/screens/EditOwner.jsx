import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar as CalendarIcon, Check, Clock, Image as ImageIcon, MapPin, Upload, User, X } from 'lucide-react-native';
import Img from '../../components/Img';
import { SelectField } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import LocationSearchInput from '../components/LocationSearchInput';
import { ImageSourcePicker } from '../components/ImageSourcePicker';
import { PageHeader } from '../components/ui';
import { useEditOwner } from '../hooks/pages/useEditOwner';
import { RT, RT_GRADIENT } from '../theme';
import { toast } from '../../lib/notify';
import { sessionStore } from '../../lib/storage';

function Card({ title, right, children, gap = 16 }) {
  return (
    <View style={styles.card}>
      {title ? (
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{title}</Text>
          {right}
        </View>
      ) : null}
      <View style={{ gap }}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, maxLength, editable = true, autoCapitalize = 'none', style }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tw.gray400}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        editable={editable}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
        style={[styles.input, !editable ? { backgroundColor: tw.gray50, color: tw.gray500 } : null, style]}
      />
    </View>
  );
}

function Select({ label, value, options, onChange, placeholder }) {
  const opts = value ? options : [{ value: '', label: placeholder }, ...options];
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <SelectField
        value={value}
        options={opts}
        onChange={onChange}
        accessibilityLabel={label}
        style={styles.select}
        textStyle={{ fontSize: 14, color: value ? tw.gray900 : tw.gray500, ...poppins(400) }}
      />
    </View>
  );
}

/** A document slot: preview with remove button, or the "no document" placeholder, and an upload button. */
function DocUpload({ title, value, getPreviewUrl, onRemove, onPick, button }) {
  return (
    <View style={styles.doc}>
      <Text style={styles.docTitle}>{title}</Text>
      {value ? (
        <View style={styles.docPreview}>
          <Img source={{ uri: getPreviewUrl(value) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={title} />
          <Press onPress={onRemove} accessibilityLabel="Remove" style={styles.docRemove}>
            <X size={14} color="#fff" />
          </Press>
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <ImageIcon size={40} color={tw.gray400} style={{ marginBottom: 4 }} />
          <Text style={{ fontSize: 11, lineHeight: 16, color: tw.gray500, ...poppins(400) }}>No document uploaded</Text>
        </View>
      )}
      <Press scale={0.98} onPress={onPick} style={styles.docBtn}>
        <Upload size={14} color={tw.gray700} />
        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) }}>{button}</Text>
      </Press>
    </View>
  );
}

const pad = (n) => String(n).padStart(2, '0');
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** MUI MobileTimePicker ("hh:mm a") -> the Android time picker. */
function TimeBox({ label, value, onChange }) {
  const open = () =>
    DateTimePickerAndroid.open({
      value: value || new Date(),
      mode: 'time',
      is24Hour: false,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(date);
      },
    });
  const display = value ? value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase() : '';
  return (
    <View style={styles.timeWrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Clock size={16} color={tw.gray800} />
        <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(500) }}>{label}</Text>
      </View>
      <Press scale={1} onPress={open} accessibilityLabel={`${label}: ${display || 'Select time'}`} style={styles.timeField}>
        <Text style={{ fontSize: 12, lineHeight: 16, color: display ? tw.gray900 : tw.gray400, ...poppins(400) }}>{display || 'Select time'}</Text>
      </Press>
    </View>
  );
}

/** Port of Food/pages/restaurant/EditOwner.jsx (/food/restaurant/edit-owner). */
export default function EditOwner() {
  const insets = useSafeAreaInsets();
  const {
    navigate, routerLocation, backTarget, handleBack, TABS, activeTab, setActiveTab, formData, zones, loading, saving,
    isPhotoPickerOpen, setIsPhotoPickerOpen, activeImageField, hasChanges, handleInputChange, handleLocationChange,
    handleLocationSearchSelect, handleCuisineToggle, handleDayToggle, handlePhotoClick, handlePhotoSelect, handleRemoveImage,
    getPreviewUrl, handleSave, timeStringToMinutes, stringToTime, timeToString, EDIT_OWNER_DRAFT_KEY, EDIT_OWNER_ACTIVE_TAB_KEY,
    daysOfWeek, ALL_CUISINES, formatNameToCapital,
  } = useEditOwner();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator size="large" color={RT.primary} />
        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(500) }}>Loading profile details...</Text>
      </View>
    );
  }

  const changeTime = (field, newValue) => {
    if (!newValue) {
      handleInputChange(field, '');
      return;
    }
    const next = timeToString(newValue);
    const openingMinutes = timeStringToMinutes(field === 'openingTime' ? next : formData.openingTime);
    const closingMinutes = timeStringToMinutes(field === 'closingTime' ? next : formData.closingTime);
    if (openingMinutes !== null && closingMinutes !== null) {
      if (openingMinutes === closingMinutes) {
        toast.error('Opening time and closing time cannot be same');
        return;
      }
      if (closingMinutes < openingMinutes) {
        toast.error('Closing time cannot be less than opening time');
        return;
      }
    }
    handleInputChange(field, next);
  };

  const openExpiry = () => {
    const current = formData.fssaiExpiry ? new Date(`${formData.fssaiExpiry}T00:00:00`) : new Date();
    DateTimePickerAndroid.open({
      value: Number.isNaN(current.getTime()) ? new Date() : current,
      mode: 'date',
      onChange: (event, date) => {
        if (event.type === 'set' && date) handleInputChange('fssaiExpiry', toYmd(date));
      },
    });
  };

  const goToMap = () => {
    try {
      sessionStore.setItem(EDIT_OWNER_DRAFT_KEY, JSON.stringify(formData));
      sessionStore.setItem(EDIT_OWNER_ACTIVE_TAB_KEY, activeTab);
    } catch {
      // ignore storage errors
    }
    navigate('/food/restaurant/edit-address', {
      state: {
        from: routerLocation.pathname,
        outletFrom: backTarget,
        currentLocation: formData.location,
        returnTab: activeTab,
      },
    });
  };

  const loc = formData.location || {};
  const biasLocation =
    Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude)) && loc.latitude !== '' && loc.longitude !== ''
      ? { latitude: Number(loc.latitude), longitude: Number(loc.longitude) }
      : null;
  const photoTitle =
    activeImageField === 'profileImage' ? 'Owner photo' : activeImageField === 'panImage' ? 'PAN copy' : activeImageField === 'gstImage' ? 'GST copy' : activeImageField === 'fssaiImage' ? 'FSSAI copy' : 'Menu photo';
  const saveOff = !hasChanges || loading || saving;

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray50 }}>
      <PageHeader title="Edit Profile & Contact Details" subtitle="RESTAURANT CONTROL PANEL" onBack={handleBack} large={false} />
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 20 }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <Press key={tab.id} scale={1} onPress={() => setActiveTab(tab.id)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.tab, active ? { borderBottomColor: RT.primary } : null]}>
                <Icon size={16} color={active ? RT.primary : tw.gray400} />
                <Text style={[styles.tabText, { color: active ? RT.primary : tw.gray500 }]}>{tab.label}</Text>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 112 + insets.bottom, gap: 24 }}>
        {activeTab === 'owner' ? (
          <>
            <View style={[styles.card, { alignItems: 'center', gap: 12 }]}>
              <Text style={[styles.label, { alignSelf: 'flex-start', marginBottom: 0 }]}>OWNER PROFILE PHOTO</Text>
              <View style={{ marginTop: 8 }}>
                <View style={styles.avatar}>
                  {formData.profileImage ? (
                    <Img source={{ uri: getPreviewUrl(formData.profileImage) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Owner Profile" />
                  ) : (
                    <User size={40} color={tw.gray400} />
                  )}
                </View>
                {formData.profileImage ? (
                  <Press onPress={() => handleRemoveImage('profileImage')} accessibilityLabel="Remove photo" style={styles.avatarRemove}>
                    <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarRemoveFill}>
                      <X size={14} color="#fff" />
                    </LinearGradient>
                  </Press>
                ) : null}
              </View>
              <Press scale={0.98} onPress={() => handlePhotoClick('profileImage')} style={styles.choose}>
                <Upload size={14} color={RT.primary} />
                <Text style={{ fontSize: 12, lineHeight: 16, color: RT.primary, ...poppins(600) }}>Choose Photo</Text>
              </Press>
            </View>

            <Card>
              <Field label="FULL NAME" value={formData.ownerName} onChangeText={(t) => handleInputChange('ownerName', formatNameToCapital(t.replace(/[^A-Za-z ]/g, '')))} placeholder="Enter owner full name" autoCapitalize="words" />
              <Field label="OWNER EMAIL ADDRESS" value={formData.ownerEmail} onChangeText={(t) => handleInputChange('ownerEmail', t)} placeholder="Enter owner email" keyboardType="email-address" />
              <Field label="MOBILE PHONE NUMBER" value={formData.ownerPhone} onChangeText={(t) => handleInputChange('ownerPhone', t.replace(/\D/g, '').slice(0, 10))} placeholder="Enter 10-digit mobile number" keyboardType="number-pad" editable={false} />
            </Card>
          </>
        ) : null}

        {activeTab === 'restaurant' ? (
          <>
            <Card title="General Details">
              <Field label="RESTAURANT NAME" value={formData.restaurantName} onChangeText={(t) => handleInputChange('restaurantName', t.replace(/[/-]/g, ''))} placeholder="Enter restaurant name" autoCapitalize="sentences" />
              <Field label="PRIMARY CONTACT NUMBER" value={formData.primaryContactNumber} onChangeText={(t) => handleInputChange('primaryContactNumber', t)} placeholder="Enter primary contact number" keyboardType="phone-pad" />
              <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 }}>
                <Text style={[styles.label, { marginBottom: 8 }]}>MENU TYPE</Text>
                <Text style={{ fontSize: 11, lineHeight: 16, color: tw.gray500, marginBottom: 12, ...poppins(400) }}>This helps users filter restaurants by dietary preference.</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Press scale={1} onPress={() => handleInputChange('pureVegRestaurant', true)} style={[styles.pill, formData.pureVegRestaurant === true ? { backgroundColor: tw.green600, borderColor: tw.green600 } : null]}>
                    <Text style={[styles.pillText, { color: formData.pureVegRestaurant === true ? '#fff' : tw.gray700 }]}>🥦 Yes, Pure Veg</Text>
                  </Press>
                  <Press scale={1} onPress={() => handleInputChange('pureVegRestaurant', false)} style={[styles.pill, formData.pureVegRestaurant === false ? { backgroundColor: RT.primary, borderColor: 'transparent' } : null]}>
                    <Text style={[styles.pillText, { color: formData.pureVegRestaurant === false ? '#fff' : tw.gray700 }]}>🍖 No, Mixed Menu</Text>
                  </Press>
                </View>
              </View>
              <Select label="SERVICE ZONE" value={formData.zoneId} onChange={(v) => handleInputChange('zoneId', v)} placeholder="Select service zone" options={zones.map((z) => ({ value: String(z._id || z.id), label: z.name }))} />
            </Card>

            <Card
              title="Address & Location"
              right={
                <Press scale={0.97} onPress={goToMap} accessibilityLabel="Select from map" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <MapPin size={14} color={RT.primary} />
                  <Text style={{ fontSize: 10, lineHeight: 16, letterSpacing: 0.8, color: RT.primary, ...poppins(700) }}>SELECT FROM MAP</Text>
                </Press>
              }
            >
              <LocationSearchInput label="SEARCH YOUR OUTLET LOCATION" placeholder="Search area, street, landmark..." biasLocation={biasLocation} onLocationSelect={handleLocationSearchSelect} />
              <Field label="FULL ADDRESS (LINE 1)*" value={loc.addressLine1 || ''} onChangeText={(t) => handleLocationChange('addressLine1', t)} placeholder="Building / Shop / Street number" autoCapitalize="sentences" />
              <Field label="ADDRESS LINE 2 (OPTIONAL)" value={loc.addressLine2 || ''} onChangeText={(t) => handleLocationChange('addressLine2', t)} placeholder="Floor, wing, suite info" autoCapitalize="sentences" />
              <Field label="AREA / LOCALITY*" value={loc.area || ''} onChangeText={(t) => handleLocationChange('area', t)} placeholder="Area / Sector / Colony" autoCapitalize="sentences" />
              <Field label="LANDMARK (OPTIONAL)" value={loc.landmark || ''} onChangeText={(t) => handleLocationChange('landmark', t)} placeholder="Nearby landmark" autoCapitalize="sentences" />
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Field label="CITY" value={loc.city || 'Indore'} onChangeText={(t) => handleLocationChange('city', t)} placeholder="City" autoCapitalize="words" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="PINCODE" value={loc.pincode || ''} onChangeText={(t) => handleLocationChange('pincode', t.replace(/\D/g, ''))} placeholder="6-digit PIN" keyboardType="number-pad" />
                </View>
              </View>
            </Card>

            <Card title="Operation & Timings">
              <View style={{ gap: 16 }}>
                <TimeBox label="Opening Time" value={stringToTime(formData.openingTime)} onChange={(d) => changeTime('openingTime', d)} />
                <TimeBox label="Closing Time" value={stringToTime(formData.closingTime)} onChange={(d) => changeTime('closingTime', d)} />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  <CalendarIcon size={14} color={RT.primary} />
                  <Text style={[styles.label, { marginBottom: 0 }]}>OPERATIONAL DAYS</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {daysOfWeek.map((day) => {
                    const active = formData.openDays.includes(day);
                    return (
                      <Press key={day} scale={1} onPress={() => handleDayToggle(day)} accessibilityLabel={day} accessibilityState={{ selected: active }} style={[styles.day, active ? { backgroundColor: RT.primary } : null]}>
                        <Text style={{ fontSize: 12, lineHeight: 16, color: active ? '#fff' : tw.gray800, ...poppins(600) }}>{day.slice(0, 1)}</Text>
                      </Press>
                    );
                  })}
                </View>
              </View>
              <Field label="ESTIMATED DELIVERY TIME" value={formData.estimatedDeliveryTime} onChangeText={(t) => handleInputChange('estimatedDeliveryTime', t)} placeholder="e.g., 30-40 mins" />
            </Card>

            <Card
              title="Cuisines Served"
              right={
                <Text style={styles.badge}>MAX 8 SELECTED</Text>
              }
            >
              <ScrollView nestedScrollEnabled style={{ maxHeight: 256 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ALL_CUISINES.map((cuisine) => {
                    const selected = formData.cuisines.includes(cuisine);
                    return (
                      <Press key={cuisine} scale={1} onPress={() => handleCuisineToggle(cuisine)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={[styles.cuisine, selected ? { borderColor: RT.primary, backgroundColor: RT.primarySoft } : null]}>
                        <Text style={{ flexShrink: 1, fontSize: 12, lineHeight: 16, color: selected ? RT.primary : tw.gray700, ...poppins(600) }}>{cuisine}</Text>
                        {selected ? <Check size={14} color={RT.primary} /> : null}
                      </Press>
                    );
                  })}
                </View>
              </ScrollView>
            </Card>
          </>
        ) : null}

        {activeTab === 'kyc' ? (
          <>
            <Card title="PAN Card Information">
              <Field label="PAN CARD NUMBER" value={formData.panNumber} onChangeText={(t) => handleInputChange('panNumber', t.toUpperCase())} placeholder="Enter 10-digit PAN (e.g. ABCDE1234F)" maxLength={10} autoCapitalize="characters" />
              <Field label="NAME ON PAN CARD" value={formData.nameOnPan} onChangeText={(t) => handleInputChange('nameOnPan', t)} placeholder="Enter exact name on PAN card" autoCapitalize="words" />
              <DocUpload title="PAN Card Upload" value={formData.panImage} getPreviewUrl={getPreviewUrl} onRemove={() => handleRemoveImage('panImage')} onPick={() => handlePhotoClick('panImage')} button="Upload PAN" />
            </Card>

            <Card title="Bank Account Info">
              <Field label="ACCOUNT HOLDER NAME" value={formData.accountHolderName} onChangeText={(t) => handleInputChange('accountHolderName', formatNameToCapital(t.replace(/[^A-Za-z ]/g, '')))} placeholder="Name as in bank records" autoCapitalize="words" />
              <Field label="BANK ACCOUNT NUMBER" value={formData.accountNumber} onChangeText={(t) => handleInputChange('accountNumber', t.replace(/\D/g, ''))} placeholder="Enter account number" keyboardType="number-pad" secureTextEntry />
              <Field label="CONFIRM ACCOUNT NUMBER" value={formData.confirmAccountNumber} onChangeText={(t) => handleInputChange('confirmAccountNumber', t.replace(/\D/g, ''))} placeholder="Re-enter account number" keyboardType="number-pad" />
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Field label="IFSC CODE" value={formData.ifscCode} onChangeText={(t) => handleInputChange('ifscCode', t.toUpperCase())} placeholder="11-digit IFSC" maxLength={11} autoCapitalize="characters" />
                </View>
                <View style={{ flex: 1 }}>
                  <Select label="ACCOUNT TYPE" value={formData.accountType} onChange={(v) => handleInputChange('accountType', v)} placeholder="Select type" options={[{ value: 'Saving', label: 'Saving' }, { value: 'Current', label: 'Current' }]} />
                </View>
              </View>
            </Card>

            <Card
              title="GST Registration"
              right={
                <Press scale={1} onPress={() => handleInputChange('gstRegistered', !formData.gstRegistered)} accessibilityRole="switch" accessibilityState={{ checked: formData.gstRegistered }} accessibilityLabel="GST registered" style={[styles.switch, { backgroundColor: formData.gstRegistered ? RT.primary : tw.gray200 }]}>
                  <View style={[styles.thumb, { transform: [{ translateX: formData.gstRegistered ? 20 : 0 }] }]} />
                </Press>
              }
            >
              {formData.gstRegistered ? (
                <View style={{ gap: 16, paddingTop: 8 }}>
                  <Field label="GSTIN (GST NUMBER)" value={formData.gstNumber} onChangeText={(t) => handleInputChange('gstNumber', t.toUpperCase())} placeholder="e.g. 22AAAAA1111A1Z1" maxLength={15} autoCapitalize="characters" />
                  <Field label="GST LEGAL BUSINESS NAME" value={formData.gstLegalName} onChangeText={(t) => handleInputChange('gstLegalName', t)} placeholder="Legal firm / business name" autoCapitalize="words" />
                  <Field label="GST REGISTERED ADDRESS" value={formData.gstAddress} onChangeText={(t) => handleInputChange('gstAddress', t)} placeholder="Registered business address" autoCapitalize="sentences" />
                  <DocUpload title="GST Registration Copy" value={formData.gstImage} getPreviewUrl={getPreviewUrl} onRemove={() => handleRemoveImage('gstImage')} onPick={() => handlePhotoClick('gstImage')} button="Upload GST Certificate" />
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {activeTab === 'docs' ? (
          <>
            <Card title="FSSAI License details">
              <Field label="FSSAI LICENSE NUMBER" value={formData.fssaiNumber} onChangeText={(t) => handleInputChange('fssaiNumber', t.replace(/\D/g, ''))} placeholder="Enter 14-digit license number" maxLength={14} keyboardType="number-pad" />
              <View>
                <Text style={styles.label}>LICENSE EXPIRY DATE</Text>
                <Press scale={1} onPress={openExpiry} accessibilityLabel={`License expiry date ${formData.fssaiExpiry || 'not set'}`} style={styles.input}>
                  <Text style={{ fontSize: 14, color: formData.fssaiExpiry ? tw.gray900 : tw.gray400, ...poppins(400) }}>{formData.fssaiExpiry || 'yyyy-mm-dd'}</Text>
                </Press>
              </View>
              <DocUpload title="FSSAI Copy Upload" value={formData.fssaiImage} getPreviewUrl={getPreviewUrl} onRemove={() => handleRemoveImage('fssaiImage')} onPick={() => handlePhotoClick('fssaiImage')} button="Upload FSSAI License" />
            </Card>

            <Card title="Menu & Photos" right={<Text style={styles.badge}>{formData.menuImages.length} / 10 PHOTOS</Text>}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {formData.menuImages.map((img, idx) => (
                  <View key={idx} style={styles.menuCell}>
                    <Img source={{ uri: getPreviewUrl(img) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`Menu photo ${idx + 1}`} />
                    <Press onPress={() => handleRemoveImage('menuImages', idx)} accessibilityLabel="Remove" style={styles.menuRemove}>
                      <X size={12} color="#fff" />
                    </Press>
                  </View>
                ))}
                {formData.menuImages.length < 10 ? (
                  <Press scale={0.98} onPress={() => handlePhotoClick('menuImages')} style={[styles.menuCell, styles.menuAdd]}>
                    <View style={styles.menuAddIcon}>
                      <ImageIcon size={18} color={tw.gray600} />
                    </View>
                    <Text style={{ fontSize: 11, lineHeight: 16, color: tw.gray600, letterSpacing: 0.5, ...poppins(700) }}>ADD MENU PHOTO</Text>
                  </Press>
                ) : null}
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Press scale={0.98} disabled={saveOff} onPress={handleSave} accessibilityState={{ disabled: saveOff, busy: saving }} style={saveOff ? { opacity: 0.5 } : null}>
          <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.save, saveOff ? null : shadow('lg')]}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', letterSpacing: 0.4, ...poppins(700) }}>{saving ? 'Uploading & Saving details...' : 'Save Profile Details'}</Text>
          </LinearGradient>
        </Press>
      </View>

      <ImageSourcePicker
        isOpen={isPhotoPickerOpen}
        onClose={() => setIsPhotoPickerOpen(false)}
        onFileSelect={handlePhotoSelect}
        title={`Upload ${photoTitle}`}
        description="Choose file from gallery or snap with camera"
        fileNamePrefix={`${activeImageField || 'photo'}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabsWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 12, lineHeight: 16, ...poppins(600) },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, gap: 16, ...shadow('sm') },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: tw.gray200, paddingBottom: 8 },
  cardTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  label: { fontSize: 12, lineHeight: 16, color: tw.gray700, marginBottom: 6, letterSpacing: 0.6, ...poppins(700) },
  input: { height: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 0, fontSize: 14, color: tw.gray900, borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, backgroundColor: '#fff', ...poppins(400) },
  select: { height: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: tw.gray200, borderRadius: 6, backgroundColor: '#fff' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: tw.gray200 },
  avatarRemove: { position: 'absolute', top: -4, right: -4, ...shadow('md') },
  avatarRemoveFill: { borderRadius: 999, padding: 4 },
  choose: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 36, borderWidth: 1, borderColor: RT.primary, borderRadius: 6 },
  pill: { flex: 1, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  pillText: { fontSize: 12, lineHeight: 16, ...poppins(600) },
  timeWrap: { borderWidth: 1, borderColor: tw.gray200, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(249,250,251,0.6)' },
  timeField: { height: 36, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 4 },
  day: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.gray100 },
  badge: { fontSize: 10, lineHeight: 16, color: RT.primary, backgroundColor: RT.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(700) },
  cuisine: { width: '48.5%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200 },
  doc: { borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200, borderRadius: 12, padding: 16, backgroundColor: 'rgba(249,250,251,0.5)', alignItems: 'center', gap: 12 },
  docTitle: { alignSelf: 'flex-start', fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(600) },
  docPreview: { width: '100%', maxWidth: 200, aspectRatio: 4 / 3, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray200 },
  docRemove: { position: 'absolute', top: 6, right: 6, backgroundColor: RT.primary, borderRadius: 999, padding: 4, ...shadow('md') },
  docBtn: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderWidth: 1, borderColor: tw.gray300, borderRadius: 6, backgroundColor: '#fff' },
  switch: { width: 44, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', ...shadow('sm') },
  menuCell: { width: '48%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray200 },
  menuRemove: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: 4 },
  menuAdd: { borderStyle: 'dashed', borderColor: tw.gray300, backgroundColor: 'rgba(249,250,251,0.7)', alignItems: 'center', justifyContent: 'center', gap: 6 },
  menuAddIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.gray200 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray200, paddingHorizontal: 16, paddingTop: 16 },
  save: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
