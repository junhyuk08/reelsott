import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDrama } from '@/hooks/use-dramas';
import { useEpisodes, type Episode } from '@/hooks/use-episodes';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#FF3B5C';

export default function DramaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { drama, loading: dramaLoading, error: dramaError } = useDrama(id);
  const { episodes, loading: episodesLoading } = useEpisodes(id);

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

  function handlePressLocked() {
    Alert.alert('잠금 해제', '코인으로 잠금 해제하는 기능은 곧 추가될 예정이에요.');
  }

  function handlePressPlay(episode: Episode) {
    router.push({
      pathname: '/watch/[episodeId]',
      params: {
        episodeId: episode.id,
        videoUrl: episode.videoUrl,
        title: `${dramaTitle} ${episode.episodeNumber}화`,
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
          renderItem={({ item: episode, index }) => (
            <View
              style={[
                styles.episodeRow,
                { borderTopColor: theme.backgroundSelected },
                index === 0 && styles.episodeRowFirst,
              ]}>
              <ThemedText type="default">{episode.episodeNumber}화</ThemedText>
              {episode.isLocked ? (
                <Pressable onPress={handlePressLocked} style={styles.lockButton}>
                  <ThemedText type="small" themeColor="textSecondary">
                    🔒 코인으로 잠금 해제
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable onPress={() => handlePressPlay(episode)} style={styles.playButton}>
                  <ThemedText type="small" style={styles.playButtonText}>
                    ▶ 재생
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}
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
