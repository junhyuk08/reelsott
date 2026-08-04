import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { EpisodeReel } from '@/components/episode-reel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDrama } from '@/hooks/use-dramas';
import { useEpisodes, type Episode } from '@/hooks/use-episodes';
import { useSession } from '@/hooks/use-session';
import { recordWatchHistory } from '@/lib/watch-history';

const WATCH_HISTORY_DEBOUNCE_MS = 1500;

export default function WatchDramaScreen() {
  const { dramaId, startEpisodeId } = useLocalSearchParams<{ dramaId: string; startEpisodeId?: string }>();
  const { session } = useSession();
  const { height } = useWindowDimensions();
  const { drama, loading: dramaLoading, error: dramaError } = useDrama(dramaId);
  const {
    episodes,
    unlockedIds,
    loading: episodesLoading,
    error: episodesError,
    unlockEpisode,
  } = useEpisodes(dramaId);
  const listRef = useRef<FlatList<Episode>>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Re-record watch history as focus moves between episodes (debounced so a
  // quick flick through several reels doesn't fire one upsert per frame),
  // so "continue watching" reflects how recently the drama was actually
  // engaged with, not just the moment the feed was first opened.
  useEffect(() => {
    if (!session || focusedIndex == null) return;

    const episodeId = episodes[focusedIndex]?.id;

    const timer = setTimeout(() => {
      recordWatchHistory(session.user.id, dramaId, episodeId);
    }, WATCH_HISTORY_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [session, dramaId, focusedIndex, episodes]);

  const initialIndex = useMemo(() => {
    const index = episodes.findIndex((episode) => episode.id === startEpisodeId);
    return index >= 0 ? index : 0;
  }, [episodes, startEpisodeId]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visible = viewableItems.find((item) => item.isViewable);
    if (visible?.index != null) {
      setFocusedIndex(visible.index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const handleFinish = useCallback(() => {
    setFocusedIndex((current) => {
      const currentIndex = current ?? initialIndex;
      const next = currentIndex + 1;
      if (next < episodes.length) {
        listRef.current?.scrollToIndex({ index: next });
      }
      return current;
    });
  }, [episodes.length, initialIndex]);

  if (dramaLoading || episodesLoading) return null;

  if (dramaError || !drama || episodesError) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <BackButton color="#ffffff" />
          <ThemedText style={styles.message}>작품을 불러오지 못했어요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (episodes.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <BackButton color="#ffffff" />
          <ThemedText style={styles.message}>아직 준비 중인 콘텐츠입니다</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const freeEpisodeCount = drama.freeEpisodeCount;
  const focusedEpisode = episodes[focusedIndex ?? initialIndex];

  return (
    <ThemedView style={styles.container}>
      <FlatList
        ref={listRef}
        data={episodes}
        keyExtractor={(episode) => episode.id}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        initialScrollIndex={initialIndex}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <EpisodeReel
            episode={item}
            height={height}
            isFocused={index === (focusedIndex ?? initialIndex)}
            isLocked={item.episodeNumber > freeEpisodeCount && !unlockedIds.has(item.id)}
            onUnlock={() => unlockEpisode(item.id)}
            onFinish={handleFinish}
          />
        )}
      />
      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <BackButton color="#ffffff" />
        {focusedEpisode && (
          <ThemedText numberOfLines={1} style={styles.title}>
            {drama.title} {focusedEpisode.episodeNumber}화
          </ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flex: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  title: {
    color: '#ffffff',
    fontWeight: '700',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  message: {
    color: '#ffffff',
    padding: Spacing.three,
    textAlign: 'center',
  },
});
