import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  user_already_exists: '이미 가입된 이메일입니다.',
  email_exists: '이미 가입된 이메일입니다.',
};

function toKoreanError(code: string | undefined, fallback: string) {
  return (code && KNOWN_ERROR_MESSAGES[code]) || fallback;
}

export default function SignupScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignup() {
    const trimmedNickname = nickname.trim();

    if (!email || !password || !confirmPassword || !trimmedNickname) {
      setError('모든 항목을 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setError(null);
    setSubmitting(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname: trimmedNickname },
      },
    });

    setSubmitting(false);

    if (signupError) {
      setError(toKoreanError(signupError.code, signupError.message));
      return;
    }

    if (data.session) {
      // Email confirmation is disabled for this project, so signUp already
      // returned an active session — there's no confirmation email to wait for.
      router.replace('/');
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title" style={styles.centerText}>
            가입 확인 이메일을 보냈어요
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.centerText}>
            받은편지함에서 인증 링크를 눌러 가입을 완료해주세요.
          </ThemedText>
          <Pressable onPress={() => router.replace('/login')} style={styles.primaryButton}>
            <ThemedText type="default" style={styles.buttonLabel}>
              로그인 화면으로
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.centerText}>
          회원가입
        </ThemedText>

        <ThemedView style={styles.form}>
          <TextInput
            placeholder="이메일"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <TextInput
            placeholder="비밀번호"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <TextInput
            placeholder="비밀번호 확인"
            placeholderTextColor={theme.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="password-new"
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <TextInput
            placeholder="닉네임"
            placeholderTextColor={theme.textSecondary}
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="none"
            maxLength={20}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={handleSignup}
            disabled={submitting}
            style={[styles.primaryButton, submitting && styles.disabled]}>
            <ThemedText type="default" style={styles.buttonLabel}>
              {submitting ? '가입 중...' : '가입하기'}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          이미 계정이 있으신가요?{' '}
          <Link href="/login">
            <ThemedText type="linkPrimary">로그인</ThemedText>
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
