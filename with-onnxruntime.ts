/*
Robbed this Github Gist:
https://gist.github.com/ps73/570b7e7ecf52a13bd997ee5cda5e993b
*/

// Store this under plugins/with-onnxruntime.js!
const { withMainApplication, createRunOncePlugin } = require('expo/config-plugins');

const PACKAGE_IMPORT = 'import ai.onnxruntime.reactnative.OnnxruntimePackage';

/**
 * Expo config plugin that manually registers OnnxruntimePackage in MainApplication.kt.
 *
 * onnxruntime-react-native uses the legacy ReactPackage pattern which isn't picked up
 * by Expo's autolinking. Without this, NativeModules.Onnxruntime is null at runtime.
 */
function withOnnxruntime(config: any) {
  return withMainApplication(config, (config: any) => {
    let contents = config.modResults.contents;

    // Add import if missing
    if (!contents.includes(PACKAGE_IMPORT)) {
      const lastImportIndex = contents.lastIndexOf('\nimport ');
      if (lastImportIndex !== -1) {
        const endOfLine = contents.indexOf('\n', lastImportIndex + 1);
        contents = contents.slice(0, endOfLine + 1) + PACKAGE_IMPORT + '\n' + contents.slice(endOfLine + 1);
      }
    }

    // Add package registration if missing
    if (!contents.includes('OnnxruntimePackage()')) {
      // Insert after the comment line inside packages.apply { }
      const marker = '// add(MyReactNativePackage())';
      const markerIdx = contents.indexOf(marker);
      if (markerIdx !== -1) {
        const endOfMarkerLine = contents.indexOf('\n', markerIdx);
        contents =
          contents.slice(0, endOfMarkerLine) +
          '\n          add(OnnxruntimePackage())' +
          contents.slice(endOfMarkerLine);
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = createRunOncePlugin(withOnnxruntime, 'with-onnxruntime', '1.0.0');