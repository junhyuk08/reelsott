import { useEffect } from 'react';
import { TestIds, useRewardedAd } from 'react-native-google-mobile-ads';

const AD_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID ?? TestIds.REWARDED;

export function useAdReward() {
  const ad = useRewardedAd(AD_UNIT_ID);
  const { load, isClosed } = ad;

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isClosed) load();
  }, [isClosed, load]);

  return {
    isSupported: true as const,
    isReady: ad.isLoaded,
    isEarnedReward: ad.isEarnedReward,
    show: ad.show,
  };
}
