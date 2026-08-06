import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// Logout and account deletion moved one level below mypage.tsx's flat menu —
// deletion in particular shouldn't be a single accidental tap away, so it
// gets its own screen (delete-account.tsx) instead of expanding in place.
export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isLoggedIn, loading } = useSession();

  if (loading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={handleLogout} style={[styles.logoutButton, { borderColor: theme.backgroundSelected }]}>
            <ThemedText type="default" themeColor="textSecondary">
              로그아웃
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => router.push('/delete-account')}
            style={[styles.menuRow, { borderTopColor: theme.backgroundSelected }]}>
            <ThemedText type="default" themeColor="textSecondary">
              회원탈퇴
            </ThemedText>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </Pressable>
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
    padding: Spacing.three,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.four,
    paddingTop: Spacing.four,
  },
});
