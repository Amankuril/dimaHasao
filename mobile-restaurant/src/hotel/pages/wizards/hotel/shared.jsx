import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AlertCircle, ChevronDown } from 'lucide-react-native';
import { Press } from '../../../../components/ui';
import { poppins, tw } from '../../../../theme';
import BottomSheet from '../../../components/BottomSheet';
import { HT, WIZARD, wizard, wizardInput } from '../../../theme';

/*
 * Shared pieces of the hotel property wizard.
 * Port of the helper components and constants at the top of
 * Frontend/src/modules/Hotel/app/partner/pages/AddHotelWizard.jsx.
 */

/**
 * The nine steps, in order.
 *
 * The subtitle is what the step actually asks for.
 */
export const WIZARD_STEPS = [
  { title: 'Basic Info', short: 'Basics', subtitle: 'Name your property and describe it for guests.' },
  { title: 'Location', short: 'Location', subtitle: 'Where guests will find you, and the pin on the map.' },
  { title: 'Amenities', short: 'Amenities', subtitle: 'What the property offers on site.' },
  { title: 'Nearby Places', short: 'Nearby', subtitle: 'Landmarks and transport worth mentioning.' },
  { title: 'Property Images', short: 'Photos', subtitle: 'A cover photo and a gallery of the property.' },
  { title: 'Room Types', short: 'Rooms', subtitle: 'Each room you sell, with its rate and how many you have.' },
  { title: 'Property Rules', short: 'Rules', subtitle: 'Check-in times, cancellation terms and house rules.' },
  { title: 'Documents', short: 'Documents', subtitle: 'Licences and certificates for verification.' },
  { title: 'Review & Submit', short: 'Review', subtitle: 'Check everything over before sending it for approval.' },
];

export const REQUIRED_DOCS_HOTEL = [
  { type: 'trade_license', name: 'Trade License' },
  { type: 'gst_certificate', name: 'GST Certificate' },
  { type: 'fssai_license', name: 'FSSAI License' },
  { type: 'fire_safety', name: 'Fire Safety Certificate' },
];
export const HOTEL_AMENITIES = ['Lift', 'Restaurant', 'Room Service', 'Swimming Pool', 'Parking', 'Gym', 'Spa', 'Bar'];
export const HOUSE_RULES_OPTIONS = ['No smoking', 'No pets', 'No loud music', 'ID required at check-in'];

export const NEARBY_TYPES = [
  { value: 'tourist', label: 'Tourist Attraction' },
  { value: 'airport', label: 'Airport' },
  { value: 'market', label: 'Market' },
  { value: 'railway', label: 'Railway Station' },
  { value: 'bus_stop', label: 'Bus Stop' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'other', label: 'Other' },
];

export const blankDocuments = () => REQUIRED_DOCS_HOTEL.map((d) => ({ type: d.type, name: d.name, fileUrl: '' }));

/**
 * Width of one cell in a Tailwind `grid grid-cols-N gap-3` inside the wizard
 * card (max-w-3xl page, px-4, card p-5 / md:p-7 plus its 1px border).
 */
export function useGridCell(narrowCols, wideCols, gap = 12) {
  const { width } = useWindowDimensions();
  const cols = width >= 640 ? wideCols : narrowCols;
  const inner = Math.min(width, 768) - 32 - 2 * (width >= 768 ? 28 : 20) - 2;
  return Math.floor((inner - gap * (cols - 1)) / cols);
}

/** One consistent heading for every step's card. */
export function SectionHeading({ icon: Icon, title, description }) {
  return (
    <View style={s.sectionHeading}>
      <View style={s.sectionIcon}>
        <Icon size={18} color={HT.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {description ? <Text style={s.sectionDescription}>{description}</Text> : null}
      </View>
    </View>
  );
}

/** Validation errors looked different on almost every step; this is the one look. */
export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={s.errorBanner}>
      <AlertCircle size={16} color={tw.red500} style={{ marginTop: 2 }} />
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
}

/**
 * Feedback under an address search box. A deployment with no Maps key is a
 * normal state for this app, so it reads as a note rather than a failure.
 */
