import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function WatchEpisodeScreen() {
  const { videoUrl, title } = useLocalSearchParams<{ episodeId: string; videoUrl: string; title?: string }>();
  const player = useVideoPlayer(videoUrl, (player) => {
    player.play();
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <BackButton color="#ffffff" />
        {title && (
          <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
        )}
        <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
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
  title: {
    color: '#ffffff',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  video: {
    flex: 1,
    width: '100%',
  },
});
