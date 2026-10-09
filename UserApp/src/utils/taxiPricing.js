/**
 * Ported verbatim from Frontend/src/modules/Taxi/modules/user/pages/ride/SelectVehicle.jsx
 * (pure functions only — no DOM/browser dependency, so nothing here changed
 * for RN). This is the exact fare math and pricing-rule matching the web
 * app uses, factored out so SelectVehicleScreen isn't a 2,800-line file.
 */
const AVERAGE_CITY_SPEED_KMPH = 24;

export const unwrap = response => response?.data?.data || response?.data || response;

export const normalizeId = value => String(value?._id || value?.id || value || '').trim();

export const calculateDistanceMeters = (fromCoords = [], toCoords = []) => {
  const [fromLng, fromLat] = fromCoords;
  const [toLng, toLat] = toCoords;
  if (![fromLng, fromLat, toLng, toLat].every(v => Number.isFinite(Number(v)))) return 0;

  const toRadians = v => (Number(v) * Math.PI) / 180;
  const R = 6371000;
  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const a =
    Math.sin(latDelta / 2) ** 2 + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(lngDelta / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const estimateDurationMinutes = (distanceMeters = 0) => {
  if (!Number.isFinite(Number(distanceMeters)) || Number(distanceMeters) <= 0) return 0;
  const metersPerMinute = (AVERAGE_CITY_SPEED_KMPH * 1000) / 60;
  return Math.max(1, Math.round(Number(distanceMeters) / metersPerMinute));
};

const getIconValue = type => String(type?.icon_types || type?.vehicleIconType || type?.name || '').toLowerCase();
export const getTypeLabel = type => type?.name || type?.vehicle_type || type?.label || 'Vehicle';

export const getFallbackVehicleEstimate = type => {
  const value = getIconValue(type);
  const label = getTypeLabel(type).toLowerCase();
  if (value.includes('bike') || label.includes('bike')) return 22;
  if (value.includes('auto') || label.includes('auto')) return 40;
  if (value.includes('premium') || value.includes('lux') || label.includes('premium') || label.includes('lux')) return 130;
  if (value.includes('suv') || label.includes('suv')) return 150;
  return 106;
};

export const getCapacity = type => {
  const value = getIconValue(type);
  if (value.includes('scooty')) return 1;
  if (value.includes('bus') && !value.includes('mini')) return 40;
  if (value.includes('mini_bus') || value.includes('minibus')) return 15;
  if (value.includes('car_7_seater')) return 7;
  if (value.includes('car_5_seater')) return 5;
  if (value.includes('bike')) return 1;
  if (value.includes('auto')) return 3;
  if (value.includes('suv')) return 6;
  return 4;
};

export const getNormalizedCategory = type => {
  const cat = String(type?.category || '').trim().toLowerCase();
  if (cat) {
    if (cat.includes('car')) return 'car';
    if (cat.includes('bike') || cat.includes('scooty')) return 'bike';
    if (cat.includes('auto')) return 'auto';
    return cat;
  }
  const icon = String(type?.icon_types || '').trim().toLowerCase();
  if (icon.includes('bike') || icon.includes('scooty')) return 'bike';
  if (icon.includes('auto')) return 'auto';
  return 'car';
};

export const getVehicleTypes = response => {
  const data = unwrap(response);
  return data?.vehicle_types || data?.results || (Array.isArray(data) ? data : []);
};

export const normalizeVehicleType = (type, index) => {
  const id = String(type?._id || type?.id || type?.name || index);
  const dispatchType = String(type?.dispatch_type || 'normal').trim().toLowerCase();

  return {
    id,
    vehicleTypeId: type?._id || type?.id || '',
    transportType: String(type?.transport_type || 'taxi').trim().toLowerCase() || 'taxi',
    iconType: type?.icon_types || 'car',
    category: getNormalizedCategory(type),
    name: getTypeLabel(type),
    capacity: getCapacity(type),
    sublabel: type?.short_description || type?.description || 'Available ride',
    price: getFallbackVehicleEstimate(type),
    dispatchType,
    // Bidding (rider-proposed fare) is a secondary negotiation feature the RN
    // port doesn't build a UI for yet — every vehicle books instantly at the
    // calculated fare instead. Flag kept for parity with ride-history payloads.
    supportsBidding: dispatchType === 'bidding' || dispatchType === 'both',
    raw: type,
  };
};

export const resolveRideTransportType = (...values) => {
  for (const value of values) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) continue;
    if (normalized === 'both' || normalized === 'all') continue;
    return normalized;
  }
  return 'taxi';
};

