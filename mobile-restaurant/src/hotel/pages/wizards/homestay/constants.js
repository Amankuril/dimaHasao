import { BedDouble, CheckSquare, Coffee, ShowerHead, Snowflake, Tv, Wifi } from 'lucide-react-native';

/* Port of the constants at the top of Frontend/src/modules/Hotel/app/partner/pages/AddHomestayWizard.jsx. */

export const WIZARD_STEPS = [
  { title: 'Basic info', short: 'Basics', subtitle: 'Name your homestay and describe it for guests.' },
  { title: 'Location', short: 'Location', subtitle: 'Where guests will find you, and the pin on the map.' },
  { title: 'Homestay amenities', short: 'Amenities', subtitle: 'What guests can use during their stay.' },
  { title: 'Nearby places', short: 'Nearby', subtitle: 'Landmarks and transport worth mentioning.' },
  { title: 'Property images', short: 'Photos', subtitle: 'A cover photo and a gallery of the property.' },
  { title: 'Inventory setup', short: 'Rooms', subtitle: 'Rooms or the whole home, with rates and how many you have.' },
  { title: 'House rules', short: 'Rules', subtitle: 'Check-in times, cancellation terms and house rules.' },
  { title: 'Documents', short: 'Documents', subtitle: 'Licences and certificates for verification.' },
  { title: 'Review & submit', short: 'Review', subtitle: 'Check everything over before sending it for approval.' },
];

export const REQUIRED_DOCS_HOMESTAY = [
  { type: 'ownership_proof', name: 'Ownership Proof (Sale Deed)' },
  { type: 'local_registration', name: 'Local Registration (Panchayat)' },
  { type: 'govt_id', name: 'Govt ID (Aadhar)' },
];

export const HOMESTAY_AMENITIES = ['WiFi', 'Breakfast', 'Local Assistance', 'Parking', 'Kitchen', 'Garden', 'Pet Friendly', 'Power Backup'];

// Room Amenities with Icons (Match Hotel Wizard Step 6 style)
export const ROOM_AMENITIES = [
  { label: 'AC', icon: Snowflake },
  { label: 'WiFi', icon: Wifi },
  { label: 'TV', icon: Tv },
  { label: 'Geyser', icon: ShowerHead },
  { label: 'Balcony', icon: BedDouble },
  { label: 'Tea/Coffee', icon: Coffee },
  { label: 'Attached Washroom', icon: CheckSquare },
];

export const HOUSE_RULES_OPTIONS = ['No smoking', 'No pets', 'No loud music', 'ID required at check-in'];

export const NEARBY_TYPE_OPTIONS = [
  { value: 'tourist', label: 'Tourist attraction' },
  { value: 'airport', label: 'Airport' },
  { value: 'market', label: 'Market' },
  { value: 'railway', label: 'Railway station' },
  { value: 'bus_stop', label: 'Bus stop' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'other', label: 'Other' },
];

export const emptyDocuments = () => REQUIRED_DOCS_HOMESTAY.map((d) => ({ type: d.type, name: d.name, fileUrl: '' }));

export const emptyPropertyForm = () => ({
  propertyName: '',
  description: '',
  shortDescription: '',
  hostLivesOnProperty: '',
  familyFriendly: '',
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
