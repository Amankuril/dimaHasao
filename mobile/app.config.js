/*
 * Dynamic config on top of app.json.
 * - Release builds must never talk to localhost.
 * - Google Maps native keys come from the build environment (not EXPO_PUBLIC_*,
 *   they are restricted to the app's package / bundle id):
 *   GOOGLE_MAPS_ANDROID_API_KEY, GOOGLE_MAPS_IOS_API_KEY. Without the iOS key
 *   the map falls back to Apple Maps (no custom styling).
 */
module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (process.env.EAS_BUILD_PROFILE === 'production' && (!apiUrl || /localhost|127\.0\.0\.1/.test(apiUrl))) {
    throw new Error('EXPO_PUBLIC_API_URL must point at the live API for production builds');
  }
  const iosKey = process.env.GOOGLE_MAPS_IOS_API_KEY || '';
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || '', iosGoogleMapsApiKey: iosKey }],
    ],
    extra: { ...(config.extra || {}), iosGoogleMaps: Boolean(iosKey) },
  };
};
