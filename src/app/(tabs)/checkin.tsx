import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAdReward } from '@/hooks/use-ad-reward';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ACCENT = '#FF3B5C';
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const AD_REWARD_COIN = 30;

type ProfileSummary = {
  consecutiveDays: number;
  coinBalance: number;
  lastAttendanceDate: string | null;
  lastAdRewardDate: string | null;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Sunday through Saturday of the current calendar week, rather than a
// rolling last-7-days window, so the row lines up with the weekday labels.
function currentWeekDays() {
  const days: Date[] = [];
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    days.push(date);
  }
  return days;
}

export default function CheckinScreen() {
  const theme = useTheme();
  const { session, isLoggedIn, loading } = useSession();

  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claimingAd, setClaimingAd] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const adReward = useAdReward();

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    let cancelled = false;

    async function load() {
      const weekStart = toDateKey(currentWeekDays()[0]);

      const [{ data: profileRow }, { data: logs }] = await Promise.all([
        supabase
          .from('profiles')
          .select('consecutive_days, coin_balance, last_attendance_date, last_ad_reward_date')
          .eq('id', userId)
          .single(),
        supabase.from('attendance_logs').select('checked_date').gte('checked_date', weekStart),
      ]);

      if (cancelled) return;

      if (profileRow) {
        setProfile({
          consecutiveDays: profileRow.consecutive_days,
          coinBalance: profileRow.coin_balance,
          lastAttendanceDate: profileRow.last_attendance_date,
          lastAdRewardDate: profileRow.last_ad_reward_date,
        });
      }
      setCheckedDates(new Set((logs ?? []).map((row: { checked_date: string }) => row.checked_date)));
      setLoadingData(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!adReward.isEarnedReward) return;

    let cancelled = false;

    async function claim() {
      setClaimingAd(true);
      setAdError(null);

      const { data, error: rpcError } = await supabase.rpc('claim_ad_reward');

      if (cancelled) return;
      setClaimingAd(false);

      if (rpcError) {
        setAdError(rpcError.message);
        return;
      }

      setProfile((prev) =>
        prev ? { ...prev, coinBalance: data.coin_balance, lastAdRewardDate: toDateKey(new Date()) } : prev
      );
    }

    claim();
    return () => {
      cancelled = true;
    };
  }, [adReward.isEarnedReward]);

  if (loading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;
  if (loadingData) return null;

  const todayKey = toDateKey(new Date());
  const checkedToday = profile?.lastAttendanceDate === todayKey;
  const claimedAdToday = profile?.lastAdRewardDate === todayKey;
  const streak = profile?.consecutiveDays ?? 0;

  async function handleCheckin() {
    if (checkedToday || submitting) return;

    setError(null);
    setSubmitting(true);

    const { data, error: rpcError } = await supabase.rpc('check_attendance');

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setProfile((prev) => ({
      consecutiveDays: data.consecutive_days,
      coinBalance: data.coin_balance,
      lastAttendanceDate: todayKey,
      lastAdRewardDate: prev?.lastAdRewardDate ?? null,
    }));
    setCheckedDates((prev) => new Set(prev).add(todayKey));
  }

  function handleWatchAd() {
    if (claimedAdToday || claimingAd || !adReward.isReady) return;
    adReward.show();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedText type="title" style={styles.pageTitle}>
          출석체크
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.pageSubtitle}>
          매일 출석하고 연속 출석 기록을 쌓아보세요
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedView type="backgroundElement" style={styles.weekRow}>
            {currentWeekDays().map((date) => {
              const key = toDateKey(date);
              const checked = checkedDates.has(key);
              const isToday = key === todayKey;

              return (
                <ThemedView key={key} type="backgroundElement" style={styles.dayColumn}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {WEEKDAY_LABELS[date.getDay()]}
                  </ThemedText>
                  <ThemedView
                    style={[
                      styles.dayCircle,
                      { borderColor: theme.backgroundSelected },
                      checked && styles.dayCircleChecked,
                      isToday && !checked && styles.dayCircleToday,
                    ]}>
                    <ThemedText type="smallBold" style={checked ? styles.dayGlyphChecked : undefined}>
                      {checked ? '✓' : date.getDate()}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              );
            })}
          </ThemedView>

          <ThemedText type="smallBold" style={styles.streakText}>
            연속 출석 {streak}일째
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.coinText}>
            보유 코인 {profile?.coinBalance ?? 0}개
          </ThemedText>

          {error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={handleCheckin}
            disabled={checkedToday || submitting}
            style={[styles.checkinButton, (checkedToday || submitting) && styles.checkinButtonDone]}>
            <ThemedText style={styles.checkinButtonText}>
              {checkedToday ? '오늘 출석 완료' : submitting ? '처리 중...' : '출석체크하기'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">광고 보고 코인 더 받기</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.adSubtitle}>
            짧은 광고를 보면 코인 {AD_REWARD_COIN}개를 추가로 드려요
          </ThemedText>

          {adError && (
            <ThemedText type="small" style={styles.errorText}>
              {adError}
            </ThemedText>
          )}

          {adReward.isSupported ? (
            <Pressable
              onPress={handleWatchAd}
              disabled={claimedAdToday || claimingAd || !adReward.isReady}
              style={[
                styles.adButton,
                (claimedAdToday || claimingAd || !adReward.isReady) && styles.checkinButtonDone,
              ]}>
              <ThemedText style={styles.checkinButtonText}>
                {claimedAdToday
                  ? '오늘 보너스 수령 완료'
                  : claimingAd
                    ? '지급 중...'
                    : adReward.isReady
                      ? '광고 보고 코인 받기'
                      : '광고 준비 중...'}
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.adUnsupportedText}>
              이 플랫폼에서는 아직 지원하지 않아요
            </ThemedText>
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
  },
  pageSubtitle: {
    marginTop: Spacing.half,
    paddingHorizontal: Spacing.three,
  },
  card: {
    margin: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    borderColor: ACCENT,
    borderWidth: 2,
  },
  dayCircleChecked: {
    backgroundColor: ACCENT,
    borderWidth: 0,
  },
  dayGlyphChecked: {
    color: '#ffffff',
  },
  streakText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  coinText: {
    textAlign: 'center',
    marginTop: Spacing.half,
  },
  errorText: {
    color: '#D33',
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  checkinButton: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
    boxShadow: '0 6px 10px rgba(255, 59, 92, 0.25)',
  },
  checkinButtonDone: {
    opacity: 0.5,
    boxShadow: 'none',
  },
  checkinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  adSubtitle: {
    marginTop: Spacing.half,
  },
  adButton: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
    boxShadow: '0 6px 10px rgba(255, 59, 92, 0.25)',
  },
  adUnsupportedText: {
    marginTop: Spacing.three,
    textAlign: 'center',
  },
});