const getRuleServiceLocationId = rule =>
  normalizeId(
    rule?.service_location_id?._id ||
      rule?.service_location_id?.id ||
      rule?.service_location_id ||
      rule?.zone?.service_location?._id ||
      rule?.zone?.service_location?.id ||
      rule?.zone?.service_location_id ||
      '',
  );

const getRuleZoneId = rule =>
  normalizeId(rule?.zone_id?._id || rule?.zone_id?.id || rule?.zone_id || rule?.zone?._id || rule?.zone?.id || rule?.zone || '');

const sortPricingRules = (rules = []) =>
  [...rules].sort((first, second) => {
    const firstUpdatedAt = new Date(first?.updatedAt || first?.createdAt || 0).getTime();
    const secondUpdatedAt = new Date(second?.updatedAt || second?.createdAt || 0).getTime();
    return secondUpdatedAt - firstUpdatedAt;
  });

const isActiveRidePricingRule = rule => {
  const isActive = Number(rule?.active ?? 1) === 1 && String(rule?.status || 'active').toLowerCase() !== 'inactive';
  const scope = String(rule?.pricing_scope || 'ride').trim().toLowerCase();
  return isActive && scope === 'ride';
};

const matchesTransportType = (rule, transportType) => {
  const normalizedRuleTransport = String(rule?.transport_type || 'taxi').trim().toLowerCase();
  const normalizedTransportType = String(transportType || 'taxi').trim().toLowerCase() || 'taxi';
  return normalizedRuleTransport === normalizedTransportType || normalizedRuleTransport === 'both';
};

/**
 * zone > service-location > generic matching, same precedence as the
 * server's own resolver (see the long comment in the web source this was
 * ported from for why the last fallback exists: it keeps the quoted fare in
 * agreement with what the server actually bills).
 */
export const findBestPricingRule = ({rules, vehicleTypeId, zoneId, serviceLocationId, transportType}) => {
  const normalizedVehicleTypeId = normalizeId(vehicleTypeId);
  const normalizedZoneId = normalizeId(zoneId);
  const normalizedServiceLocationId = normalizeId(serviceLocationId);
  const normalizedTransportType = String(transportType || 'taxi').trim().toLowerCase() || 'taxi';

  const candidates = sortPricingRules(
    rules.filter(rule => {
      const matchesVehicle = normalizeId(rule?.vehicle_type?._id || rule?.vehicle_type || rule?.type_id) === normalizedVehicleTypeId;
      return matchesVehicle && isActiveRidePricingRule(rule) && matchesTransportType(rule, normalizedTransportType);
    }),
  );

  if (!candidates.length) return null;

  const exactTransportMatch = rule => String(rule?.transport_type || 'taxi').trim().toLowerCase() === normalizedTransportType;

  const exactZone = candidates.find(rule => normalizedZoneId && getRuleZoneId(rule) === normalizedZoneId && exactTransportMatch(rule));
  if (exactZone) return exactZone;

  const exactZoneAnyTransport = candidates.find(rule => normalizedZoneId && getRuleZoneId(rule) === normalizedZoneId);
  if (exactZoneAnyTransport) return exactZoneAnyTransport;

  const exactServiceLocation = candidates.find(
    rule => normalizedServiceLocationId && getRuleServiceLocationId(rule) === normalizedServiceLocationId && exactTransportMatch(rule),
  );
  if (exactServiceLocation) return exactServiceLocation;

  const exactServiceLocationAnyTransport = candidates.find(
    rule => normalizedServiceLocationId && getRuleServiceLocationId(rule) === normalizedServiceLocationId,
  );
  if (exactServiceLocationAnyTransport) return exactServiceLocationAnyTransport;

  const genericTransportMatch = candidates.find(rule => !getRuleServiceLocationId(rule) && !getRuleZoneId(rule) && exactTransportMatch(rule));
  if (genericTransportMatch) return genericTransportMatch;

  const genericBoth = candidates.find(rule => !getRuleServiceLocationId(rule) && !getRuleZoneId(rule));
  if (genericBoth) return genericBoth;

  const anyExactTransportMatch = candidates.find(exactTransportMatch);
  if (anyExactTransportMatch) return anyExactTransportMatch;

  return candidates[0] || null;
};

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const calculateEstimatedFare = ({vehicle, pricingRule, distanceMeters, durationMinutes}) => {
  const fallbackFare = getFallbackVehicleEstimate(vehicle?.raw || vehicle);
  if (!pricingRule) return fallbackFare;

  const distanceKm = Math.max(0, Number(distanceMeters || 0) / 1000);
  const basePrice = toFiniteNumber(pricingRule.base_price, 0);
  const baseDistance = Math.max(0, toFiniteNumber(pricingRule.base_distance, 0));
  const pricePerDistance = toFiniteNumber(pricingRule.price_per_distance, 0);
  const timePrice = toFiniteNumber(pricingRule.time_price, 0);
  const serviceTax = toFiniteNumber(pricingRule.service_tax, 0);
  const isWithinBaseDistance = baseDistance > 0 && distanceKm <= baseDistance;
  const extraDistanceKm = Math.max(0, distanceKm - baseDistance);
  const subtotal = isWithinBaseDistance
    ? basePrice
    : basePrice + extraDistanceKm * pricePerDistance + Math.max(0, Number(durationMinutes || 0)) * timePrice;

  if (subtotal <= 0) return fallbackFare;

  const total = subtotal + (subtotal * serviceTax) / 100;
  return Math.max(0, Math.round(total));
};

