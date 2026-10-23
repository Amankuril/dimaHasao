/*
 * Dynamic config on top of app.json.
 * - Release builds must never talk to localhost or plain http.
 * - EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is the native map key only (restrict it by
 *   package name + SHA-1). REST lookups go through the backend, which holds its own key.
 */
module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (process.env.EAS_BUILD_PROFILE === 'production' && (!apiUrl || !/^https:\/\//.test(apiUrl) || /localhost|127\.0\.0\.1/.test(apiUrl))) {
    throw new Error('EXPO_PUBLIC_API_URL must be the live HTTPS API for production builds');
  }
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  return {
    ...config,
    plugins: [...(config.plugins || []), ['react-native-maps', { androidGoogleMapsApiKey: mapsKey }]],
  };
};
