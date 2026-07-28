import Constants from 'expo-constants';
import { Redirect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ACCENT = '#FF3B5C';
const DUMMY_COIN_BALANCE = 0;
const MENU_ITEMS = ['시청 기록', '찜한 드라마', '알림 설정', '고객센터', '공지사항'];
const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

export default function MyPageScreen() {
  const theme = useTheme();
  const { session, isLoggedIn, loading } = useSession();

  if (loading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  const nickname = (session?.user.user_metadata?.nickname as string | undefined) ?? '회원';
  const email = session?.user.email ?? '';

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.pageTitle}>
            마이페이지
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.profileCard}>
            <ThemedView style={styles.avatar}>
              <ThemedText style={styles.avatarGlyph}>👤</ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.profileText}>
              <ThemedText type="smallBold">{nickname}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {email}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.coinCard}>
            <View style={styles.coinRow}>
              <ThemedText type="small" themeColor="textSecondary">
                보유 코인
              </ThemedText>
              <ThemedText type="smallBold">{DUMMY_COIN_BALANCE.toLocaleString()} 코인</ThemedText>
            </View>
            <Pressable onPress={() => {}} style={styles.chargeButton}>
              <ThemedText style={styles.chargeButtonText}>코인 충전하기</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.menuList}>
            {MENU_ITEMS.map((item, index) => (
              <Pressable
                key={item}
                onPress={() => {}}
                style={[
                  styles.menuRow,
                  { borderTopColor: theme.backgroundSelected },
                  index === 0 && styles.menuRowFirst,
                ]}>
                <ThemedText type="default">{item}</ThemedText>
                <ThemedText type="default" themeColor="textSecondary">
                  ›
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          <Pressable onPress={handleLogout} style={[styles.logoutButton, { borderColor: theme.backgroundSelected }]}>
            <ThemedText type="default" themeColor="textSecondary">
              로그아웃
            </ThemedText>
          </Pressable>

          <Pressable onPress={() => {}} style={styles.withdrawLink}>
            <ThemedText type="small" themeColor="textSecondary">
              회원탈퇴
            </ThemedText>
          </Pressable>

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
  avatarGlyph: {
    fontSize: 24,
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
  menuList: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.four,
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
  logoutButton: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  withdrawLink: {
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  versionText: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
