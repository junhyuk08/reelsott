# Episode Reels Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-video episode player (`src/app/watch/[episodeId].tsx`) with a
TikTok/Reels-style vertical swipe feed (`src/app/watch/[dramaId].tsx`) scoped to one drama's
episodes, with an in-feed paywall overlay for locked episodes and auto-advance to the next
episode when the current one finishes.

**Architecture:** A new `EpisodeReel` component wraps one episode's `expo-video` player or its
paywall overlay; a new feed screen renders these in a vertically-paginated `FlatList` and tracks
which single item is focused (playing) via `onViewableItemsChanged`. The drama detail screen
(`src/app/drama/[id].tsx`) is simplified to navigate into this feed for any tap — locked or
unlocked — instead of running its own inline unlock flow.

**Tech Stack:** Expo Router, React Native `FlatList` (vertical paging), `expo-video`
(`useVideoPlayer`, `VideoView`, the `playToEnd` event), `useEventListener` from the `expo`
package. No test runner is configured in this project (no jest/testing-library in
`package.json`) — verification for every task is `npx tsc --noEmit` plus a manual
`npx expo start --web` check, not automated tests.

## Global Constraints

- Feed scope is a single drama's episodes only — no cross-drama/mixed feed.
- Tapping any episode row in `drama/[id].tsx` that has a `videoUrl` — locked or unlocked —
  navigates to `/watch/[dramaId]` with `{ dramaId, startEpisodeId: episode.id }` params. A
  locked row tapped while logged out still shows `Alert.alert('로그인이 필요합니다.')` and does
  NOT navigate (this exact gate existed before and must be preserved); a locked row tapped while
  logged in navigates into the feed, where the paywall overlay (not an alert) is what the user
  sees and interacts with. An unlocked row with no `videoUrl` stays non-interactive ("준비 중"),
  unchanged from today.
- `watch_history` recording is unchanged — still only fires from the home/recommend grids'
  `handlePressDrama`, never per-episode. Do not add any watch-history call to this feature.
- The unlock cost (30 coins), the `unlock_episode` RPC, and its RLS/SQL are unchanged — reused
  exactly as `drama/[id].tsx` uses them today.
- Only the focused (currently on-screen) episode's video plays; every other episode's player is
  paused. No new dependencies — only `expo-video`, `expo` (`useEventListener`), and React
  Native's own `FlatList` are used.

---

### Task 1: `EpisodeReel` component

**Files:**
- Create: `src/components/episode-reel.tsx`

**Interfaces:**
- Consumes: `Episode` type from `@/hooks/use-episodes` (`{ id: string; episodeNumber: number; videoUrl: string | null }`). `ThemedText` from `@/components/themed-text`. `Spacing` from `@/constants/theme`.
- Produces: `EpisodeReel` — `export function EpisodeReel({ episode, height, isFocused, isLocked, onUnlock, onFinish }: EpisodeReelProps): JSX.Element`, where:
  ```ts
  type UnlockResult = { success: true; coinBalance: number } | { success: false; error: string };
  type EpisodeReelProps = {
    episode: Episode;
    height: number;
    isFocused: boolean;
    isLocked: boolean;
    onUnlock: () => Promise<UnlockResult>;
    onFinish: () => void;
  };
  ```
  Imported from `@/components/episode-reel` by Task 2.

- [ ] **Step 1: Create `src/components/episode-reel.tsx`**

```tsx
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Episode } from '@/hooks/use-episodes';

const EPISODE_COIN_COST = 30;

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
    const result = await onUnlock();
    setUnlocking(false);
    if (!result.success) {
      Alert.alert('잠금 해제 실패', result.error);
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Confirm the `playToEnd` listener and focus-driven play/pause are wired**

Run: `grep -n "playToEnd\|player.play()\|player.pause()" src/components/episode-reel.tsx`
Expected: three matches — the `useEventListener` call, `player.play()`, and `player.pause()`.

- [ ] **Step 4: Commit**

```bash
git add src/components/episode-reel.tsx
git commit -m "Add EpisodeReel component for the swipe feed"
```

---

### Task 2: Feed screen (`src/app/watch/[dramaId].tsx`)

**Files:**
- Create: `src/app/watch/[dramaId].tsx`
- Delete: `src/app/watch/[episodeId].tsx`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `EpisodeReel` from `@/components/episode-reel` (Task 1) — exact props `{ episode, height, isFocused, isLocked, onUnlock, onFinish }`. `useDrama(dramaId)` from `@/hooks/use-dramas` (existing — returns `{ drama, loading, error }` where `drama: { id, title, thumbnailUrl, genre, episodeCount, freeEpisodeCount } | null`). `useEpisodes(dramaId)` from `@/hooks/use-episodes` (existing — returns `{ episodes, unlockedIds, loading, error, unlockEpisode }`, `unlockEpisode(episodeId: string) => Promise<{ success: true; coinBalance: number } | { success: false; error: string }>`). `BackButton` from `@/components/back-button` (existing, takes optional `color` prop).
- Produces: the route `watch/[dramaId]`, navigated to as `router.push({ pathname: '/watch/[dramaId]', params: { dramaId, startEpisodeId } })` — consumed by Task 3.

- [ ] **Step 1: Delete the old single-video player screen**

```bash
git rm src/app/watch/[episodeId].tsx
```

- [ ] **Step 2: Create `src/app/watch/[dramaId].tsx`**

```tsx
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

