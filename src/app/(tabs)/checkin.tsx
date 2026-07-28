import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ACCENT = '#FF3B5C';
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type ProfileSummary = {
  consecutiveDays: number;
  coinBalance: number;
  lastAttendanceDate: string | null;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function lastSevenDays() {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
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

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    let cancelled = false;

    async function load() {
      const sevenDaysAgo = toDateKey(lastSevenDays()[0]);

      const [{ data: profileRow }, { data: logs }] = await Promise.all([
        supabase
          .from('profiles')
          .select('consecutive_days, coin_balance, last_attendance_date')
          .eq('id', userId)
          .single(),
        supabase.from('attendance_logs').select('checked_date').gte('checked_date', sevenDaysAgo),
      ]);

      if (cancelled) return;

      if (profileRow) {
        setProfile({
          consecutiveDays: profileRow.consecutive_days,
          coinBalance: profileRow.coin_balance,
          lastAttendanceDate: profileRow.last_attendance_date,
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

  if (loading || loadingData) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  const todayKey = toDateKey(new Date());
  const checkedToday = profile?.lastAttendanceDate === todayKey;
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

    setProfile({
      consecutiveDays: data.consecutive_days,
      coinBalance: data.coin_balance,
      lastAttendanceDate: todayKey,
    });
    setCheckedDates((prev) => new Set(prev).add(todayKey));
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
            {lastSevenDays().map((date) => {
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
});
