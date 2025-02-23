const { withEntitlementsPlist, withPlugins, createRunOncePlugin } = require('@expo/config-plugins');

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

// Main config plugin function
const withPushyExpoPlugin = (config, props) => {
  // Store props in config
  config.props = props;

  // Use withPlugins to chain multiple modifications together
  return withPlugins(config, [
    withPushyiOSEntitlementsPlistModification
  ]);
};

// Import the package.json file to use its version and name in the plugin registration
const pkg = require('./package.json');

// Register the plugin with Expo so it runs once using createRunOncePlugin
module.exports = createRunOncePlugin(withPushyExpoPlugin, pkg.name, pkg.version);
