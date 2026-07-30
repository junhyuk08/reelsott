import Constants, { ExecutionEnvironment } from 'expo-constants';

export function initAds() {
  // react-native-google-mobile-ads is a custom native module with no Expo Go
  // support — importing it there throws immediately (TurboModuleRegistry
  // can't find the module), which crashes the whole app at launch since this
  // runs unconditionally from the root layout. Only touch it in a dev client
  // / standalone build that actually has it linked.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return;
  }

  const mobileAds = require('react-native-google-mobile-ads').default;
  mobileAds()
    .initialize()
    .catch(() => {});
}
