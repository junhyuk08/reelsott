import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDrama } from '@/hooks/use-dramas';
import { useEpisodes, type Episode } from '@/hooks/use-episodes';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#FF3B5C';
const EPISODE_COIN_COST = 30;

export default function DramaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { isLoggedIn } = useSession();
  const { drama, loading: dramaLoading, error: dramaError } = useDrama(id);
  const { episodes, unlockedIds, loading: episodesLoading, unlockEpisode } = useEpisodes(id);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  if (dramaLoading || episodesLoading) return null;

  if (dramaError || !drama) {
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

  const dramaTitle = drama.title;
  const freeEpisodeCount = drama.freeEpisodeCount;

  function isLocked(episode: Episode) {
    return episode.episodeNumber > freeEpisodeCount && !unlockedIds.has(episode.id);
  }

  async function handlePressLocked(episode: Episode) {
    if (!isLoggedIn) {
      Alert.alert('로그인이 필요합니다.');
      return;
    }

    setUnlockingId(episode.id);
    const result = await unlockEpisode(episode.id);
    setUnlockingId(null);

    if (!result.success) {
      Alert.alert('잠금 해제 실패', result.error);
      return;
    }

    if (episode.videoUrl) {
      handlePressPlay(episode.id, episode.episodeNumber, episode.videoUrl);
    }
  }

  function handlePressPlay(episodeId: string, episodeNumber: number, videoUrl: string) {
    router.push({
      pathname: '/watch/[episodeId]',
      params: {
        episodeId,
        videoUrl,
        title: `${dramaTitle} ${episodeNumber}화`,
      },
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <BackButton />
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
              <ThemedText type="title" style={styles.title}>
                {drama.title}
              </ThemedText>
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
            const videoUrl = episode.videoUrl;
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
                  <Pressable
                    onPress={() => handlePressLocked(episode)}
                    disabled={unlockingId === episode.id}
                    style={styles.lockButton}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {unlockingId === episode.id ? '해제 중...' : `🔒 ${EPISODE_COIN_COST}코인으로 잠금 해제`}
                    </ThemedText>
                  </Pressable>
                ) : videoUrl ? (
                  <Pressable
                    onPress={() => handlePressPlay(episode.id, episode.episodeNumber, videoUrl)}
                    style={styles.playButton}>
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