export function SearchStatus({ search }) {
  if (search.status === 'searching') {
    return (
      <View style={[s.row, { marginTop: 8, gap: 8 }]}>
        <ActivityIndicator size="small" color={tw.gray400} />
        <Text style={s.statusMuted}>Searching…</Text>
      </View>
    );
  }
  if (search.mapsUnavailable) {
    return (
      <View style={s.mapsNote}>
        <AlertCircle size={13} color={tw.amber700} style={{ marginTop: 2 }} />
        <Text style={s.mapsNoteText}>Address lookup is unavailable right now — please fill in the address below by hand.</Text>
      </View>
    );
  }
  if (search.status === 'empty') {
    return <Text style={[s.statusMuted, { marginTop: 8 }]}>No matches. Try a different search, or enter the address below.</Text>;
  }
  if (search.status === 'error') {
    return <Text style={[s.statusMuted, { marginTop: 8, color: tw.red600 }]}>Could not search just now. Try again, or enter the address below.</Text>;
  }
  return null;
}

/** `.input`: a wizard text field with its focus ring. */
export function WInput({ style, onFocus, onBlur, multiline, invalid, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={WIZARD.placeholder}
      multiline={multiline}
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[wizardInput({ focused, multiline, invalid }), style]}
    />
  );
}

/** A decimal keypad field, the web's `<input type="number">`. */
export function NumInput({ onChangeText, ...rest }) {
  // `<input type="number">` takes digits and a decimal point only.
  return <WInput keyboardType="decimal-pad" onChangeText={onChangeText ? (v) => onChangeText(v.replace(/[^0-9.]/g, '')) : undefined} {...rest} />;
}

/** `.wizard-label`, with the red required star the web adds in a span. */
export function Label({ children, required }) {
  return (
    <Text style={wizard.label}>
      {children}
      {required ? <Text style={{ color: tw.red500 }}> *</Text> : null}
    </Text>
  );
}

/** The web's `<select className="input appearance-none">`, as a field that opens a sheet of options. */
export function Select({ value, options, onChange, title }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Press scale={1} onPress={() => setOpen(true)} style={[wizardInput(), wizard.select, s.selectBox]}>
        <Text style={s.selectText} numberOfLines={1}>{current ? current.label : ''}</Text>
        <ChevronDown size={16} color={WIZARD.muted} style={s.selectChevron} />
      </Press>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={title}>
        {options.map((o) => (
          <Press
            key={o.value}
            scale={1}
            onPress={() => {
              onChange(o.value);
              setOpen(false);
            }}
            style={[s.option, o.value === value ? { backgroundColor: HT.primaryTint } : null]}
          >
            <Text style={[s.optionText, o.value === value ? { color: HT.primary, ...poppins(700) } : null]}>{o.label}</Text>
          </Press>
        ))}
      </BottomSheet>
    </>
  );
}

/**
 * The web opens a file chooser, or inside the old wrapper the camera. Here the
 * partner picks the camera or the gallery. Resolves to picked files
 * ({ uri, name, type, size }), [] when cancelled.
 */
export function pickImages({ multiple = false } = {}) {
  return new Promise((resolve) => {
    const finish = async (source) => {
      try {
        const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(source === 'camera' ? 'Camera permission is required' : 'Photo library permission is required');
          resolve([]);
          return;
        }
        const opts = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false, exif: false };
        const res =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync(opts)
            : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: multiple });
        if (res.canceled || !res.assets?.length) {
          resolve([]);
          return;
        }
        resolve(
          res.assets.map((a, i) => {
            const type = a.mimeType || 'image/jpeg';
            const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
            return { uri: a.uri, name: a.fileName || `hotel-${Date.now()}-${i}.${ext}`, type, size: a.fileSize ?? null };
          })
        );
      } catch {
        Alert.alert('Could not open camera or gallery');
        resolve([]);
      }
    };
    Alert.alert(
      'Add photo',
      'Choose how you want to upload your photo.',
      [
        { text: 'Use Camera', onPress: () => finish('camera') },
        { text: 'Upload from Device', onPress: () => finish('gallery') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve([]) },
      ],
      { cancelable: true, onDismiss: () => resolve([]) }
    );
  });
}

export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  sectionIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: HT.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  sectionDescription: { fontSize: 12, lineHeight: 16, marginTop: 2, color: tw.gray500, ...poppins(400) },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red100, borderRadius: 12 },
  errorText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.red700, ...poppins(500) },
  statusMuted: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(400) },
  mapsNote: { marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: tw.amber50, borderWidth: 1, borderColor: tw.amber100, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  mapsNoteText: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.amber700, ...poppins(400) },
  selectBox: { justifyContent: 'center' },
  selectText: { fontSize: 15, lineHeight: 21, color: WIZARD.text, ...poppins(400) },
  selectChevron: { position: 'absolute', right: 14, top: '50%', marginTop: -8 },
  option: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 },
  optionText: { fontSize: 15, lineHeight: 21, color: tw.gray800, ...poppins(500) },
});
