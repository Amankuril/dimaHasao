import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar as CalendarIcon, Check, Clock, Image as ImageIcon, MapPin, Upload, User, X } from 'lucide-react-native';
import Img from '../../components/Img';
import { SelectField } from '../../components/kit';
import { Button, Chip, ChipRow, IconButton, StatusBadge } from '../../components/ds';
import { Press } from '../../components/ui';
import { color, elevation, radii, space, type } from '../../theme';
import LocationSearchInput from '../components/LocationSearchInput';
import { ImageSourcePicker } from '../components/ImageSourcePicker';
import { useEditOwner } from '../hooks/pages/useEditOwner';
import { toast } from '../../lib/notify';
import { sessionStore } from '../../lib/storage';
import { Field as KitField, Input, PinnedBar, ScreenHeader, Switch, VegMark } from './inventory/partnerKit';

function Card({ title, right, children, gap = space.lg }) {
  return (
    <View style={styles.card}>
      {title ? (
        <View style={styles.cardHead}>
          <Text style={[type.subheading, { flex: 1, color: color.text }]} accessibilityRole="header">{title}</Text>
          {right}
        </View>
      ) : null}
      <View style={{ gap }}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, maxLength, editable = true, autoCapitalize = 'none', style }) {
  return (
    <KitField label={label}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        editable={editable}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
        style={style}
      />
    </KitField>
  );
}

function Select({ label, value, options, onChange, placeholder }) {
  const opts = value ? options : [{ value: '', label: placeholder }, ...options];
  return (
    <KitField label={label}>
      <SelectField value={value} options={opts} onChange={onChange} accessibilityLabel={label} chevronColor={color.textMuted} style={styles.select} textStyle={[type.body, { color: value ? color.text : color.textMuted }]} />
    </KitField>
  );
}

