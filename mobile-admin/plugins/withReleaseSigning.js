// Signs release builds with the keystore named in the user-level ~/.gradle/gradle.properties
// (ADMIN_UPLOAD_*). The keystore itself lives outside the repository.
const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let s = cfg.modResults.contents;
    if (s.includes('ADMIN_UPLOAD_STORE_FILE')) return cfg;
    s = s.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        release {
            if (project.hasProperty('ADMIN_UPLOAD_STORE_FILE')) {
                storeFile file(ADMIN_UPLOAD_STORE_FILE)
                storePassword ADMIN_UPLOAD_STORE_PASSWORD
                keyAlias ADMIN_UPLOAD_KEY_ALIAS
                keyPassword ADMIN_UPLOAD_KEY_PASSWORD
            }
        }`,
    );
    // release build type: use the release signing config instead of debug
    s = s.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.release');
    cfg.modResults.contents = s;
    return cfg;
  });
