import { Image } from 'expo-image';
import { Pressable, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getResizedImageUrl } from '@/lib/images';

export type Drama = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  genre: string;
  episodeCount: number;
  isNew: boolean;
  viewCount: number;
};

type DramaCardProps = {
  drama: Drama;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  rank?: number;
};

export function DramaCard({ drama, onPress, style, isFavorite, onToggleFavorite, rank }: DramaCardProps) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
      <ThemedView style={styles.thumbnailWrapper}>
        <ThemedView type="backgroundElement" style={styles.thumbnail} />
        {drama.thumbnailUrl && (
          <Image
            source={{ uri: getResizedImageUrl(drama.thumbnailUrl, { width: 300, height: 450 }) ?? undefined }}
            style={[styles.thumbnail, styles.thumbnailOverlay]}
            contentFit="cover"
            transition={300}
          />
        )}
        {rank !== undefined && (
          <View style={styles.rankBadge}>
            <ThemedText style={styles.rankText}>{rank}</ThemedText>
          </View>
        )}
        {onToggleFavorite && (
          <Pressable onPress={onToggleFavorite} style={styles.favoriteButton} hitSlop={8}>
            <ThemedText style={styles.favoriteGlyph}>{isFavorite ? '♥' : '♡'}</ThemedText>
          </Pressable>
        )}
      </ThemedView>
      <ThemedText type="smallBold" style={styles.title} numberOfLines={1} ellipsizeMode="tail">
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
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: Spacing.two,
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  rankBadge: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Spacing.one,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteGlyph: {
    color: '#FF3B5C',
    fontSize: 16,
  },
  title: {
    marginTop: Spacing.half + 4,
  },
  meta: {
    marginTop: 2,
  },
});
