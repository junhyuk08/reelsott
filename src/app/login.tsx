import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCENT = '#FF3B5C';

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
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <BackButton />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <ThemedView style={styles.logoArea}>
              <ThemedText style={styles.logoEmoji}>🎬</ThemedText>
              <ThemedText type="subtitle" style={styles.title}>
                다시 만나서 반가워요
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                이메일 또는 닉네임으로 로그인하고 이어보기를 시작하세요
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.card}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="이메일 또는 닉네임"
                placeholderTextColor={theme.textSecondary}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoComplete="username"
              />
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="비밀번호"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />

              {error && (
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              )}

              <Pressable
                onPress={handleLogin}
                disabled={submitting}
                style={[styles.loginButton, submitting && styles.disabled]}>
                <ThemedText style={styles.loginButtonText}>
                  {submitting ? '로그인 중...' : '로그인'}
                </ThemedText>
              </Pressable>
            </ThemedView>

            <Link href="/signup" style={styles.signupLink}>
              <ThemedText type="small" themeColor="textSecondary">
                계정이 없으신가요? <ThemedText type="smallBold" style={styles.signupLinkAccent}>회원가입</ThemedText>
              </ThemedText>
            </Link>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  logoEmoji: {
    fontSize: 44,
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.half,
    textAlign: 'center',
  },
  card: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 1,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
    boxShadow: '0 6px 10px rgba(255, 59, 92, 0.25)',
  },
  disabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#D33',
    textAlign: 'center',
  },
  signupLink: {
    marginTop: Spacing.five,
    alignSelf: 'center',
  },
  signupLinkAccent: {
    color: ACCENT,
  },
});
