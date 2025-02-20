# pushy-expo-plugin
[![npm version](https://badge.fury.io/js/pushy-expo-plugin.svg)](https://www.npmjs.com/package/pushy-expo-plugin)

The official [Pushy Expo Config Plugin](https://pushy.me/) for [Expo](https://expo.dev/) apps.

> [Pushy](https://pushy.me/) is the most reliable push notification gateway, perfect for real-time, mission-critical applications.

## Usage

Please refer to our [detailed documentation](https://pushy.me/docs/additional-platforms/react-native) to get started.

## Demo

Please refer to [pushy-demo-expo](https://github.com/pushy/pushy-demo-expo) for a sample Expo project that integrates this plugin.

## Production Notes

Please set the `aps-environment` plugin property to `production` when building your Expo iOS app for production.

**app.json**
```json
{
  "plugins": [
    [
      "pushy-expo-plugin",
      {
        "aps-environment": "production"
      }
    ]
  ]
}
```

## License

[Apache 2.0](LICENSE)
