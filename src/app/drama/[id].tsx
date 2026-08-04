import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDrama } from '@/hooks/use-dramas';
import { EPISODE_COIN_COST, useEpisodes, type Episode } from '@/hooks/use-episodes';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { incrementViewCount } from '@/lib/dramas';
import { supabase } from '@/lib/supabase';
import { recordWatchHistory } from '@/lib/watch-history';

const ACCENT = '#FF3B5C';

export default function DramaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { session, isLoggedIn } = useSession();
  const { drama, loading: dramaLoading, error: dramaError } = useDrama(id);
  const { episodes, unlockedIds, loading: episodesLoading } = useEpisodes(id);
  const [lastEpisodeId, setLastEpisodeId] = useState<string | null>(null);

  useEffect(() => {
    incrementViewCount(id);
  }, [id]);

  useEffect(() => {
    if (!session) {
      setLastEpisodeId(null);
      return;
    }

    let cancelled = false;

    supabase
      .from('watch_history')
      .select('last_episode_id')
      .eq('drama_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLastEpisodeId(data?.last_episode_id ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [session, id]);

  if (dramaLoading || episodesLoading) return null;

  if (dramaError || !drama) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <BackButton withBackdrop />
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            작품을 불러오지 못했어요.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const freeEpisodeCount = drama.freeEpisodeCount;

  function isLocked(episode: Episode) {
    return episode.episodeNumber > freeEpisodeCount && !unlockedIds.has(episode.id);
  }

  function handlePressEpisode(episode: Episode) {
    if (!episode.videoUrl) return;

    if (isLocked(episode) && !isLoggedIn) {
      Alert.alert('로그인이 필요합니다.');
      return;
    }

    if (session) {
      recordWatchHistory(session.user.id, id, episode.id);
    }
    router.push({
      pathname: '/watch/[dramaId]',
      params: { dramaId: id, startEpisodeId: episode.id },
    });
  }

  function handleContinueWatching() {
    if (!lastEpisodeId) return;

    if (session) {
      recordWatchHistory(session.user.id, id, lastEpisodeId);
    }
    router.push({
      pathname: '/watch/[dramaId]',
      params: { dramaId: id, startEpisodeId: lastEpisodeId },
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <BackButton withBackdrop />
        <FlatList
          data={episodes}
          keyExtractor={(episode) => episode.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.thumbnailWrapper}>
                <ThemedView type="backgroundElement" style={styles.thumbnail} />
                {drama.thumbnailUrl && (
                  <Image
                    source={{ uri: drama.thumbnailUrl }}
                    style={[styles.thumbnail, styles.thumbnailOverlay]}
                    contentFit="cover"
                    transition={300}
                  />
                )}
              </View>
              <View style={styles.titleRow}>
                <ThemedText type="title" style={[styles.title, styles.titleText]} numberOfLines={1}>
                  {drama.title}
                </ThemedText>
                {lastEpisodeId && (
                  <Pressable onPress={handleContinueWatching} style={styles.continueButton}>
                    <ThemedText type="small" style={styles.continueButtonText}>
                      ▶ 이어서 보기
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {drama.genre} · {drama.episodeCount}화 (무료 {drama.freeEpisodeCount}화)
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
              아직 준비 중인 콘텐츠입니다
            </ThemedText>
          }
          renderItem={({ item: episode, index }) => {
            const locked = isLocked(episode);
            return (
              <View
                style={[
                  styles.episodeRow,
                  { borderTopColor: theme.backgroundSelected },
                  index === 0 && styles.episodeRowFirst,
                ]}>
                <ThemedText type="default">{episode.episodeNumber}화</ThemedText>
                {locked ? (
                  <Pressable onPress={() => handlePressEpisode(episode)} style={styles.lockButton}>
                    <ThemedText type="small" themeColor="textSecondary">
                      🔒 {EPISODE_COIN_COST}코인으로 잠금 해제
                    </ThemedText>
                  </Pressable>
                ) : episode.videoUrl ? (
                  <Pressable onPress={() => handlePressEpisode(episode)} style={styles.playButton}>
                    <ThemedText type="small" style={styles.playButtonText}>
                      ▶ 재생
                    </ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    준비 중
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
    padding: Spacing.four,
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
  thumbnailWrapper: {
    marginBottom: Spacing.two,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Spacing.two,
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleText: {
    flexShrink: 1,
  },
  continueButton: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  continueButtonText: {
    color: '#ffffff',
    fontWeight: '700',
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
  lockButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  playButton: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  playButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
