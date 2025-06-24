const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const {withSentryConfig} = require('@sentry/react-native/metro');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {};

module.exports = withSentryConfig(withSentryConfig(
  withSentryConfig(
    withSentryConfig(
      mergeConfig(defaultConfig, {
        transformer: {
          babelTransformerPath: require.resolve('react-native-svg-transformer'),
        },
        resolver: {
          assetExts: defaultConfig.resolver.assetExts.filter(
            ext => ext !== 'svg',
          ),
          sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
        },
      }),
    ),
  ),
));