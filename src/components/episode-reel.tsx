import { useEventListener } from 'expo';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { EPISODE_COIN_COST, type Episode, type LockReason } from '@/hooks/use-episodes';

type UnlockResult = { success: true; coinBalance: number } | { success: false; error: string };

type EpisodeReelProps = {
  episode: Episode;
  height: number;
  isFocused: boolean;
  lockReason: LockReason;
  onUnlock: () => Promise<UnlockResult>;
  onFinish: () => void;
  onPlaybackStart?: () => void;
};

export function EpisodeReel({
  episode,
  height,
  isFocused,
  lockReason,
  onUnlock,
  onFinish,
  onPlaybackStart,
}: EpisodeReelProps) {
  const router = useRouter();
  const isLocked = lockReason !== null;
  const [unlocking, setUnlocking] = useState(false);
  const player = useVideoPlayer(episode.videoUrl, (player) => {
    player.loop = false;
  });

  useEventListener(player, 'playToEnd', onFinish);
  // `.play()` below is just a request — playingChange with isPlaying: true is
  // the actual signal that frames are coming out (accounts for buffering,
  // autoplay being blocked, etc.), which is what watch history should key off.
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (isPlaying) onPlaybackStart?.();
  });

  useEffect(() => {
    if (isLocked) return;
    if (isFocused) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [isFocused, isLocked, player]);

  // Pops the login prompt the moment a guest scrolls/autoplays into episode
  // 2+, not just when they tap the locked button — alertedRef guards against
  // re-firing on every re-render while this reel stays focused, but still
  // fires again each time the user swipes back into this episode.
  const alertedRef = useRef(false);
  useEffect(() => {
    if (isFocused && lockReason === 'login') {
      if (alertedRef.current) return;
      alertedRef.current = true;
      Alert.alert('로그인이 필요합니다', '2화부터는 로그인 후 시청할 수 있어요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인하기', onPress: () => router.push('/login') },
      ]);
    } else if (!isFocused) {
      alertedRef.current = false;
    }
  }, [isFocused, lockReason, router]);

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

  if (lockReason === 'login') {
    return (
      <View style={[styles.item, { height }]}>
        <Pressable onPress={() => router.push('/login')} style={styles.unlockButton}>
          <ThemedText style={styles.unlockText}>🔒 로그인이 필요합니다</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (lockReason === 'coin') {
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