/** A document slot: preview with remove button, or the "no document" placeholder, and an upload button. */
function DocUpload({ title, value, getPreviewUrl, onRemove, onPick, button }) {
  return (
    <View style={styles.doc}>
      <Text style={[type.label, { color: color.text, alignSelf: 'flex-start' }]}>{title}</Text>
      {value ? (
        <View style={styles.docPreview}>
          <Img source={{ uri: getPreviewUrl(value) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={title} />
          <IconButton icon={X} label={`Remove ${title}`} variant="danger" size={36} iconSize={16} onPress={onRemove} style={styles.docRemove} />
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: space.md, gap: space.xs }}>
          <ImageIcon size={32} color={color.textMuted} />
          <Text style={[type.caption, { color: color.textMuted }]}>No document uploaded</Text>
        </View>
      )}
      <Button title={button} icon={Upload} variant="outline" size="sm" onPress={onPick} style={{ minHeight: 44 }} />
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
  const display = value ? value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  return (
    <View style={{ flex: 1, minWidth: 136 }}>
      <Text style={[type.label, { color: color.text, marginBottom: space.sm }]}>{label}</Text>
      <Press scale={0.98} onPress={open} accessibilityLabel={`${label}: ${display || 'Select time'}`} style={styles.select}>
        <Clock size={18} color={color.primary} />
        <Text style={[type.bodyStrong, { flex: 1, color: display ? color.text : color.textMuted }]}>{display || 'Select time'}</Text>
      </Press>
    </View>
  );
}

/** Port of Food/pages/restaurant/EditOwner.jsx (/food/restaurant/edit-owner). */
export default function EditOwner() {
  const {
    navigate, routerLocation, backTarget, handleBack, TABS, activeTab, setActiveTab, formData, zones, loading, saving,
    isPhotoPickerOpen, setIsPhotoPickerOpen, activeImageField, hasChanges, handleInputChange, handleLocationChange,
    handleLocationSearchSelect, handleCuisineToggle, handleDayToggle, handlePhotoClick, handlePhotoSelect, handleRemoveImage,
    getPreviewUrl, handleSave, timeStringToMinutes, stringToTime, timeToString, EDIT_OWNER_DRAFT_KEY, EDIT_OWNER_ACTIVE_TAB_KEY,
    daysOfWeek, ALL_CUISINES, formatNameToCapital,
  } = useEditOwner();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScreenHeader title="Edit profile" onBack={handleBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
          <ActivityIndicator size="large" color={color.primary} />
          <Text style={[type.body, { color: color.textSecondary }]}>Loading profile details…</Text>
        </View>
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
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title="Edit profile" subtitle="Profile and contact details" onBack={handleBack} />
      <View style={styles.tabsWrap}>
        <ChipRow>
          {TABS.map((tab) => (
            <Chip key={tab.id} label={tab.label} icon={tab.icon} selected={activeTab === tab.id} onPress={() => setActiveTab(tab.id)} />
          ))}
        </ChipRow>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxxl }}>
        {activeTab === 'owner' ? (
          <>
            <Card title="Owner photo">
              <View style={{ alignItems: 'center', gap: space.md }}>
                <View>
                  <View style={styles.avatar}>
                    {formData.profileImage ? (
                      <Img source={{ uri: getPreviewUrl(formData.profileImage) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Owner Profile" />
                    ) : (
                      <User size={40} color={color.primary} />
                    )}
                  </View>
                  {formData.profileImage ? (
                    <IconButton icon={X} label="Remove photo" variant="danger" size={36} iconSize={16} onPress={() => handleRemoveImage('profileImage')} style={styles.avatarRemove} />
                  ) : null}
                </View>
                <Button title="Choose photo" icon={Upload} variant="secondary" size="sm" fullWidth={false} onPress={() => handlePhotoClick('profileImage')} style={{ minHeight: 44, alignSelf: 'center' }} />
              </View>
            </Card>

            <Card title="Owner details">
              <Field label="Full name" value={formData.ownerName} onChangeText={(t) => handleInputChange('ownerName', formatNameToCapital(t.replace(/[^A-Za-z ]/g, '')))} placeholder="Enter owner full name" autoCapitalize="words" />
              <Field label="Owner email address" value={formData.ownerEmail} onChangeText={(t) => handleInputChange('ownerEmail', t)} placeholder="Enter owner email" keyboardType="email-address" />
              <Field label="Mobile phone number" value={formData.ownerPhone} onChangeText={(t) => handleInputChange('ownerPhone', t.replace(/\D/g, '').slice(0, 10))} placeholder="Enter 10-digit mobile number" keyboardType="number-pad" editable={false} />
            </Card>
          </>
        ) : null}

        {activeTab === 'restaurant' ? (
          <>
            <Card title="General details">
              <Field label="Restaurant name" value={formData.restaurantName} onChangeText={(t) => handleInputChange('restaurantName', t.replace(/[/-]/g, ''))} placeholder="Enter restaurant name" autoCapitalize="sentences" />
              <Field label="Primary contact number" value={formData.primaryContactNumber} onChangeText={(t) => handleInputChange('primaryContactNumber', t)} placeholder="Enter primary contact number" keyboardType="phone-pad" />
              <View>
                <Text style={[type.label, { color: color.text }]}>Menu type</Text>
                <Text style={[type.caption, { color: color.textMuted, marginTop: 2, marginBottom: space.sm }]}>Helps customers filter restaurants by diet.</Text>
                <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityRole="radiogroup">
                  <Press scale={0.98} onPress={() => handleInputChange('pureVegRestaurant', true)} accessibilityRole="radio" accessibilityState={{ selected: formData.pureVegRestaurant === true }} accessibilityLabel="Yes, pure veg" style={[styles.menuType, formData.pureVegRestaurant === true && styles.menuTypeOn]}>
                    <VegMark veg />
                    <Text style={[type.label, { flex: 1, color: color.text }]}>Pure veg</Text>
                    {formData.pureVegRestaurant === true ? <Check size={16} color={color.primary} /> : null}
                  </Press>
                  <Press scale={0.98} onPress={() => handleInputChange('pureVegRestaurant', false)} accessibilityRole="radio" accessibilityState={{ selected: formData.pureVegRestaurant === false }} accessibilityLabel="No, mixed menu" style={[styles.menuType, formData.pureVegRestaurant === false && styles.menuTypeOn]}>
                    <VegMark veg />
                    <VegMark veg={false} />
                    <Text style={[type.label, { flex: 1, color: color.text }]}>Mixed menu</Text>
                    {formData.pureVegRestaurant === false ? <Check size={16} color={color.primary} /> : null}
                  </Press>
                </View>
              </View>
              <Select label="Service zone" value={formData.zoneId} onChange={(v) => handleInputChange('zoneId', v)} placeholder="Select service zone" options={zones.map((z) => ({ value: String(z._id || z.id), label: z.name }))} />
            </Card>

            <Card
              title="Address and location"
              right={<Button title="Pick on map" icon={MapPin} variant="ghost" size="sm" fullWidth={false} onPress={goToMap} accessibilityLabel="Select from map" style={{ minHeight: 44, paddingHorizontal: space.sm }} />}
            >
              <LocationSearchInput label="Search your outlet location" placeholder="Search area, street, landmark" biasLocation={biasLocation} onLocationSelect={handleLocationSearchSelect} />
              <Field label="Full address (line 1) *" value={loc.addressLine1 || ''} onChangeText={(t) => handleLocationChange('addressLine1', t)} placeholder="Building / shop / street number" autoCapitalize="sentences" />
              <Field label="Address line 2 (optional)" value={loc.addressLine2 || ''} onChangeText={(t) => handleLocationChange('addressLine2', t)} placeholder="Floor, wing, suite" autoCapitalize="sentences" />
              <Field label="Area / locality *" value={loc.area || ''} onChangeText={(t) => handleLocationChange('area', t)} placeholder="Area / sector / colony" autoCapitalize="sentences" />
              <Field label="Landmark (optional)" value={loc.landmark || ''} onChangeText={(t) => handleLocationChange('landmark', t)} placeholder="Nearby landmark" autoCapitalize="sentences" />
              <View style={styles.pair}>
                <View style={styles.pairItem}>
                  <Field label="City" value={loc.city || 'Indore'} onChangeText={(t) => handleLocationChange('city', t)} placeholder="City" autoCapitalize="words" />
                </View>
                <View style={styles.pairItem}>
                  <Field label="Pincode" value={loc.pincode || ''} onChangeText={(t) => handleLocationChange('pincode', t.replace(/\D/g, ''))} placeholder="6-digit PIN" keyboardType="number-pad" />
                </View>
              </View>
            </Card>

            <Card title="Operation and timings">
              <View style={styles.pair}>
                <TimeBox label="Opening time" value={stringToTime(formData.openingTime)} onChange={(d) => changeTime('openingTime', d)} />
                <TimeBox label="Closing time" value={stringToTime(formData.closingTime)} onChange={(d) => changeTime('closingTime', d)} />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginBottom: space.sm }}>
                  <CalendarIcon size={16} color={color.primary} />
                  <Text style={[type.label, { color: color.text }]}>Operational days</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: space.xs + 2 }}>
                  {daysOfWeek.map((day) => {
                    const active = formData.openDays.includes(day);
                    return (
                      <Press key={day} scale={0.95} onPress={() => handleDayToggle(day)} accessibilityRole="checkbox" accessibilityLabel={day} accessibilityState={{ checked: active }} style={[styles.day, active && styles.dayOn]}>
                        <Text style={[type.caption, { fontFamily: 'Poppins_600SemiBold', color: active ? color.onPrimary : color.text }]}>{day}</Text>
                      </Press>
                    );
                  })}
                </View>
              </View>
              <Field label="Estimated delivery time" value={formData.estimatedDeliveryTime} onChangeText={(t) => handleInputChange('estimatedDeliveryTime', t)} placeholder="e.g. 30-40 mins" />
            </Card>

            <Card title="Cuisines served" right={<StatusBadge label="Max 8" tone="gold" />}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 280 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                  {ALL_CUISINES.map((cuisine) => {
                    const selected = formData.cuisines.includes(cuisine);
                    return (
                      <Press key={cuisine} scale={0.97} onPress={() => handleCuisineToggle(cuisine)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={cuisine} style={[styles.cuisine, selected && styles.cuisineOn]}>
                        <Text style={[type.label, { flexShrink: 1, color: selected ? color.primary : color.text }]} numberOfLines={2}>{cuisine}</Text>
                        {selected ? <Check size={16} color={color.primary} /> : null}
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
            <Card title="PAN card">
              <Field label="PAN card number" value={formData.panNumber} onChangeText={(t) => handleInputChange('panNumber', t.toUpperCase())} placeholder="e.g. ABCDE1234F" maxLength={10} autoCapitalize="characters" />
              <Field label="Name on PAN card" value={formData.nameOnPan} onChangeText={(t) => handleInputChange('nameOnPan', t)} placeholder="Exact name on PAN card" autoCapitalize="words" />
              <DocUpload title="PAN card copy" value={formData.panImage} getPreviewUrl={getPreviewUrl} onRemove={() => handleRemoveImage('panImage')} onPick={() => handlePhotoClick('panImage')} button="Upload PAN" />
            </Card>

            <Card title="Bank account">
              <Field label="Account holder name" value={formData.accountHolderName} onChangeText={(t) => handleInputChange('accountHolderName', formatNameToCapital(t.replace(/[^A-Za-z ]/g, '')))} placeholder="Name as in bank records" autoCapitalize="words" />
              <Field label="Bank account number" value={formData.accountNumber} onChangeText={(t) => handleInputChange('accountNumber', t.replace(/\D/g, ''))} placeholder="Enter account number" keyboardType="number-pad" secureTextEntry />
              <Field label="Confirm account number" value={formData.confirmAccountNumber} onChangeText={(t) => handleInputChange('confirmAccountNumber', t.replace(/\D/g, ''))} placeholder="Re-enter account number" keyboardType="number-pad" />
              <View style={styles.pair}>
                <View style={styles.pairItem}>
                  <Field label="IFSC code" value={formData.ifscCode} onChangeText={(t) => handleInputChange('ifscCode', t.toUpperCase())} placeholder="11-character IFSC" maxLength={11} autoCapitalize="characters" />
                </View>
                <View style={styles.pairItem}>
                  <Select label="Account type" value={formData.accountType} onChange={(v) => handleInputChange('accountType', v)} placeholder="Select type" options={[{ value: 'Saving', label: 'Saving' }, { value: 'Current', label: 'Current' }]} />
                </View>
              </View>
            </Card>

            <Card title="GST registration" right={<Switch value={Boolean(formData.gstRegistered)} onValueChange={() => handleInputChange('gstRegistered', !formData.gstRegistered)} accessibilityLabel="GST registered" />}>
              {formData.gstRegistered ? (
                <>
                  <Field label="GSTIN (GST number)" value={formData.gstNumber} onChangeText={(t) => handleInputChange('gstNumber', t.toUpperCase())} placeholder="e.g. 22AAAAA1111A1Z1" maxLength={15} autoCapitalize="characters" />
                  <Field label="GST legal business name" value={formData.gstLegalName} onChangeText={(t) => handleInputChange('gstLegalName', t)} placeholder="Legal firm / business name" autoCapitalize="words" />
                  <Field label="GST registered address" value={formData.gstAddress} onChangeText={(t) => handleInputChange('gstAddress', t)} placeholder="Registered business address" autoCapitalize="sentences" />
                  <DocUpload title="GST registration copy" value={formData.gstImage} getPreviewUrl={getPreviewUrl} onRemove={() => handleRemoveImage('gstImage')} onPick={() => handlePhotoClick('gstImage')} button="Upload GST certificate" />
                </>
              ) : (
                <Text style={[type.small, { color: color.textMuted }]}>Turn on if your business is GST registered.</Text>
              )}
            </Card>
          </>
        ) : null}

        {activeTab === 'docs' ? (
          <>
            <Card title="FSSAI licence">
              <Field label="FSSAI licence number" value={formData.fssaiNumber} onChangeText={(t) => handleInputChange('fssaiNumber', t.replace(/\D/g, ''))} placeholder="14-digit licence number" maxLength={14} keyboardType="number-pad" />
              <KitField label="Licence expiry date">
                <Press scale={0.98} onPress={openExpiry} accessibilityLabel={`License expiry date ${formData.fssaiExpiry || 'not set'}`} style={styles.select}>
                  <CalendarIcon size={18} color={color.primary} />
                  <Text style={[type.body, { flex: 1, color: formData.fssaiExpiry ? color.text : color.textMuted }]}>{formData.fssaiExpiry || 'yyyy-mm-dd'}</Text>
                </Press>
              </KitField>
              <DocUpload title="FSSAI licence copy" value={formData.fssaiImage} getPreviewUrl={getPreviewUrl} onRemove={() => handleRemoveImage('fssaiImage')} onPick={() => handlePhotoClick('fssaiImage')} button="Upload FSSAI licence" />
            </Card>

            <Card title="Menu photos" right={<StatusBadge label={`${formData.menuImages.length} / 10`} tone="neutral" />}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                {formData.menuImages.map((img, idx) => (
                  <View key={idx} style={styles.menuCell}>
                    <Img source={{ uri: getPreviewUrl(img) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`Menu photo ${idx + 1}`} />
                    <IconButton icon={X} label={`Remove menu photo ${idx + 1}`} variant="danger" size={36} iconSize={16} onPress={() => handleRemoveImage('menuImages', idx)} style={styles.menuRemove} />
                  </View>
                ))}
                {formData.menuImages.length < 10 ? (
                  <Press scale={0.98} onPress={() => handlePhotoClick('menuImages')} accessibilityLabel="Add menu photo" style={[styles.menuCell, styles.menuAdd]}>
                    <ImageIcon size={22} color={color.primary} />
                    <Text style={[type.label, { color: color.primary }]}>Add menu photo</Text>
                  </Press>
                ) : null}
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>

      <PinnedBar>
        <Button title={saving ? 'Uploading and saving…' : 'Save profile details'} size="lg" loading={saving} disabled={saveOff} onPress={handleSave} />
      </PinnedBar>

      <ImageSourcePicker
        isOpen={isPhotoPickerOpen}
        onClose={() => setIsPhotoPickerOpen(false)}
        onFileSelect={handlePhotoSelect}
        title={`Upload ${photoTitle}`}
        description="Choose file from gallery or snap with camera"
        fileNamePrefix={`${activeImageField || 'photo'}`}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tabsWrap: { backgroundColor: color.surface, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  card: { backgroundColor: color.surface, padding: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, gap: space.lg, ...elevation.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 },
  select: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  pairItem: { flex: 1, minWidth: 136 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: color.border },
  avatarRemove: { position: 'absolute', top: -6, right: -6 },
  menuType: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  menuTypeOn: { borderColor: color.primary, borderWidth: 2, backgroundColor: color.primarySoft },
  day: { flex: 1, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  dayOn: { backgroundColor: color.primary, borderColor: color.primary },
  cuisine: { flexGrow: 1, flexBasis: '45%', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs, paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border },
  cuisineOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  doc: { borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, borderRadius: radii.md, padding: space.md, backgroundColor: color.surfaceMuted, alignItems: 'center', gap: space.md },
  docPreview: { width: '100%', maxWidth: 220, aspectRatio: 4 / 3, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: color.border },
  docRemove: { position: 'absolute', top: space.xs, right: space.xs },
  menuCell: { flexGrow: 1, flexBasis: '45%', aspectRatio: 4 / 3, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: color.border },
  menuRemove: { position: 'absolute', top: space.xs, right: space.xs },
  menuAdd: { borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', gap: space.xs },
});
