import type { Session } from '@supabase/supabase-js';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (session === undefined) {
    return <ThemedView style={styles.container} />;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          reelsott
        </ThemedText>

        {session ? (
          <ThemedView type="backgroundElement" style={styles.actions}>
            <ThemedText type="default">
              {(session.user.user_metadata?.nickname as string | undefined) ?? session.user.email}
              님, 환영합니다
            </ThemedText>
            <Pressable onPress={handleLogout} style={styles.linkButton}>
              <ThemedText type="link">로그아웃</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <ThemedView type="backgroundElement" style={styles.actions}>
            <Link href="/login" style={styles.linkButton}>
              <ThemedText type="link">로그인</ThemedText>
            </Link>
            <Link href="/signup" style={styles.linkButton}>
              <ThemedText type="link">회원가입</ThemedText>
            </Link>
          </ThemedView>
        )}
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
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.three,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: Spacing.two,
  },
});
