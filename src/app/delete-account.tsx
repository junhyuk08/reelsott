import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

async function extractErrorMessage(error: unknown, fallback: string) {
  const context = (error as { context?: Response })?.context;
  try {
    const body = await context?.json();
    return typeof body?.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

// Its own screen (not an inline expand on account.tsx) so deleting an
// account takes a deliberate navigation, not a single accidental tap.
export default function DeleteAccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isLoggedIn, loading } = useSession();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (loading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  async function handleDeleteAccount() {
    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setError(null);
    setDeleting(true);

    const { data, error: invokeError } = await supabase.functions.invoke('delete-account', {
      body: { password },
    });

    if (invokeError || !data?.success) {
      setDeleting(false);
      setError(await extractErrorMessage(invokeError, '탈퇴 처리 중 오류가 발생했습니다.'));
      return;
    }

    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="small" themeColor="textSecondary">
            계정을 삭제하려면 비밀번호를 입력해주세요. 이 작업은 되돌릴 수 없습니다.
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="비밀번호"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />
          {error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}
          <Pressable
            onPress={handleDeleteAccount}
            disabled={deleting}
            style={[styles.deleteConfirmButton, deleting && styles.disabled]}>
            <ThemedText type="default" style={styles.deleteConfirmButtonText}>
              {deleting ? '탈퇴 처리 중...' : '확인 후 탈퇴'}
            </ThemedText>
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
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 1,
    fontSize: 16,
  },
  errorText: {
    color: '#D33',
  },
  deleteConfirmButton: {
    backgroundColor: '#D33',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  deleteConfirmButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
