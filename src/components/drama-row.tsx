import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Drama } from '@/components/drama-card';
import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CARD_WIDTH = 140;

type DramaRowProps = {
  title: string;
  data: Drama[];
  onPressDrama: (dramaId: string) => void;
  favoriteIds: Set<string>;
  onToggleFavorite?: (dramaId: string) => void;
  onSeeAll?: () => void;
  showRank?: boolean;
};

export function DramaRow({
  title,
  data,
  onPressDrama,
  favoriteIds,
  onToggleFavorite,
  onSeeAll,
  showRank,
}: DramaRowProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8} style={styles.seeAllButton}>
            <ThemedText type="small" themeColor="textSecondary">
              전체보기
            </ThemedText>
            <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
        {data.map((drama, index) => (
          <View key={drama.id} style={styles.cardWrapper}>
            <DramaCard
              drama={drama}
              onPress={() => onPressDrama(drama.id)}
              isFavorite={favoriteIds.has(drama.id)}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(drama.id) : undefined}
              rank={showRank ? index + 1 : undefined}
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
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  rowContent: {
    paddingHorizontal: Spacing.three,
    gap: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
});
