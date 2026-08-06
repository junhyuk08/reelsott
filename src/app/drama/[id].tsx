import { Ionicons } from '@expo/vector-icons';
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
import { EPISODE_COIN_COST, getLockReason, useEpisodes, type Episode } from '@/hooks/use-episodes';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { incrementViewCount } from '@/lib/dramas';
import { getResizedImageUrl } from '@/lib/images';
import { supabase } from '@/lib/supabase';

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

  // Drives the "이어서 보기" button next to the title — only known once this
  // resolves, so the button simply doesn't render until then (or at all, if
  // this drama has never actually been watched).
  useEffect(() => {
    if (!session) {
      setLastEpisodeId(null);
      return;
    }
    let cancelled = false;

    supabase
      .from('watch_history')
      .select('last_episode_id')
      .eq('user_id', session.user.id)
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

  function handlePressEpisode(episode: Episode) {
    if (!episode.videoUrl) return;

    const lockReason = getLockReason(episode, { freeEpisodeCount, unlockedIds, isLoggedIn });

    if (lockReason === 'login') {
      Alert.alert('로그인이 필요합니다', '2화부터는 로그인 후 시청할 수 있어요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인하기', onPress: () => router.push('/login') },
      ]);
      return;
    }

    // No recordWatchHistory call here — watch/[dramaId].tsx now records it
    // itself once this episode actually starts playing, not just because it
    // was tapped/navigated to.
    router.push({
      pathname: '/watch/[dramaId]',
      params: { dramaId: id, startEpisodeId: episode.id },
    });
  }

  // last_episode_id is set by the reel screen once playback actually starts,
  // so this is a pure navigation — no recordWatchHistory call needed here.
  function handleContinueWatching() {
    if (!lastEpisodeId) return;
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
                    source={{ uri: getResizedImageUrl(drama.thumbnailUrl, { width: 800, height: 450 }) ?? undefined }}
                    style={[styles.thumbnail, styles.thumbnailOverlay]}
                    contentFit="cover"
                    transition={300}
                  />
                )}
              </View>
              <View style={styles.titleRow}>
                <ThemedText type="title" style={styles.title}>
                  {drama.title}
                </ThemedText>
                {lastEpisodeId && (
                  <Pressable onPress={handleContinueWatching} style={styles.continueButton} hitSlop={4}>
                    <Ionicons name="play" size={12} color="#ffffff" />
                    <ThemedText type="small" style={styles.continueButtonText} numberOfLines={1}>
                      이어서 보기
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
            const lockReason = getLockReason(episode, { freeEpisodeCount, unlockedIds, isLoggedIn });
            return (
              <View
                style={[
                  styles.episodeRow,
                  { borderTopColor: theme.backgroundSelected },
                  index === 0 && styles.episodeRowFirst,
                ]}>
                <ThemedText type="default">{episode.episodeNumber}화</ThemedText>
                {lockReason === 'login' ? (
                  <Pressable onPress={() => handlePressEpisode(episode)} style={styles.lockButton}>
                    <Ionicons name="lock-closed" size={12} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      로그인이 필요합니다
                    </ThemedText>
                  </Pressable>
                ) : lockReason === 'coin' ? (
                  <Pressable onPress={() => handlePressEpisode(episode)} style={styles.lockButton}>
                    <Ionicons name="lock-closed" size={12} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      {EPISODE_COIN_COST}코인으로 잠금 해제
                    </ThemedText>
                  </Pressable>
                ) : episode.videoUrl ? (
                  <Pressable onPress={() => handlePressEpisode(episode)} style={styles.playButton}>
                    <Ionicons name="play" size={12} color="#ffffff" />
                    <ThemedText type="small" style={styles.playButtonText}>
                      재생
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
    fontSize: 24,
    lineHeight: 30,
  },
  continueButton: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
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
