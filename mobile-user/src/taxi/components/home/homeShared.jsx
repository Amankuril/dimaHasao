import { useEffect, useState } from 'react';
import Image from '../../../components/Img';
import { BACKEND_ORIGIN } from '../../api/runtimeConfig';

/* Shared constants, helpers and image components of the taxi Home (web pages/Home.jsx). */

export const taxiFallback = require('../../../../assets/taxi/user-app/taxi.png');
export const bikeFallback = require('../../../../assets/taxi/user-app/bike.png');
export const deliveryFallback = require('../../../../assets/taxi/user-app/delivery.png');
export const parcelFallback = require('../../../../assets/taxi/user-app/parcel.png');
export const truckFallback = require('../../../../assets/taxi/user-app/truck.png');
export const busFallback = require('../../../../assets/taxi/user-app/fallback-car.png'); // bus.png is damaged in the web repo
export const fallbackCar = require('../../../../assets/taxi/user-app/fallback-car.png');
export const yellowTaxiImg = require('../../../../assets/taxi/user-app/yellow-taxi.jpg');
export const seamlessHighwayBg = require('../../../../assets/taxi/user-app/yellow-taxi.jpg'); // seamless_highway_bg.png is damaged in the web repo
export const airplaneIcon = require('../../../../assets/taxi/3d images/AutoCab/airoplan.png');
export const railwayIcon = require('../../../../assets/taxi/3d images/AutoCab/one way.png');
export const busStationIcon = require('../../../../assets/taxi/3d images/AutoCab/bus.png');

export const ACTIVE_RIDE_SYNC_INTERVAL_MS = 15000;
export const IDLE_RIDE_SYNC_INTERVALS_MS = [60000, 120000, 180000];
export const DEFERRED_SECTION_DELAY_MS = 250;
export const FORCED_SYNC_COOLDOWN_MS = 10000;

/** Image `source` for an admin-configured item: a URL (made absolute, cache-busted) or the bundled fallback. */
export const getDynamicImageSrc = (item = {}, fallbackImage) => {
  const rawImage = item.uploadedImage || item.imageUrl || item.image || item.bannerImage || item.thumbnail || item.url || item.icon || null;
  if (!rawImage || typeof rawImage !== 'string') return fallbackImage;
  let imageUrl = rawImage;
  if (!rawImage.startsWith('http') && !rawImage.startsWith('data:')) {
    const origin = String(BACKEND_ORIGIN || '').replace('/api/v1', '');
    const cleanPath = rawImage.startsWith('/') ? rawImage : `/${rawImage}`;
    imageUrl = `${origin}${cleanPath}`;
  }
  if (item.updatedAt) {
    const separator = imageUrl.includes('?') ? '&' : '?';
    imageUrl = `${imageUrl}${separator}v=${item.updatedAt}`;
  }
  return imageUrl;
};

/** `source` prop for Img from either a bundled module or a URL string. */
export const toSource = (src) => (typeof src === 'string' ? { uri: src } : src);

/** <img onError -> fallback> */
export function SafeImage({ item, fallbackImage, style, resizeMode = 'contain' }) {
  const resolved = getDynamicImageSrc(item, fallbackImage);
  const [src, setSrc] = useState(resolved);
  useEffect(() => setSrc(resolved), [resolved]);
  return <Image source={toSource(src)} style={style} resizeMode={resizeMode} onError={() => setSrc(fallbackImage)} />;
}

