import { Redirect } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const MENU_ITEMS = ['구독 관리', '알림 설정', '고객센터', '이용약관'];

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

        <ThemedView style={styles.menuList}>
          {MENU_ITEMS.map((item, index) => (
            <ThemedView
              key={item}
              style={[
                styles.menuRow,
                { borderTopColor: theme.backgroundSelected },
                index === 0 && styles.menuRowFirst,
              ]}>
              <ThemedText type="default">{item}</ThemedText>
            </ThemedView>
          ))}
        </ThemedView>

        <Pressable onPress={handleLogout} style={[styles.logoutButton, { borderColor: theme.backgroundSelected }]}>
          <ThemedText type="default" themeColor="textSecondary">
            로그아웃
          </ThemedText>
        </Pressable>
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
    backgroundColor: '#FF3B5C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: {
    fontSize: 24,
  },
  profileText: {
    gap: 2,
  },
  menuList: {
    marginHorizontal: Spacing.three,
  },
  menuRow: {
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
});
