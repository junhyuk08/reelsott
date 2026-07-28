import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#FF3B5C';

type HomeHeaderProps = {
  query: string;
  onQueryChange: (query: string) => void;
};

export function HomeHeader({ query, onQueryChange }: HomeHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const { session, isLoggedIn } = useSession();

  const displayName = (session?.user.user_metadata?.nickname as string | undefined) ?? session?.user.email;

  return (
    <View style={styles.container}>
      <Logo />

      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        placeholder="제목 검색"
        placeholderTextColor={theme.textSecondary}
        value={query}
        onChangeText={onQueryChange}
        autoCapitalize="none"
        returnKeyType="search"
      />

      {isLoggedIn ? (
        <View style={styles.loggedInArea}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.greeting}>
            {displayName}님
          </ThemedText>
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
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchInput: {
    flex: 1,
    height: 36,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  authButtons: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexShrink: 0,
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
