// Rewarded ads are backed by a native-only SDK (react-native-google-mobile-ads)
// that has no web build. Metro picks this file over use-ad-reward.ts when
// bundling for web, so the native module is never imported there.
export function useAdReward() {
  return {
    isSupported: false as const,
    isReady: false,
    isEarnedReward: false,
    show: () => {},
  };
}
