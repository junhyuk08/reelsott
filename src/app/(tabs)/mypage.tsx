import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ACCENT = '#FF3B5C';
const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

type MenuItem = {
  label: string;
  href:
    | '/favorites'
    | '/watch-history'
    | '/notification-settings'
    | '/support'
    | '/notices'
    | '/terms'
    | '/account'
    | null;
};

// Grouped into "my activity" vs "service info" sections instead of one flat
// list, per feedback that the old single list felt undifferentiated.
const USAGE_MENU_ITEMS: MenuItem[] = [
  { label: '찜한 작품', href: '/favorites' },
  { label: '시청기록', href: '/watch-history' },
  { label: '구독 관리', href: null },
  { label: '알림 설정', href: '/notification-settings' },
];

const SERVICE_MENU_ITEMS: MenuItem[] = [
  { label: '고객센터', href: '/support' },
  { label: '공지사항', href: '/notices' },
  { label: '이용약관', href: '/terms' },
];

function MenuRow({ item, isFirst, theme }: { item: MenuItem; isFirst: boolean; theme: ReturnType<typeof useTheme> }) {
  const router = useRouter();

  return (
    <Pressable
      disabled={!item.href}
      onPress={() => item.href && router.push(item.href)}
      style={[styles.menuRow, { borderTopColor: theme.backgroundSelected }, isFirst && styles.menuRowFirst]}>
      <ThemedText type="default">{item.label}</ThemedText>
      {item.href && <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />}
    </Pressable>
  );
}

export default function MyPageScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, isLoggedIn, loading } = useSession();

  const [coinBalance, setCoinBalance] = useState(0);
  const [nickname, setNickname] = useState<string | null>(null);

  // Refetches every time this tab regains focus (not just on mount) so the
  // coin balance reflects spends/earns made on other screens (check-in, ad
  // reward, episode unlocks) instead of going stale while the tab stays
  // mounted in the background.
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let cancelled = false;

      supabase
        .from('profiles')
        .select('nickname, coin_balance')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (cancelled || !data) return;
          setCoinBalance(data.coin_balance);
          setNickname(data.nickname);
        });

      return () => {
        cancelled = true;
      };
    }, [session])
  );

  if (loading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  // profiles.nickname is the authoritative source (unique, used for
  // nickname login); the JWT's user_metadata copy is just a same-value
  // snapshot from signup, used here only until the fetch above resolves.
  const displayNickname = nickname ?? (session?.user.user_metadata?.nickname as string | undefined) ?? '회원';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.pageTitle}>
            마이페이지
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.profileCard}>
            <ThemedView style={styles.avatar}>
              <Ionicons name="person" size={24} color="#ffffff" />
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.profileText}>
              <ThemedText type="smallBold">{displayNickname}</ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.coinCard}>
            <View style={styles.coinRow}>
              <ThemedText type="small" themeColor="textSecondary">
                보유 코인
              </ThemedText>
              <ThemedText type="smallBold">{coinBalance.toLocaleString()} 코인</ThemedText>
            </View>
            <Pressable
              // 결제(PG) 연동 전까지는 코인을 얻을 수 있는 기존 화면(출석체크)으로 보낸다.
              onPress={() => router.push('/checkin')}
              style={styles.chargeButton}>
              <ThemedText style={styles.chargeButtonText}>코인 충전하기</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            이용 정보
          </ThemedText>
          <ThemedView style={styles.menuList}>
            {USAGE_MENU_ITEMS.map((item, index) => (
              <MenuRow key={item.label} item={item} isFirst={index === 0} theme={theme} />
            ))}
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            서비스 안내
          </ThemedText>
          <ThemedView style={styles.menuList}>
            {SERVICE_MENU_ITEMS.map((item, index) => (
              <MenuRow key={item.label} item={item} isFirst={index === 0} theme={theme} />
            ))}
          </ThemedView>

          <ThemedView style={styles.menuList}>
            <MenuRow item={{ label: '계정 관리', href: '/account' }} isFirst theme={theme} />
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary" style={styles.versionText}>
            v{APP_VERSION}
          </ThemedText>
        </ScrollView>
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
  scrollContent: {
    paddingBottom: Spacing.five,
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    margin: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    gap: 2,
  },
  coinCard: {
    marginHorizontal: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  coinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chargeButton: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  chargeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionLabel: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.five,
    marginBottom: Spacing.one,
  },
  menuList: {
    marginHorizontal: Spacing.three,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
  },
  menuRowFirst: {
    borderTopWidth: 0,
  },
  versionText: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
