/*
 * Dynamic config on top of app.json.
 * - Release builds must never talk to localhost or plain http.
 * - The Google Maps key for the native map comes from the build environment
 *   (GOOGLE_MAPS_ANDROID_API_KEY), falling back to the web app's public key.
 */
module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (process.env.EAS_BUILD_PROFILE === 'production' && (!apiUrl || !/^https:\/\//.test(apiUrl) || /localhost|127\.0\.0\.1/.test(apiUrl))) {
    throw new Error('EXPO_PUBLIC_API_URL must be the live HTTPS API for production builds');
  }
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  return {
    ...config,
    plugins: [...(config.plugins || []), ['react-native-maps', { androidGoogleMapsApiKey: mapsKey }]],
  };
};
