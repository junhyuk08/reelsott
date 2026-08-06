import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const ACCENT = '#FF3B5C';

type LogoProps = {
  onPress?: () => void;
};

export function Logo({ onPress }: LogoProps) {
  const content = (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="play" size={12} color="#ffffff" />
      </View>
      <ThemedText style={styles.wordmark}>
        <ThemedText style={styles.wordmarkAccent}>reels</ThemedText>ott
      </ThemedText>
    </View>
  );

  if (!onPress) return content;

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: Spacing.two,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  wordmarkAccent: {
    color: ACCENT,
    fontWeight: '800',
  },
});
