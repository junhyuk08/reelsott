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

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
const ACCENT = '#FF3B5C';

const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  user_already_exists: '이미 가입된 이메일입니다.',
  email_exists: '이미 가입된 이메일입니다.',
};

const NICKNAME_TAKEN_MESSAGE = '이미 사용 중인 닉네임입니다.';

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
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Validated live as each field changes, shown directly under that field —
  // no separate "확인하기" button/step.
  const passwordFormatError =
    password.length > 0 && !PASSWORD_REGEX.test(password)
      ? '영문, 숫자, 특수문자(!@#$%^&*)를 포함해 8자 이상이어야 합니다.'
      : null;
  const confirmPasswordError =
    confirmPassword.length > 0 && password !== confirmPassword ? '비밀번호가 일치하지 않습니다.' : null;

  async function handleSignup() {
    const trimmedNickname = nickname.trim();
    setNicknameError(null);

    if (!email || !password || !confirmPassword || !trimmedNickname) {
      setError('모든 항목을 입력해주세요.');
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setError('비밀번호는 영문, 숫자, 특수문자(!@#$%^&*)를 포함해 8자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setError(null);
    setSubmitting(true);

    const { data: nicknameAvailable, error: nicknameCheckError } = await supabase.rpc(
      'check_nickname_available',
      { p_nickname: trimmedNickname }
    );

    if (nicknameCheckError) {
      setSubmitting(false);
      setNicknameError('닉네임 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }

    if (!nicknameAvailable) {
      setSubmitting(false);
      setNicknameError(NICKNAME_TAKEN_MESSAGE);
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname: trimmedNickname },
      },
    });

    setSubmitting(false);

    if (signupError) {
      // The pre-check above covers the common case, but two signups can still
      // race between it and the insert. When that happens, handle_new_user()
      // fails on profiles_nickname_lower_idx and GoTrue surfaces it as an
      // opaque 500 with no error detail (empty body) — indistinguishable from
      // a real server error by code or message. Re-checking the nickname is
      // the only reliable way to tell the two apart.
      if (!KNOWN_ERROR_MESSAGES[signupError.code ?? '']) {
        const { data: stillAvailable } = await supabase.rpc('check_nickname_available', {
          p_nickname: trimmedNickname,
        });
        if (stillAvailable === false) {
          setNicknameError(NICKNAME_TAKEN_MESSAGE);
          return;
        }
      }
      // Falls back to a generic message rather than signupError.message —
      // that's Supabase's own internal wording and shouldn't reach the user.
      setError(toKoreanError(signupError.code, '가입 처리 중 오류가 발생했습니다. 다시 시도해주세요.'));
      return;
    }

    if (data.session) {
      // Email confirmation is disabled for this project, so signUp already
      // returned an active session. Sign back out so the user has to log in
      // deliberately rather than landing in the app already authenticated.
      await supabase.auth.signOut();
      router.replace('/login');
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <BackButton />
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedView style={styles.logoArea}>
              <ThemedText style={styles.logoEmoji}>✨</ThemedText>
              <ThemedText type="subtitle" style={styles.title}>
                가입 확인 이메일을 보냈어요
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                받은편지함에서 인증 링크를 눌러 가입을 완료해주세요.
              </ThemedText>
            </ThemedView>

            <Pressable onPress={() => router.replace('/login')} style={styles.signupButton}>
              <ThemedText style={styles.signupButtonText}>로그인 화면으로</ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <BackButton />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <ThemedView style={styles.logoArea}>
              <ThemedText style={styles.logoEmoji}>✨</ThemedText>
              <ThemedText type="subtitle" style={styles.title}>
                계정 만들기
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                몇 가지 정보만 입력하면 바로 시작할 수 있어요
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.card}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="닉네임"
                placeholderTextColor={theme.textSecondary}
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="none"
                maxLength={20}
              />
              {nicknameError && (
                <ThemedText type="small" style={styles.errorText}>
                  {nicknameError}
                </ThemedText>
              )}
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="이메일"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="비밀번호"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
              />
              <ThemedText
                type="small"
                themeColor={passwordFormatError ? undefined : 'textSecondary'}
                style={[styles.hint, passwordFormatError && styles.errorText]}>
                {passwordFormatError ?? '8자 이상, 영문 · 숫자 · 특수문자(!@#$%^&*) 포함'}
              </ThemedText>

              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="비밀번호 확인"
                placeholderTextColor={theme.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="password-new"
              />
              {confirmPasswordError && (
                <ThemedText type="small" style={styles.errorText}>
                  {confirmPasswordError}
                </ThemedText>
              )}

              {error && (
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              )}

              <Pressable
                onPress={handleSignup}
                disabled={submitting}
                style={[styles.signupButton, submitting && styles.disabled]}>
                <ThemedText style={styles.signupButtonText}>
                  {submitting ? '가입 중...' : '회원가입'}
                </ThemedText>
              </Pressable>
            </ThemedView>

            <Link href="/login" style={styles.loginLink}>
              <ThemedText type="small" themeColor="textSecondary">
                이미 계정이 있으신가요? <ThemedText type="smallBold" style={styles.loginLinkAccent}>로그인</ThemedText>
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
    marginBottom: Spacing.four,
  },
  logoEmoji: {
    fontSize: 40,
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
  hint: {
    marginTop: -Spacing.one,
    marginLeft: Spacing.half,
  },
  errorText: {
    color: '#D33',
    textAlign: 'center',
  },
  signupButton: {
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
  signupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    marginTop: Spacing.five,
    alignSelf: 'center',
  },
  loginLinkAccent: {
    color: ACCENT,
  },
});
