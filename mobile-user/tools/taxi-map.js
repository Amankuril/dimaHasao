/*
 * Where the taxi module's web imports live in the app (used by port-logic.js and
 * extract-hook.js). A web import specifier from anywhere under Frontend/src/modules/Taxi
 * is matched by its tail, so the relative depth does not matter.
 */
const TAXI_SPECS = [
  [/\/shared\/api\/axiosInstance$/, 'taxi/api/client'],
  [/\/shared\/api\/socket$/, 'taxi/api/socket'],
  [/\/shared\/api\/runtimeConfig$/, 'taxi/api/runtimeConfig'],
  [/\/shared\/context\/SettingsContext$/, 'taxi/context/SettingsContext'],
  [/\/shared\/context\/UserThemeContext$/, 'taxi/context/UserThemeContext'],
  [/\/shared\/utils\/routePrefix$/, 'taxi/utils/routePrefix'],
  [/\/shared\/utils\/historyState$/, 'taxi/utils/historyState'],
  [/\/shared\/utils\/googleRoutes$/, 'taxi/utils/googleRoutes'],
  [/\/shared\/services\/rideRealtime$/, 'taxi/services/rideRealtime'],
  [/\/shared\/services\/safetyAlertService$/, 'taxi/services/safetyAlertService'],
  [/\/shared\/hooks\/useTaxiTransportTypes$/, 'taxi/hooks/useTaxiTransportTypes'],
  [/\/user\/services\/(authService|currentRideService|locationStore|rideZoneUtils|userService)$/, (m) => `taxi/services/${m[1]}`],
  [/(?:^|\/)services\/(authService|currentRideService|locationStore|rideZoneUtils|userService)$/, (m) => `taxi/services/${m[1]}`],
  [/\/utils\/(realtimeNotificationStore|upcomingRideReminderService)$/, (m) => `taxi/store/${m[1]}`],
  [/\/constants\/districtPlaces$/, 'taxi/constants/districtPlaces'],
  [/\/content\/supportInfo$/, 'taxi/content/supportInfo'],
  [/\/chat\/(chatApi|chatIdentity)$/, (m) => `taxi/chat/${m[1]}`],
  [/\/components\/UserSupportChatPanel$/, 'taxi/components/UserSupportChatPanel'],
  [/\/admin\/utils\/googleMaps$/, 'taxi/utils/googleMaps'],
  [/^react-hot-toast$/, 'lib/notify'],
];

function taxiSpec(spec) {
  for (const [re, target] of TAXI_SPECS) {
    const m = spec.match(re);
    if (m) return typeof target === 'function' ? target(m) : target;
  }
  return null;
}

/** `../../assets/icons/car.png` / `@/assets/x.png` -> `assets/taxi/icons/car.png` (relative to mobile-user/). */
function taxiAsset(spec) {
  const m = spec.replace(/\?.*$/, '').match(/(?:^|\/)assets\/(.+\.(?:png|jpe?g|webp|gif|avif))$/);
  return m ? `assets/taxi/${m[1]}` : null;
}

module.exports = { taxiSpec, taxiAsset };
