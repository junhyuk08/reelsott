import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ACCENT = '#FF3B5C';

export function HomeHeader() {
  const theme = useTheme();
  const router = useRouter();
  const { session, isLoggedIn } = useSession();

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const displayName = (session?.user.user_metadata?.nickname as string | undefined) ?? session?.user.email;

  return (
    <View style={styles.container}>
      <Logo />

      {isLoggedIn ? (
        <View style={styles.loggedInArea}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.greeting}>
            {displayName}님
          </ThemedText>
          <Pressable onPress={handleLogout} style={[styles.pillButton, { borderColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">
              로그아웃
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.authButtons}>
          <Pressable onPress={() => router.push('/login')} style={[styles.pillButton, { borderColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="text">
              로그인
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/signup')} style={[styles.pillButton, styles.pillButtonAccent]}>
            <ThemedText type="small" style={styles.signupLabel}>
              회원가입
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  authButtons: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  loggedInArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  greeting: {
    flexShrink: 1,
  },
  pillButton: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  pillButtonAccent: {
    backgroundColor: ACCENT,
    borderWidth: 0,
  },
  signupLabel: {
    color: '#ffffff',
  },
});
