import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

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
  { title: 'Basic info', short: 'Basics', subtitle: 'Name your property and describe it for guests.' },
  { title: 'Location', short: 'Location', subtitle: 'Where guests will find you, and the pin on the map.' },
  { title: 'Amenities', short: 'Amenities', subtitle: 'What the property offers on site.' },
  { title: 'Nearby places', short: 'Nearby', subtitle: 'Landmarks and transport worth mentioning.' },
  { title: 'Property images', short: 'Photos', subtitle: 'A cover photo and a gallery of the property.' },
  { title: 'Room types', short: 'Rooms', subtitle: 'Each room you sell, with its rate and how many you have.' },
  { title: 'Property rules', short: 'Rules', subtitle: 'Check-in times, cancellation terms and house rules.' },
  { title: 'Documents', short: 'Documents', subtitle: 'Licences and certificates for verification.' },
  { title: 'Review & submit', short: 'Review', subtitle: 'Check everything over before sending it for approval.' },
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
  { value: 'tourist', label: 'Tourist attraction' },
  { value: 'airport', label: 'Airport' },
  { value: 'market', label: 'Market' },
  { value: 'railway', label: 'Railway station' },
  { value: 'bus_stop', label: 'Bus stop' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'other', label: 'Other' },
];

export const blankDocuments = () => REQUIRED_DOCS_HOTEL.map((d) => ({ type: d.type, name: d.name, fileUrl: '' }));

// The step furniture (heading, error banner, search status, select) is shared
// with the homestay and resort wizards; see hotel/components/wizardUi.
export { ErrorBanner, SearchStatus, SectionHeading, SelectBox as Select } from '../../../components/wizardUi';

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
        { text: 'Use camera', onPress: () => finish('camera') },
        { text: 'Upload from device', onPress: () => finish('gallery') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve([]) },
      ],
      { cancelable: true, onDismiss: () => resolve([]) }
    );
  });
}