export const defaultSettings = {
  homeSections: {
    enableEverything: true,
    enableExplore: true,
    enablePromo: true,
    enableGoPlaces: true,
    enableFooter: true,
  },
  everything: [
    { id: '1', title: 'Book now', subtitle: 'Your everyday rides', image: '', route: '/taxi/user/ride/select-location', order: 1, status: 'active' },
    { id: '2', title: 'Bike Taxi', subtitle: 'Beat the traffic', image: '', route: '/taxi/user/ride/select-location', order: 2, status: 'active' },
    { id: '3', title: 'Outstation', subtitle: 'Trips beyond the district', image: '', route: '/taxi/user/intercity', order: 3, status: 'active' },
    { id: '4', title: 'All Services', subtitle: 'All Services', image: '', route: '', order: 4, status: 'active' },
  ],
  explore: [
    { id: '1', title: 'Auto', image: '', route: '/taxi/user/ride/select-location', order: 1, status: 'active' },
    { id: '2', title: 'Cab Economy', image: '', route: '/taxi/user/ride/select-location', order: 2, status: 'active' },
    { id: '3', title: 'Bike', image: '', route: '/taxi/user/ride/select-location', order: 3, status: 'active' },
    { id: '4', title: 'Outstation', image: '', route: '/taxi/user/intercity', order: 4, status: 'active' },
  ],
  promos: [
    { id: '1', title: 'Rides across Dima Hasao', subtitle: 'Haflong, Maibang, Umrangso and everywhere between.', image: '', route: '/taxi/user/ride/select-location', order: 1, status: 'active' },
    { id: '2', title: 'Heading out of the district?', subtitle: 'Book an outstation cab to Silchar, Guwahati or Lumding.', image: '', route: '/taxi/user/intercity', order: 2, status: 'active' },
  ],
  goPlaces: [
    { id: '1', title: 'Rides to Haflong Railway Station', image: '', route: '/taxi/user/ride/select-location', order: 1, status: 'active' },
    { id: '2', title: 'Airport transfers to Silchar', image: '', route: '/taxi/user/intercity', order: 2, status: 'active' },
    { id: '3', title: 'Outstation trips', image: '', route: '/taxi/user/intercity', order: 3, status: 'active' },
  ],
  footer: {
    hashtag: '#DimaHasao',
    line1: 'Made for the district',
    line2: 'Crafted for riders',
  },
};

export const getCurrentRideIcon = (ride) => {
  const customIcon = String(ride?.vehicleIconUrl || ride?.vehicle?.vehicleIconUrl || ride?.vehicle?.icon || ride?.driver?.vehicleIconUrl || '').trim();
  if (customIcon && !customIcon.includes('localhost') && !customIcon.startsWith('/')) return customIcon;
  const serviceType = String(ride?.serviceType || ride?.type || '').toLowerCase();
  const iconType = String(ride?.vehicleIconType || ride?.driver?.vehicleIconType || ride?.driver?.vehicleType || '').toLowerCase();
  if (serviceType === 'parcel' || serviceType === 'delivery') return parcelFallback;
  if (iconType.includes('bike')) return bikeFallback;
  if (iconType.includes('auto')) return taxiFallback;
  if (serviceType === 'bus') return busFallback;
  return taxiFallback;
};

export const unwrapApiPayload = (response) => response?.data?.data || response?.data || response;

