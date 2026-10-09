/**
 * The web app stores icons as Font Awesome class strings in its data files
 * (tourismData.js, tags, etc.) — meaningless in RN, which has no FA web font
 * loaded. Rather than rewrite every data file, this maps those slugs (and a
 * few short custom ones used by the ported service files) onto
 * `lucide-react-native` components, which we already installed for crisp
 * vector icons without a font/asset dependency.
 *
 * Unmapped slugs fall back to MapPin rather than throwing, since these
 * strings come from data (sometimes from the backend) that can drift ahead
 * of this map.
 */
import React from 'react';
import * as Lucide from 'lucide-react-native';

const MAP = {
  bars: 'Menu',
  bell: 'Bell',
  'location-dot': 'MapPin',
  'map-pin': 'MapPin',
  car: 'Car',
  'car-side': 'Car',
  hotel: 'Building2',
  utensils: 'UtensilsCrossed',
  'arrow-right': 'ArrowRight',
  'magnifying-glass': 'Search',
  xmark: 'X',
  microphone: 'Mic',
  'user-tie': 'UserRound',
  'calendar-days': 'CalendarDays',
  'suitcase-rolling': 'Luggage',
  'bowl-food': 'Soup',
  'phone-volume': 'PhoneCall',
  'circle-check': 'CheckCircle2',
  phone: 'Phone',
  camera: 'Camera',
  vihara: 'Landmark',
  sun: 'Sun',
  'shopping-bag': 'ShoppingBag',
  church: 'Landmark',
  mountain: 'Mountain',
  campground: 'Tent',
  binoculars: 'Eye',
  leaf: 'Leaf',
  users: 'Users',
  'bottle-water': 'Droplet',
  'shoe-prints': 'Footprints',
  'trash-can': 'Trash2',
  star: 'Star',
  wifi: 'Wifi',
  'square-parking': 'SquareParking',
  restaurant: 'UtensilsCrossed',
  food: 'UtensilsCrossed',
  ac: 'Snowflake',
  snowflake: 'Snowflake',
  'thermometer-sun': 'ThermometerSun',
  tv: 'Tv',
  zap: 'Zap',
  flame: 'Flame',
  shirt: 'Shirt',
  waves: 'Waves',
  'circle-check-outline': 'CheckCircle2',
  'route': 'Route',
  wallet: 'Wallet',
  headset: 'Headphones',
  receipt: 'Receipt',
  home: 'Home',
  compass: 'Compass',
  user: 'User',
};

const faSlug = name => String(name || '').replace(/^fa-(solid|regular|brands)\s+fa-/, '');

export function getIconComponent(name) {
  const slug = faSlug(name).trim().toLowerCase();
  const componentName = MAP[slug];
  return (componentName && Lucide[componentName]) || Lucide.MapPin;
}

export default function AppIcon({name, size = 16, color = '#000', style}) {
  const Icon = getIconComponent(name);
  return <Icon size={size} color={color} style={style} />;
}
