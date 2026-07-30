import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { EPISODE_COIN_COST, type Episode } from '@/hooks/use-episodes';

type UnlockResult = { success: true; coinBalance: number } | { success: false; error: string };

type EpisodeReelProps = {
  episode: Episode;
  height: number;
  isFocused: boolean;
  isLocked: boolean;
  onUnlock: () => Promise<UnlockResult>;
  onFinish: () => void;
};

export function EpisodeReel({ episode, height, isFocused, isLocked, onUnlock, onFinish }: EpisodeReelProps) {
  const [unlocking, setUnlocking] = useState(false);
  const player = useVideoPlayer(episode.videoUrl, (player) => {
    player.loop = false;
  });

  useEventListener(player, 'playToEnd', onFinish);

  useEffect(() => {
    if (isLocked) return;
    if (isFocused) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [isFocused, isLocked, player]);

  async function handleUnlock() {
    setUnlocking(true);
    try {
      const result = await onUnlock();
      if (!result.success) {
        Alert.alert('잠금 해제 실패', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      Alert.alert('잠금 해제 실패', errorMessage);
    } finally {
      setUnlocking(false);
    }
  }

  if (isLocked) {
    return (
      <View style={[styles.item, { height }]}>
        <Pressable onPress={handleUnlock} disabled={unlocking} style={styles.unlockButton}>
          <ThemedText style={styles.unlockText}>
            {unlocking ? '해제 중...' : `🔒 ${EPISODE_COIN_COST}코인으로 잠금 해제`}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!episode.videoUrl) {
    return (
      <View style={[styles.item, { height }]}>
        <ThemedText style={styles.preparingText}>준비 중</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.item, { height }]}>
      <VideoView player={player} style={styles.video} nativeControls={false} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  unlockButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  unlockText: {
    color: '#ffffff',
  },
  preparingText: {
    color: '#ffffff',
  },
});
