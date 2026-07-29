import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type BackButtonProps = {
  color?: string;
  withBackdrop?: boolean;
};

export function BackButton({ color, withBackdrop }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <Pressable onPress={handleBack} style={[styles.button, withBackdrop && styles.buttonBackdrop]} hitSlop={8}>
      <ThemedText style={[styles.glyph, withBackdrop ? styles.glyphOnBackdrop : color ? { color } : undefined]}>
        ‹
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    marginLeft: Spacing.two,
    marginTop: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBackdrop: {
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  glyph: {
    fontSize: 26,
    fontWeight: '600',
    marginTop: -2,
  },
  glyphOnBackdrop: {
    color: '#ffffff',
  },
});
