import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#FF3B5C';
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

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

function computeStreak(checkedDates: Set<string>) {
  let streak = 0;
  const cursor = new Date();
  while (checkedDates.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function CheckinScreen() {
  const theme = useTheme();
  const { session, isLoggedIn, loading } = useSession();
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());

  const storageKey = session ? `checkin:${session.user.id}` : null;

  useEffect(() => {
    if (!storageKey) return;
    AsyncStorage.getItem(storageKey).then((raw) => {
      setCheckedDates(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    });
  }, [storageKey]);

  if (loading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  const todayKey = toDateKey(new Date());
  const checkedToday = checkedDates.has(todayKey);
  const streak = computeStreak(checkedDates);

  async function handleCheckin() {
    if (checkedToday || !storageKey) return;

    const next = new Set(checkedDates);
    next.add(todayKey);
    setCheckedDates(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
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

          <Pressable
            onPress={handleCheckin}
            disabled={checkedToday}
            style={[styles.checkinButton, checkedToday && styles.checkinButtonDone]}>
            <ThemedText style={styles.checkinButtonText}>
              {checkedToday ? '오늘 출석 완료' : '출석체크하기'}
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
