import { useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { FlatList, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaCard } from '@/components/drama-card';
import { DramaRow } from '@/components/drama-row';
import { HomeHeader } from '@/components/home-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDramas } from '@/hooks/use-dramas';
import { useFavorites } from '@/hooks/use-favorites';
import { useSession } from '@/hooks/use-session';
import { useWatchHistory } from '@/hooks/use-watch-history';
import { recordWatchHistory } from '@/lib/watch-history';

export default function HomeScreen() {
  const router = useRouter();
  const { session, isLoggedIn } = useSession();
  const { dramas, loading, error } = useDramas();
  const { dramas: recentlyWatched } = useWatchHistory(10);
  const { favoriteIds, toggleFavorite } = useFavorites();
  const scrollViewRef = useRef<ScrollView>(null);

  function handleLogoPress() {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }

  const newDramas = useMemo(() => dramas.slice(-10).reverse(), [dramas]);

  const topDramas = useMemo(() => [...dramas].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10), [dramas]);

  const trending = useMemo(() => topDramas.slice(0, 4), [topDramas]);

  function handlePressDrama(dramaId: string) {
    if (!isLoggedIn || !session) {
      router.push('/login');
      return;
    }
    recordWatchHistory(session.user.id, dramaId);
    router.push({ pathname: '/drama/[id]', params: { id: dramaId } });
  }

  // "시청 중인 드라마" row is only rendered when isLoggedIn, so session is
  // guaranteed here. Jumps straight into the last watched episode when we
  // have one recorded; older rows (or ones only opened from a listing, never
  // played) have no last_episode_id, so those fall back to the drama detail
  // screen — same as the recommend tab's own "이어서 보기" button.
  function handleContinueWatching(dramaId: string) {
    const lastEpisodeId = recentlyWatched.find((drama) => drama.id === dramaId)?.lastEpisodeId;
    if (session) {
      recordWatchHistory(session.user.id, dramaId, lastEpisodeId ?? undefined);
    }
    if (lastEpisodeId) {
      router.push({ pathname: '/watch/[dramaId]', params: { dramaId, startEpisodeId: lastEpisodeId } });
    } else {
      router.push({ pathname: '/drama/[id]', params: { id: dramaId } });
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <HomeHeader onLogoPress={handleLogoPress} />
        {error ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            작품을 불러오지 못했어요.
          </ThemedText>
        ) : loading ? null : (
          <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
            {isLoggedIn && recentlyWatched.length > 0 && (
              <DramaRow
                title="시청 중인 드라마"
                data={recentlyWatched}
                onPressDrama={handlePressDrama}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onSeeAll={() => router.push('/watch-history')}
                onContinue={handleContinueWatching}
              />
            )}
            {topDramas.length > 0 && (
              <DramaRow
                title="실시간 Top 10"
                data={topDramas}
                onPressDrama={handlePressDrama}
                favoriteIds={favoriteIds}
                onToggleFavorite={isLoggedIn ? toggleFavorite : undefined}
                onSeeAll={() => router.push('/top-dramas')}
                showRank
              />
            )}
            {trending.length > 0 && (
              <DramaRow
                title="인기 급상승"
                data={trending}
                onPressDrama={handlePressDrama}
                favoriteIds={favoriteIds}
                onToggleFavorite={isLoggedIn ? toggleFavorite : undefined}
              />
            )}
            {newDramas.length > 0 && (
              <DramaRow
                title="새로운 드라마"
                data={newDramas}
                onPressDrama={handlePressDrama}
                favoriteIds={favoriteIds}
                onToggleFavorite={isLoggedIn ? toggleFavorite : undefined}
                onSeeAll={() => router.push('/new-dramas')}
              />
            )}
            <ThemedText type="subtitle" style={styles.gridTitle}>
              모든 드라마 보기
            </ThemedText>
            <FlatList
              data={dramas}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              columnWrapperStyle={styles.row}
              renderItem={({ item }) => (
                <DramaCard
                  drama={item}
                  onPress={() => handlePressDrama(item.id)}
                  isFavorite={favoriteIds.has(item.id)}
                  onToggleFavorite={isLoggedIn ? () => toggleFavorite(item.id) : undefined}
                />
              )}
              ListEmptyComponent={
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  아직 등록된 작품이 없어요.
                </ThemedText>
              }
            />
          </ScrollView>
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
  scrollContent: {
    paddingBottom: Spacing.five,
  },
  gridTitle: {
    fontSize: 18,
    lineHeight: 24,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.five,
    marginBottom: Spacing.three,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  message: {
    padding: Spacing.three,
    textAlign: 'center',
  },
  row: {
    gap: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
