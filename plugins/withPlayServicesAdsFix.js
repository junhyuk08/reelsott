const { withProjectBuildGradle } = require('@expo/config-plugins');

// react-native-google-mobile-ads@16.4.0 defaults to play-services-ads 25.4.0, which ships
// Kotlin metadata 2.3.0 — one minor version too new for the Kotlin compiler React Native
// 0.81 pins (2.1.20), which can't be overridden project-wide (ext.kotlinVersion,
// expo-build-properties, and pluginManagement.resolutionStrategy all get ignored for this
// specific plugin-classpath resolution). 25.2.0 is the newest release still on Kotlin
// metadata 2.2.0, which the 2.1.20 compiler tolerates. The only API gap this introduces
// (AgeRestrictedTreatment, added in 25.3.0) is patched out via patch-package since this
// app never calls setAgeRestrictedTreatment.
const PLAY_SERVICES_ADS_VERSION = '25.2.0';

const withPlayServicesAdsFix = config => {
  return withProjectBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withPlayServicesAdsFix only supports Groovy build.gradle files');
    }
    const marker = `play-services-ads:${PLAY_SERVICES_ADS_VERSION}`;
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents += `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'com.google.android.gms:${marker}'
        }
    }
}
`;
    }
    return config;
  });
};

module.exports = withPlayServicesAdsFix;
