import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Drama } from '@/components/drama-card';
import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const CARD_WIDTH = 140;

type DramaRowProps = {
  title: string;
  data: Drama[];
  onPressDrama: (dramaId: string) => void;
  favoriteIds: Set<string>;
  onToggleFavorite?: (dramaId: string) => void;
  onSeeAll?: () => void;
};

export function DramaRow({ title, data, onPressDrama, favoriteIds, onToggleFavorite, onSeeAll }: DramaRowProps) {
  return (
    <ThemedView style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              전체보기 &gt;
            </ThemedText>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
        {data.map((drama) => (
          <View key={drama.id} style={styles.cardWrapper}>
            <DramaCard
              drama={drama}
              onPress={() => onPressDrama(drama.id)}
              isFavorite={favoriteIds.has(drama.id)}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(drama.id) : undefined}
            />
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.five,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  rowContent: {
    paddingHorizontal: Spacing.three,
    gap: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
});