export default function WatchDramaScreen() {
  const { dramaId, startEpisodeId } = useLocalSearchParams<{ dramaId: string; startEpisodeId?: string }>();
  const { height } = useWindowDimensions();
  const { drama, loading: dramaLoading, error: dramaError } = useDrama(dramaId);
  const { episodes, unlockedIds, loading: episodesLoading, unlockEpisode } = useEpisodes(dramaId);
  const listRef = useRef<FlatList<Episode>>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const initialIndex = useMemo(() => {
    const index = episodes.findIndex((episode) => episode.id === startEpisodeId);
    return index >= 0 ? index : 0;
  }, [episodes, startEpisodeId]);

  useEffect(() => {
    setFocusedIndex(initialIndex);
  }, [initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visible = viewableItems.find((item) => item.isViewable);
    if (visible?.index != null) {
      setFocusedIndex(visible.index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const handleFinish = useCallback(() => {
    setFocusedIndex((current) => {
      const next = current + 1;
      if (next < episodes.length) {
        listRef.current?.scrollToIndex({ index: next });
      }
      return current;
    });
  }, [episodes.length]);

  if (dramaLoading || episodesLoading) return null;

  if (dramaError || !drama) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <BackButton color="#ffffff" />
          <ThemedText style={styles.message}>작품을 불러오지 못했어요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const freeEpisodeCount = drama.freeEpisodeCount;
  const focusedEpisode = episodes[focusedIndex];

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
            isFocused={index === focusedIndex}
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
```

- [ ] **Step 3: Update `src/app/_layout.tsx`'s Stack.Screen registration**

In `src/app/_layout.tsx`, change:

```tsx
        <Stack.Screen name="watch/[episodeId]" />
```

to:

```tsx
        <Stack.Screen name="watch/[dramaId]" />
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Confirm the old route is fully gone and the new one is registered**

Run: `grep -rn "watch/\[episodeId\]" src/`
Expected: no output.

Run: `grep -n "watch/\[dramaId\]" src/app/_layout.tsx`
Expected: one match.

- [ ] **Step 6: Commit**

```bash
git add -A src/app/watch src/app/_layout.tsx
git commit -m "Replace single-video player with episode swipe feed screen"
```

---

### Task 3: Simplify the drama detail screen's episode taps

**Files:**
- Modify: `src/app/drama/[id].tsx`

**Interfaces:**
- Consumes: the `/watch/[dramaId]` route (Task 2) — navigated to via `router.push({ pathname: '/watch/[dramaId]', params: { dramaId: id, startEpisodeId: episode.id } })`.

- [ ] **Step 1: Replace the full contents of `src/app/drama/[id].tsx`**

```tsx
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const { episodes, unlockedIds, loading: episodesLoading } = useEpisodes(id);

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

    router.push({
      pathname: '/watch/[dramaId]',
      params: { dramaId: id, startEpisodeId: episode.id },
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
```

This is the complete file — replace `src/app/drama/[id].tsx` in full with the above.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Confirm the old unlock-on-list-screen logic is gone**

Run: `grep -n "handlePressLocked\|unlockingId\|unlockEpisode" src/app/drama/\[id\].tsx`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/drama/\[id\].tsx
git commit -m "Route episode taps to the swipe feed instead of inline unlock"
```

---

### Task 4: Manual runtime verification

**Files:** none (verification only).

- [ ] **Step 1: Start the web dev server**

Run: `npx expo start --web --port 8085` (check for a free port first with `netstat -ano | grep LISTENING` if 8085 is taken).
Expected: `Web Bundled ...` with no errors in the log.

- [ ] **Step 2: Free episode playback**

Open a drama detail page and tap a free (unlocked) episode. Expected: the feed opens positioned at that episode, the video plays automatically, and the back button + title overlay ("<title> N화") are visible on top.

- [ ] **Step 3: Swipe navigation**

Swipe up/down between episodes. Expected: paging snaps one episode per swipe; the previously-focused episode's video pauses; the newly-focused one plays; the title overlay updates to match.

- [ ] **Step 4: Locked episode paywall**

Swipe to (or tap directly from the list) a locked episode. Expected: the feed shows the paywall overlay ("🔒 30코인으로 잠금 해제") instead of a video; tapping it deducts coins via the existing RPC and, on success, the same item switches to playing the video in place.

- [ ] **Step 5: Logged-out lock gate**

Log out, then tap a locked episode from the drama detail list. Expected: an alert "로그인이 필요합니다." appears and the feed does NOT open (unchanged from prior behavior).

- [ ] **Step 6: Auto-advance**

Let a short episode play to the end without interacting. Expected: the feed automatically scrolls to the next episode.

- [ ] **Step 7: Stop the dev server**

Stop the background process once verification is complete.
