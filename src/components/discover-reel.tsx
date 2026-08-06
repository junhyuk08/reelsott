import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DiscoverItem } from '@/hooks/use-discover-feed';

const ACCENT = '#FF3B5C';

type DiscoverReelProps = {
  item: DiscoverItem;
  height: number;
  isFocused: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onContinue: () => void;
};

export function DiscoverReel({ item, height, isFocused, isFavorite, onToggleFavorite, onContinue }: DiscoverReelProps) {
  // pageHeight already subtracts the tab bar's height (which itself bakes in
  // the bottom safe-area inset), but that's an indirect, estimate-prone path
  // — reading the inset directly here guarantees the info block clears the
  // home-indicator/gesture area regardless of any first-frame height drift.
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState(true);
  const muteHintOpacity = useRef(new Animated.Value(0)).current;
  const player = useVideoPlayer(item.videoUrl, (player) => {
    player.loop = true;
    player.muted = true;
  });

  useEffect(() => {
    player.muted = muted;

    muteHintOpacity.stopAnimation();
    Animated.sequence([
      Animated.timing(muteHintOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(muteHintOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [muted, player, muteHintOpacity]);

  useEffect(() => {
    if (isFocused) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [isFocused, player]);

  if (!item.videoUrl) {
    return (
      <View style={[styles.item, { height }]}>
        <ThemedText style={styles.preparingGlyph}>🎬</ThemedText>
        <ThemedText style={styles.preparingText}>준비 중이에요</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.item, { height }]}>
      <VideoView player={player} style={styles.video} nativeControls={false} contentFit="cover" />

      <Pressable style={StyleSheet.absoluteFill} onPress={() => setMuted((current) => !current)} />

      <Animated.View style={[styles.muteBadge, { opacity: muteHintOpacity }]} pointerEvents="none">
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={16} color="#ffffff" />
      </Animated.View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.55, 1]}
        style={styles.scrim}
        pointerEvents="none"
      />

      <View style={[styles.overlay, { paddingBottom: Spacing.five + insets.bottom }]} pointerEvents="box-none">
        <View style={styles.info} pointerEvents="none">
          <ThemedText numberOfLines={2} style={styles.title}>
            {item.title}
          </ThemedText>
          <View style={styles.genreTag}>
            <ThemedText style={styles.genreText}>{item.genre}</ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onToggleFavorite}
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressedShrink]}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? ACCENT : '#ffffff'}
            />
          </Pressable>
          <Pressable
            onPress={onContinue}
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, styles.continueButton, pressed && styles.pressedShrink]}>
            <Ionicons name="play" size={22} color="#ffffff" style={styles.playGlyph} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  muteBadge: {
    position: 'absolute',
    top: Spacing.five,
    right: Spacing.three,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.two,
  },
  title: {
    color: '#ffffff',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  genreTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half + 2,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  genreText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  actions: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  // Both action buttons share the same 48x48 circular footprint so the
  // favorite and continue-watching controls line up cleanly as a pair.
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  playGlyph: {
    // Optically centers the play triangle, which otherwise reads left-heavy.
    marginLeft: 3,
  },
  pressedShrink: {
    transform: [{ scale: 0.92 }],
  },
  preparingGlyph: {
    fontSize: 40,
    opacity: 0.6,
  },
  preparingText: {
    color: '#ffffff',
    opacity: 0.7,
  },
});
