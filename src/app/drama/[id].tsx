import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDrama } from '@/hooks/use-dramas';
import { useTheme } from '@/hooks/use-theme';

const EPISODE_COIN_COST = 30;

export default function DramaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { drama, loading, error } = useDrama(id);

  if (loading) return null;

  if (error || !drama) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <BackButton />
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            작품을 불러오지 못했어요.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const episodes = Array.from({ length: drama.episodeCount }, (_, index) => index + 1);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <BackButton />
        <FlatList
          data={episodes}
          keyExtractor={(episodeNumber) => String(episodeNumber)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                {drama.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {drama.genre} · {drama.episodeCount}화
              </ThemedText>
            </View>
          }
          renderItem={({ item: episodeNumber, index }) => {
            const locked = episodeNumber > drama.freeEpisodeCount;
            return (
              <View
                style={[
                  styles.episodeRow,
                  { borderTopColor: theme.backgroundSelected },
                  index === 0 && styles.episodeRowFirst,
                ]}>
                <ThemedText type="default">{episodeNumber}화</ThemedText>
                {locked && (
                  <ThemedText type="small" themeColor="textSecondary">
                    🔒 {EPISODE_COIN_COST}코인
                  </ThemedText>
                )}
              </View>
            );
          }}
        />
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
  message: {
    padding: Spacing.three,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: Spacing.five,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.three,
    gap: Spacing.half,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  episodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
  },
  episodeRowFirst: {
    borderTopWidth: 0,
  },
});
