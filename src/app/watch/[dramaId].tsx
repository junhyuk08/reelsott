import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { EpisodeReel } from '@/components/episode-reel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDrama } from '@/hooks/use-dramas';
import { getLockReason, useEpisodes, type Episode } from '@/hooks/use-episodes';
import { useSession } from '@/hooks/use-session';
import { recordWatchHistory } from '@/lib/watch-history';

export default function WatchDramaScreen() {
  const { dramaId, startEpisodeId } = useLocalSearchParams<{ dramaId: string; startEpisodeId?: string }>();
  const { session, isLoggedIn } = useSession();
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
  // Tracks the episode last recorded to watch history, so a single episode's
  // playingChange toggling (pause/resume, brief buffering stalls) doesn't
  // upsert on every rising edge — only actually switching episodes does.
  const lastRecordedEpisodeIdRef = useRef<string | null>(null);

  const initialIndex = useMemo(() => {
    const index = episodes.findIndex((episode) => episode.id === startEpisodeId);
    return index >= 0 ? index : 0;
  }, [episodes, startEpisodeId]);

  // Records watch history when an episode actually starts playing (not just
  // when it scrolls into view), so last_episode_id reflects what was really
  // watched.
  function handlePlaybackStart(episodeId: string) {
    if (!session) return;
    if (lastRecordedEpisodeIdRef.current === episodeId) return;
    lastRecordedEpisodeIdRef.current = episodeId;
    recordWatchHistory(session.user.id, dramaId, episodeId);
  }

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
            lockReason={getLockReason(item, { freeEpisodeCount, unlockedIds, isLoggedIn })}
            onUnlock={() => unlockEpisode(item.id)}
            onFinish={handleFinish}
            onPlaybackStart={() => handlePlaybackStart(item.id)}
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
