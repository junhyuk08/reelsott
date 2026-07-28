import Constants from 'expo-constants';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ACCENT = '#FF3B5C';
const MENU_ITEMS = ['시청 기록', '찜한 드라마', '알림 설정', '고객센터', '공지사항'];
const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

async function extractErrorMessage(error: unknown, fallback: string) {
  const context = (error as { context?: Response })?.context;
  try {
    const body = await context?.json();
    return typeof body?.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export default function MyPageScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, isLoggedIn, loading } = useSession();

  const [coinBalance, setCoinBalance] = useState(0);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setCoinBalance(data.coin_balance);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  const nickname = (session?.user.user_metadata?.nickname as string | undefined) ?? '회원';
  const email = session?.user.email ?? '';

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function handleDeleteAccount() {
    if (!deletePassword) {
      setDeleteError('비밀번호를 입력해주세요.');
      return;
    }

    setDeleteError(null);
    setDeleting(true);

    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: { password: deletePassword },
    });

    if (error || !data?.success) {
      setDeleting(false);
      setDeleteError(await extractErrorMessage(error, '탈퇴 처리 중 오류가 발생했습니다.'));
      return;
    }

    await supabase.auth.signOut();
    router.replace('/login');
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
              <ThemedText type="smallBold">{coinBalance.toLocaleString()} 코인</ThemedText>
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

          {showDeleteForm ? (
            <ThemedView style={styles.deleteForm}>
              <ThemedText type="small" themeColor="textSecondary">
                계정을 삭제하려면 비밀번호를 입력해주세요. 이 작업은 되돌릴 수 없습니다.
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder="비밀번호"
                placeholderTextColor={theme.textSecondary}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                autoComplete="current-password"
              />
              {deleteError && (
                <ThemedText type="small" style={styles.deleteErrorText}>
                  {deleteError}
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
            </ThemedView>
          ) : (
            <Pressable onPress={() => setShowDeleteForm(true)} style={styles.deleteLink}>
              <ThemedText type="small" themeColor="textSecondary">
                회원탈퇴
              </ThemedText>
            </Pressable>
          )}

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
  deleteLink: {
    marginTop: Spacing.four,
    alignItems: 'center',
  },
  deleteForm: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 1,
    fontSize: 16,
  },
  deleteErrorText: {
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
  versionText: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
