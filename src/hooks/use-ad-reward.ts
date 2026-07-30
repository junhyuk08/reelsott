import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';

// Same reasoning as src/lib/init-ads.ts: this SDK has no Expo Go support, and
// merely importing it there throws (no native module registered). Since
// checkin.tsx renders on every platform, the import itself must be
// conditional — a runtime check inside the hook body is too late, the throw
// already happened when the module was required.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const ads = isExpoGo ? null : (require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads'));

const AD_UNIT_ID = ads ? (process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID ?? ads.TestIds.REWARDED) : null;

export function useAdReward() {
  // `ads` is resolved once at module load and never changes for the life of
  // the process, so this conditional hook call always takes the same branch
  // on every render — safe despite looking like it breaks Rules of Hooks.
  const ad = ads ? ads.useRewardedAd(AD_UNIT_ID) : null;
  const load = ad?.load;
  const isClosed = ad?.isClosed;

  useEffect(() => {
    load?.();
  }, [load]);

  useEffect(() => {
    if (isClosed) load?.();
  }, [isClosed, load]);

  if (!ad) {
    return {
      isSupported: false as const,
      isReady: false,
      isEarnedReward: false,
      show: () => {},
    };
  }

  return {
    isSupported: true as const,
    isReady: ad.isLoaded,
    isEarnedReward: ad.isEarnedReward,
    show: ad.show,
  };
}
