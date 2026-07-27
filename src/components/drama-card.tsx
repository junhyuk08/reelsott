import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type Drama = {
  id: string;
  title: string;
  genre: string;
  episodeCount: number;
};

type DramaCardProps = {
  drama: Drama;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function DramaCard({ drama, onPress, style }: DramaCardProps) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
      <ThemedView type="backgroundElement" style={styles.thumbnail} />
      <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
        {drama.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
        {drama.genre} · {drama.episodeCount}화
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: Spacing.two,
  },
  title: {
    marginTop: Spacing.half + 4,
  },
  meta: {
    marginTop: 2,
  },
});