export const getSetPriceRows = response => {
  const data = unwrap(response);
  return (data?.paginator?.data || data?.results || []).filter(row => String(row?.pricing_scope || 'ride').trim().toLowerCase() === 'ride');
};

export const getSetPricePaginationMeta = response => {
  const data = unwrap(response);
  return {
    currentPage: Number(data?.current_page || data?.paginator?.current_page || 1) || 1,
    lastPage: Number(data?.last_page || data?.paginator?.last_page || 1) || 1,
  };
};

export const formatCurrency = amount => `₹${Math.round(Number(amount) || 0)}`;

export const formatDistanceLabel = distanceMeters => {
  if (!Number.isFinite(Number(distanceMeters))) return 'No distance yet';
  const meters = Number(distanceMeters);
  if (meters < 1000) return `${Math.max(50, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
};

export const formatPromoSummary = promo => {
  const percent = Math.max(0, Number(promo?.discount_percentage || 0));
  const maxDiscount = Math.max(0, Number(promo?.maximum_discount_amount || 0));
  const minimumTripAmount = Math.max(0, Number(promo?.minimum_trip_amount || 0));

  const parts = [];
  if (percent > 0) parts.push(`${percent}% off`);
  if (maxDiscount > 0) parts.push(`up to ${formatCurrency(maxDiscount)}`);
  if (minimumTripAmount > 0) parts.push(`min ${formatCurrency(minimumTripAmount)}`);
  return parts.join(' • ') || 'Promo available';
};

// --- zone / geofencing (shared with SelectLocationScreen's copy) ---

export const isZoneActive = zone => zone?.active !== false && Number(zone?.status ?? 1) !== 0;

const toZonePoint = point => {
  if (Array.isArray(point) && point.length >= 2) {
    const [lng, lat] = point;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) return {lat: Number(lat), lng: Number(lng)};
  }
  if (point && typeof point === 'object') {
    const lat = Number(point.lat ?? point.latitude);
    const lng = Number(point.lng ?? point.longitude ?? point.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return {lat, lng};
  }
  return null;
};

export const normalizeZonePath = zone => {
  const source =
    Array.isArray(zone?.coordinates?.[0]) && Array.isArray(zone?.coordinates?.[0]?.[0]) ? zone.coordinates[0] : zone?.coordinates;
  if (!Array.isArray(source)) return [];
  return source.map(toZonePoint).filter(Boolean);
};

export const isPointInPolygon = (point, polygon) => {
  if (!point || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

export const getZoneId = zone => normalizeId(zone?._id || zone?.id || '');
export const getZoneServiceLocationId = zone =>
  normalizeId(
    zone?.service_location_id?._id ||
      zone?.service_location_id?.id ||
      zone?.service_location_id ||
      zone?.service_location?._id ||
      zone?.service_location?.id ||
      zone?.service_location ||
      '',
  );
