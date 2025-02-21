const { withBuildProperties } = require('expo-build-properties');
const { withEntitlementsPlist, withPlugins, withAndroidManifest, withMainApplication, withAppDelegate, withAppBuildGradle, AndroidConfig, createRunOncePlugin } = require('@expo/config-plugins');

// Function to modify AppDelegate.mm to include the PushyModule initialization
const withPushyiOSAppDelegateModification = (config) => {
  return withAppDelegate(config, (config) => {
    let { modResults } = config;

    // Add PushyModule.h import if not present
    if (!modResults.contents.includes('#import <PushyModule.h>')) {
      modResults.contents = '#import <PushyModule.h>\n' + modResults.contents;
    }

    // Inject PushyModule initialization code inside didFinishLaunchingWithOptions
    if (!modResults.contents.includes('[PushyModule didFinishLaunchingWithOptions:launchOptions]')) {
      modResults.contents = modResults.contents.replace(
        /(.+didFinishLaunchingWithOptions.+\s*\{)/,
        `$1\n  // Initialize Pushy Module\n  [PushyModule didFinishLaunchingWithOptions:launchOptions];\n`
      );
    }

    return config;
  });
};

// Function to add the 'aps-environment' key/capability to the entitlements plist
const withPushyiOSEntitlementsPlistModification = (config) => {
  return withEntitlementsPlist(config, (config) => {
    const entitlements = config.modResults;

    // Developer passed in a custom 'aps-environment' property?
    if (config.props && config.props['aps-environment']) {
      entitlements['aps-environment'] = config.props['aps-environment'];
    }
    else {
      // Fallback to 'development'
      entitlements['aps-environment'] = 'development';
    }

    return config;
  });
};

// Function to enable modular headers for the MqttCocoaAsyncSocket Cocoapods dependency
const withPushyCustomBuildProperties = (config) => {
  return withBuildProperties(config, {
    ios: {
      extraPods: [
        {
          // Fix Cocoapods error (lack of modular header support)
          name: 'MqttCocoaAsyncSocket',
          modular_headers: true
        }
      ]
    }
  });
};

// Main config plugin function
const withPushyExpoPlugin = (config, props) => {
  // Store props in config
  config.props = props;

  // Use withPlugins to chain multiple modifications together
  return withPlugins(config, [
    withPushyCustomBuildProperties,
    withPushyiOSAppDelegateModification,
    withPushyiOSEntitlementsPlistModification
  ]);
};

// Import the package.json file to use its version and name in the plugin registration
const pkg = require('./package.json');

// Register the plugin with Expo so it runs once using createRunOncePlugin
module.exports = createRunOncePlugin(withPushyExpoPlugin, pkg.name, pkg.version);
