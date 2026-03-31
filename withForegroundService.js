const { withAndroidManifest } = require('@expo/config-plugins');

const withForegroundService = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // The specific service name used by react-native-background-actions
    const serviceName = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';

    // Find the service in the manifest
    let service = mainApplication.service?.find(
      (s) => s['$']['android:name'] === serviceName
    );

    if (service) {
      // Add the required attribute for Android 14+
      service['$']['android:foregroundServiceType'] = 'connectedDevice';
    } else {
      // If the library isn't linked yet, we add the entry manually
      if (!mainApplication.service) mainApplication.service = [];
      mainApplication.service.push({
        $: {
          'android:name': serviceName,
          'android:foregroundServiceType': 'connectedDevice',
          'android:exported': 'false', // Security best practice
        },
      });
    }

    return config;
  });
};

module.exports = withForegroundService;