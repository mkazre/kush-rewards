// Extends app.json. Google sign-in on iOS needs the reversed iOS client ID as a URL scheme at
// build time: set GOOGLE_IOS_URL_SCHEME (e.g. com.googleusercontent.apps.1234-abc) as an EAS
// environment variable before building for iOS. Android needs nothing here.
module.exports = ({ config }) => {
  const scheme = process.env.GOOGLE_IOS_URL_SCHEME;
  if (scheme) {
    config.plugins = [...(config.plugins ?? []), ["@react-native-google-signin/google-signin", { iosUrlScheme: scheme }]];
  }
  return config;
};
