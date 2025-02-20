const { withBuildProperties } = require('expo-build-properties');
const { withEntitlementsPlist, withPlugins, withAndroidManifest, withMainApplication, withAppDelegate, withAppBuildGradle, AndroidConfig, createRunOncePlugin } = require('@expo/config-plugins');

// Pushy SDK Android Gradle Dependencies
const GRADLE_DEPENDENCIES = `
    // Pushy SDK for Android
    implementation 'me.pushy:sdk:1.0.121'
    
    // Pushy SDK for React Native Android
    implementation 'me.pushy:sdk-react-native:1.0.23'
`;

// Pushy AndroidManifest Permissions
const CUSTOM_PERMISSIONS = [
  'android.permission.INTERNET',               // Permission to access the Internet
  'android.permission.WAKE_LOCK',              // Permission to keep the device awake
  'android.permission.POST_NOTIFICATIONS',     // Permission to post notifications
  'android.permission.ACCESS_NETWORK_STATE',     // Permission to check network status
  'android.permission.RECEIVE_BOOT_COMPLETED',   // Permission to perform actions on boot
  'android.permission.SCHEDULE_EXACT_ALARM'      // Permission to schedule exact alarms
];

// Pushy SDK ProGuard Rules
const PROGUARD_RULES = `
# Pushy SDK ProGuard Rules
-dontwarn me.pushy.**             // Suppress warnings for Pushy classes
-keep class me.pushy.** { *; }     // Keep all Pushy classes and their members
-keep class androidx.core.app.** { *; }  // Keep AndroidX core app classes
-keep class android.support.v4.app.** { *; }  // Keep Android support v4 app classes
`;

// Function to modify MainApplication.kt to include the PushyPackage initialization
const withPushyAndroidMainApplicationModification = (config) => {
  return withMainApplication(config, (config) => {
    let { modResults } = config;

    // Already injected code?
    if (modResults.contents.includes('PushyPackage()')) {
      return config;
    }

    // Modify return packages to include PushyPackage initialization
    modResults.contents = modResults.contents.replace(
      'return packages',
      'return packages.apply {\n              add(me.pushy.sdk.react.PushyPackage())\n            }'
    );

    return config;
  });
};

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

// Function to add custom ProGuard rules and enable modular headers for the MqttCocoaAsyncSocket Cocoapods dependency
const withPushyCustomBuildProperties = (config) => {
  return withBuildProperties(config, {
    android: {
      // Inject custom Pushy ProGuard rules
      extraProguardRules: PROGUARD_RULES
    },
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

// Function to inject the Pushy SDK dependencies to the android/app/build.gradle dependencies{} section
const withPushyAndroidGradleDependencies = (config) => {
  return withAppBuildGradle(config, (config) => {
    let { modResults } = config;

    // Pushy SDK dependenices not added yet?
    if (!modResults.contents.includes('me.pushy:sdk:')) {
      // Inject Pushy SDK depdenencies
      modResults.contents = modResults.contents.replace(
        /(dependencies\s*\{)/,
        `$1${GRADLE_DEPENDENCIES}`
      );
    }

    return config;
  });
};

// Function to update AndroidManifest.xml with necessary permissions, receivers, and services for the Pushy SDK
const withPushyAndroidManifestModifications = (config) => {
  // Add the custom permissions to the configuration
  config = AndroidConfig.Permissions.withPermissions(config, CUSTOM_PERMISSIONS);

  // Modify the AndroidManifest.xml file
  return withAndroidManifest(config, async (config) => {
    // Get the parsed Android manifest
    const androidManifest = config.modResults;

    // Ensure the receiver array exists
    if (!androidManifest.manifest.application[0].receiver) {
      androidManifest.manifest.application[0].receiver = [];
    }

    // Check if any existing receiver already includes Pushy SDK; if so, return early
    for (let receiver of androidManifest.manifest.application[0].receiver) {
      if (receiver.$['android:name'].includes('me.pushy.sdk')) {
        return config;
      }
    }

    // Add new receivers required by Pushy SDK
    androidManifest.manifest.application[0].receiver.push(
      {
        $: { 'android:name': 'me.pushy.sdk.react.receivers.PushReceiver', 'android:exported': 'false' },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'pushy.me' } }]
        }]
      },
      {
        $: { 'android:name': 'me.pushy.sdk.receivers.PushyUpdateReceiver', 'android:exported': 'false' },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } }]
        }]
      },
      {
        $: { 'android:name': 'me.pushy.sdk.receivers.PushyBootReceiver', 'android:exported': 'false' },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }]
        }]
      }
    );

    // Ensure the service array exists
    if (!androidManifest.manifest.application[0].service) {
      androidManifest.manifest.application[0].service = [];
    }

    // Check if any existing service already includes Pushy SDK; if so, return early
    for (let service of androidManifest.manifest.application[0].service) {
      if (service.$['android:name'].includes('me.pushy.sdk')) {
        return config;
      }
    }

    // Add new services required by Pushy SDK
    androidManifest.manifest.application[0].service.push(
      {
        $: { 'android:name': 'me.pushy.sdk.services.PushySocketService', 'android:stopWithTask': 'false' }
      },
      {
        $: { 'android:name': 'me.pushy.sdk.services.PushyJobService', 'android:permission': 'android.permission.BIND_JOB_SERVICE', 'android:stopWithTask': 'false' }
      }
    );

    return config;
  });
};

// Main config plugin function
const withPushyExpoPlugin = (config, props) => {
  // Store props in config
  config.props = props;

  // Use withPlugins to chain multiple modifications together
  return withPlugins(config, [
    withPushyAndroidManifestModifications,
    withPushyCustomBuildProperties,
    withPushyAndroidGradleDependencies,
    withPushyAndroidMainApplicationModification,
    withPushyiOSAppDelegateModification,
    withPushyiOSEntitlementsPlistModification
  ]);
};

// Import the package.json file to use its version and name in the plugin registration
const pkg = require('./package.json');

// Register the plugin with Expo so it runs once using createRunOncePlugin
module.exports = createRunOncePlugin(withPushyExpoPlugin, pkg.name, pkg.version);
