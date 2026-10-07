import { Coffee, Snowflake, Sun, Tv, Trees, Mountain, ShowerHead, Waves, Wifi } from 'lucide-react-native';

/* Port of the constants at the top of Frontend/src/modules/Hotel/app/partner/pages/AddResortWizard.jsx. */

export const WIZARD_STEPS = [
  { title: 'Basic Info', short: 'Basics', subtitle: 'Name your resort and describe what makes it a destination.' },
  { title: 'Location', short: 'Location', subtitle: 'Where guests will find you, and the pin on the map.' },
  { title: 'Amenities', short: 'Amenities', subtitle: 'What the resort offers on site.' },
  { title: 'Nearby Places', short: 'Nearby', subtitle: 'Landmarks and transport worth mentioning.' },
  { title: 'Resort Images', short: 'Photos', subtitle: 'A cover photo and a gallery of the resort.' },
  { title: 'Cottages & Rooms', short: 'Rooms', subtitle: 'Each cottage or room you sell, with its rate and count.' },
  { title: 'Resort Rules', short: 'Rules', subtitle: 'Check-in times, cancellation terms and house rules.' },
  { title: 'Documents', short: 'Documents', subtitle: 'Licences and certificates for verification.' },
  { title: 'Review & Submit', short: 'Review', subtitle: 'Check everything over before sending it for approval.' },
];

export const REQUIRED_DOCS_RESORT = [
  { type: 'trade_license', name: 'Trade License' },
  { type: 'gst_certificate', name: 'GST Certificate' },
  { type: 'fssai_license', name: 'FSSAI License' },
  { type: 'fire_safety', name: 'Fire Safety Certificate' },
];

export const RESORT_AMENITIES = ['Swimming Pool', 'Restaurant', 'Bar', 'Parking'];
export const RESORT_ACTIVITIES = ['Water Sports', 'Spa', 'Bonfire', 'Indoor Games'];
export const RESORT_TYPES = [
  { value: 'beach', label: 'Beach Resort', icon: Waves },
  { value: 'hill', label: 'Hill Resort', icon: Mountain },
  { value: 'jungle', label: 'Jungle Resort', icon: Trees },
  { value: 'desert', label: 'Desert Resort', icon: Sun },
];
export const ROOM_AMENITIES_OPTIONS = [
  { key: 'seaview', label: 'Sea View', icon: Waves },
  { key: 'ac', label: 'AC', icon: Snowflake },
  { key: 'minibar', label: 'Mini Bar', icon: Coffee },
  { key: 'wifi', label: 'WiFi', icon: Wifi },
  { key: 'tv', label: 'TV', icon: Tv },
  { key: 'geyser', label: 'Geyser', icon: ShowerHead },
];
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

export const emptyDocuments = () => REQUIRED_DOCS_RESORT.map((d) => ({ type: d.type, name: d.name, fileUrl: '' }));

export const initialPropertyForm = () => ({
  propertyName: '',
  description: '',
  shortDescription: '',
  resortType: '',
  activities: [],
  coverImage: '',
  propertyImages: [],
  address: { state: '', city: '', fullAddress: '', pincode: '' },
  location: { type: 'Point', coordinates: ['', ''] },
  nearbyPlaces: [],
  amenities: [],
  checkInTime: '',
  checkOutTime: '',
  contactNumber: '',
  cancellationPolicy: '',
  houseRules: [],
  documents: emptyDocuments(),
});
