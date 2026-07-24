import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      setError('이메일(또는 닉네임)과 비밀번호를 입력해주세요.');
      return;
    }

    setError(null);
    setSubmitting(true);

    let email = trimmedIdentifier;

    if (!EMAIL_REGEX.test(trimmedIdentifier)) {
      const { data: resolvedEmail, error: lookupError } = await supabase.rpc(
        'get_email_by_nickname',
        { p_nickname: trimmedIdentifier }
      );

      if (lookupError || !resolvedEmail) {
        setSubmitting(false);
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      email = resolvedEmail;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (signInError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      return;
    }

    router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.centerText}>
          로그인
        </ThemedText>

        <ThemedView style={styles.form}>
          <TextInput
            placeholder="이메일 또는 닉네임"
            placeholderTextColor={theme.textSecondary}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoComplete="username"
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <TextInput
            placeholder="비밀번호"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={submitting}
            style={[styles.primaryButton, submitting && styles.disabled]}>
            <ThemedText type="default" style={styles.buttonLabel}>
              {submitting ? '로그인 중...' : '로그인'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          계정이 없으신가요?{' '}
          <Link href="/signup">
            <ThemedText type="linkPrimary">회원가입</ThemedText>
          </Link>
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  disabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: '#ffffff',
  },
  error: {
    color: '#e5484d',
  },
});