export const formatScheduledDateTime = (value) => {
  if (!value) return 'Scheduled time pending';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Scheduled time pending';
  return parsed.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const getScheduledCountdownLabel = (value, now = Date.now()) => {
  const parsed = value ? new Date(value) : null;
  const time = parsed?.getTime?.() || NaN;
  if (!Number.isFinite(time)) return '';
  const diffMs = time - now;
  if (diffMs <= 0) return 'Pickup window is opening now';
  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m`;
};

export const normalizeRentalCurrentRideSnapshot = (ride = {}, previousRide = {}) => {
  if (!ride) return null;
  const assignedVehicle = ride.assignedVehicle || previousRide.assignedVehicle || {};
  const selectedPackage = ride.selectedPackage || previousRide.selectedPackage || null;
  const rideMetrics = ride.rideMetrics || previousRide.rideMetrics || {};
  const serviceLocation = ride.serviceLocation || previousRide.serviceLocation || null;
  const bookingReference = ride.bookingReference || previousRide.bookingReference || '';
  const vehicleName = assignedVehicle?.name || ride.vehicleName || previousRide.vehicleName || previousRide?.vehicle?.name || 'Assigned Vehicle';
  const vehicleImage = assignedVehicle?.image || ride.vehicleImage || previousRide.vehicleImage || previousRide?.vehicle?.image || '';
  const vehicleCategory = assignedVehicle?.vehicleCategory || ride.vehicleCategory || previousRide.vehicleCategory || previousRide?.driver?.vehicle || 'Rental';

  return {
    ...previousRide,
    ...ride,
    rideId: ride.id || ride.rideId || previousRide.rideId || '',
    bookingReference,
    fare: rideMetrics?.currentCharge ?? ride.fare ?? previousRide.fare ?? ride.payableNow ?? 0,
    totalCost: ride.totalCost ?? previousRide.totalCost ?? 0,
    advancePaid: ride.payableNow ?? ride.advancePaid ?? previousRide.advancePaid ?? 0,
    status: ride.status || previousRide.status || 'assigned',
    liveStatus: ride.status || ride.liveStatus || previousRide.liveStatus || 'assigned',
    serviceType: 'rental',
    vehicleName,
    vehicleImage,
    vehicleCategory,
    vehicle: { ...(previousRide.vehicle || {}), name: vehicleName, image: vehicleImage, vehicleIconUrl: vehicleImage },
    driver: { ...(previousRide.driver || {}), name: vehicleName, vehicle: vehicleCategory, vehicleType: vehicleCategory, vehicleIconUrl: vehicleImage },
    vehicleIconUrl: vehicleImage || previousRide.vehicleIconUrl || '',
    assignedAt: ride.assignedAt || previousRide.assignedAt || ride.createdAt || null,
    completionRequestedAt: ride.completionRequestedAt || previousRide.completionRequestedAt || null,
    hourlyRate: rideMetrics?.hourlyRate ?? ride.hourlyRate ?? previousRide.hourlyRate ?? 0,
    includedHours: rideMetrics?.includedHours ?? ride.includedHours ?? previousRide.includedHours ?? selectedPackage?.durationHours ?? 0,
    basePrice: rideMetrics?.basePrice ?? ride.basePrice ?? previousRide.basePrice ?? selectedPackage?.price ?? ride.totalCost ?? 0,
    extraHourRate: rideMetrics?.extraHourRate ?? ride.extraHourRate ?? previousRide.extraHourRate ?? selectedPackage?.extraHourPrice ?? 0,
    elapsedMinutes: rideMetrics?.elapsedMinutes ?? ride.elapsedMinutes ?? previousRide.elapsedMinutes ?? 0,
    remainingDue: rideMetrics?.remainingDue ?? ride.remainingDue ?? previousRide.remainingDue ?? 0,
    requestedHours: ride.requestedHours ?? previousRide.requestedHours ?? selectedPackage?.durationHours ?? 0,
    selectedPackage,
    paymentMethodLabel: ride.paymentMethodLabel || previousRide.paymentMethodLabel || '',
    serviceLocation,
    assignedVehicle,
    finalCharge: ride.finalCharge ?? previousRide.finalCharge ?? 0,
    finalElapsedMinutes: ride.finalElapsedMinutes ?? previousRide.finalElapsedMinutes ?? 0,
    updatedAt: ride.updatedAt || previousRide.updatedAt || Date.now(),
  };
};

export const isRentalCurrentRide = (ride) => String(ride?.serviceType || ride?.type || '').toLowerCase() === 'rental';

export const calculateDistanceKm = (fromCoords, toCoords) => {
  const [fromLng, fromLat] = fromCoords;
  const [toLng, toLat] = toCoords;
  if (![fromLng, fromLat, toLng, toLat].every((value) => Number.isFinite(Number(value)))) return null;
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (earthRadiusKm * c).toFixed(1);
};
