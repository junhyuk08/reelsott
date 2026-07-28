import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaCard, type Drama } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/hooks/use-favorites';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase';

type WatchHistoryRow = {
  dramas: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    genre: string;
    episode_count: number;
    is_new: boolean;
    view_count: number;
  } | null;
};

export default function WatchHistoryScreen() {
  const { session, isLoggedIn, loading: sessionLoading } = useSession();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    supabase
      .from('watch_history')
      .select('dramas(id, title, thumbnail_url, genre, episode_count, is_new, view_count)')
      .order('watched_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setDramas(
          ((data ?? []) as unknown as WatchHistoryRow[])
            .map((row) => row.dramas)
            .filter((d): d is NonNullable<WatchHistoryRow['dramas']> => d !== null)
            .map((d) => ({
              id: d.id,
              title: d.title,
              thumbnailUrl: d.thumbnail_url,
              genre: d.genre,
              episodeCount: d.episode_count,
              isNew: d.is_new,
              viewCount: d.view_count,
            }))
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (sessionLoading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {!loading && dramas.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            아직 시청한 작품이 없어요.
          </ThemedText>
        ) : (
          <FlatList
            data={dramas}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <DramaCard
                drama={item}
                onPress={() => {}}
                isFavorite={favoriteIds.has(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
              />
            )}
          />
        )}
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
  listContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    gap: Spacing.three,
  },
  message: {
    padding: Spacing.four,
    textAlign: 'center',
  },
});
