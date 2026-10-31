// Signs release builds with the keystore named in the user-level ~/.gradle/gradle.properties
// (DELIVERY_UPLOAD_*). The keystore itself lives outside the repository.
const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let s = cfg.modResults.contents;
    if (s.includes('DELIVERY_UPLOAD_STORE_FILE')) return cfg;
    s = s.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        release {
            if (project.hasProperty('DELIVERY_UPLOAD_STORE_FILE')) {
                storeFile file(DELIVERY_UPLOAD_STORE_FILE)
                storePassword DELIVERY_UPLOAD_STORE_PASSWORD
                keyAlias DELIVERY_UPLOAD_KEY_ALIAS
                keyPassword DELIVERY_UPLOAD_KEY_PASSWORD
            }
        }`,
    );
    // release build type: use the release signing config instead of debug
    s = s.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.release');
    cfg.modResults.contents = s;
    return cfg;
  });
