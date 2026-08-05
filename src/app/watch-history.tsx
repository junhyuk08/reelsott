import { Redirect, useRouter } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/hooks/use-favorites';
import { useSession } from '@/hooks/use-session';
import { useWatchHistory } from '@/hooks/use-watch-history';
import { recordWatchHistory } from '@/lib/watch-history';

export default function WatchHistoryScreen() {
  const router = useRouter();
  const { session, isLoggedIn, loading: sessionLoading } = useSession();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { dramas, loading } = useWatchHistory();

  if (sessionLoading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  function handlePressDrama(dramaId: string) {
    if (session) {
      recordWatchHistory(session.user.id, dramaId);
    }
    router.push({ pathname: '/drama/[id]', params: { id: dramaId } });
  }

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
                onPress={() => handlePressDrama(item.id)}
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
