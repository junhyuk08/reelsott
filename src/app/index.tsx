import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          reelsott
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.actions}>
          <Link href="/login" style={styles.linkButton}>
            <ThemedText type="link">로그인</ThemedText>
          </Link>
          <Link href="/signup" style={styles.linkButton}>
            <ThemedText type="link">회원가입</ThemedText>
          </Link>
        </ThemedView>
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
