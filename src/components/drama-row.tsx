import { ScrollView, StyleSheet } from 'react-native';

import type { Drama } from '@/components/drama-card';
import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type DramaRowProps = {
  title: string;
  data: Drama[];
  onPressDrama: (dramaId: string) => void;
  favoriteIds: Set<string>;
  onToggleFavorite?: (dramaId: string) => void;
};

export function DramaRow({ title, data, onPressDrama, favoriteIds, onToggleFavorite }: DramaRowProps) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
        {data.map((drama) => (
          <DramaCard
            key={drama.id}
            drama={drama}
            onPress={() => onPressDrama(drama.id)}
            style={styles.rowCard}
            isFavorite={favoriteIds.has(drama.id)}
            onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(drama.id) : undefined}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.five,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  rowContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  rowCard: {
    width: 130,
    flex: 0,
  },
});
