# Real-Time Top 10 + View Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add view-count tracking (incrementing on every drama detail-page visit via an
anon-callable RPC), a "실시간 Top 10" home-screen section ranked by view count with rank badges
and a see-all screen, and fix the drama detail screen's back button (present in code, but hard to
see against its background).

**Architecture:** A new SQL RPC (`increment_view_count`) does the atomic counter bump; a thin
client helper calls it fire-and-forget from the drama detail screen. `DramaCard` gains an optional
rank-badge prop, `DramaRow` gains an optional flag to auto-number its items, and both the home
screen and a new `top-dramas.tsx` screen sort the already-loaded drama list by view count to
populate them. `BackButton` gains an optional high-contrast backdrop mode, opted into only by the
one screen that needs it.

**Tech Stack:** Expo Router, React Native, Supabase JS client + SQL migrations. No test runner is
configured in this project (no jest/testing-library in `package.json`) — verification for every
task is `npx tsc --noEmit` plus a manual `npx expo start --web` check, not automated tests.

## Global Constraints

- `dramas.view_count` already exists (`bigint not null default 0`) — do not add a column
  migration for it; only the RPC migration is needed.
- `increment_view_count` has no `auth.uid()` check and is granted to both `anon` and
  `authenticated` — viewing a drama's detail page doesn't require login anywhere else in this
  app, so view counting must not either.
- The home screen's section order becomes: 시청 중인 드라마 → **실시간 Top 10** → 새로운 드라마
  → 모든 드라마 보기.
- Both `DramaCard`'s `rank` prop and `DramaRow`'s `showRank` prop are optional — every other
  `DramaRow`/`DramaCard` usage in the app (recommend.tsx, watch-history.tsx, new-dramas.tsx, the
  home grid) is unaffected and must not gain rank badges.
- `BackButton`'s `withBackdrop` prop is optional, default `false` — `login.tsx`, `signup.tsx`, and
  `watch/[dramaId].tsx`'s existing `<BackButton />`/`<BackButton color="#ffffff" />` usages must
  render unchanged. Only `drama/[id].tsx`'s two usages change to `<BackButton withBackdrop />`.
- `top-dramas.tsx` has no login gate (same public catalog as `new-dramas.tsx`) and its Top 10
  home-screen row's favorite-toggle is gated by `isLoggedIn` (matching "새로운 드라마", not
  "시청 중인 드라마" — the Top 10 row can render for logged-out users, so favoriting must be
  guarded).

---

### Task 1: View count RPC, client helper, and back-button visibility fix

**Files:**
- Create: `supabase/migrations/20260729090000_increment_view_count.sql`
- Create: `src/lib/dramas.ts`
- Modify: `src/components/back-button.tsx`
- Modify: `src/app/drama/[id].tsx`

**Interfaces:**
- Produces: `incrementViewCount(dramaId: string): Promise<void>`, exported from `@/lib/dramas`, consumed only by this task's own change to `drama/[id].tsx` (no other task depends on it).
- Produces: `BackButton`'s prop type gains `withBackdrop?: boolean`, consumed only by this task's own change to `drama/[id].tsx`.

- [ ] **Step 1: Create the migration `supabase/migrations/20260729090000_increment_view_count.sql`**

```sql
create or replace function public.increment_view_count(target_drama_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dramas set view_count = view_count + 1 where id = target_drama_id;
end;
$$;

grant execute on function public.increment_view_count(uuid) to anon, authenticated;
```

- [ ] **Step 2: Create `src/lib/dramas.ts`**

```ts
import { supabase } from '@/lib/supabase';

export async function incrementViewCount(dramaId: string) {
  await supabase.rpc('increment_view_count', { target_drama_id: dramaId });
}
```

- [ ] **Step 3: Replace the full contents of `src/components/back-button.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type BackButtonProps = {
  color?: string;
  withBackdrop?: boolean;
};

export function BackButton({ color, withBackdrop }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <Pressable onPress={handleBack} style={[styles.button, withBackdrop && styles.buttonBackdrop]} hitSlop={8}>
      <ThemedText style={[styles.glyph, withBackdrop ? styles.glyphOnBackdrop : color ? { color } : undefined]}>
        ‹
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    marginLeft: Spacing.two,
    marginTop: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBackdrop: {
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  glyph: {
    fontSize: 26,
    fontWeight: '600',
    marginTop: -2,
  },
  glyphOnBackdrop: {
    color: '#ffffff',
  },
});
```

- [ ] **Step 4: Replace the full contents of `src/app/drama/[id].tsx`**

```tsx
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
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

const ACCENT = '#FF3B5C';

export default function DramaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { isLoggedIn } = useSession();
  const { drama, loading: dramaLoading, error: dramaError } = useDrama(id);
  const { episodes, unlockedIds, loading: episodesLoading } = useEpisodes(id);

  useEffect(() => {
    incrementViewCount(id);
  }, [id]);

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

    router.push({
      pathname: '/watch/[dramaId]',
      params: { dramaId: id, startEpisodeId: episode.id },
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

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Confirm the new pieces are wired**

Run: `grep -n "incrementViewCount" src/app/drama/\[id\].tsx src/lib/dramas.ts`
Expected: matches in both files.

Run: `grep -n "withBackdrop" src/components/back-button.tsx "src/app/drama/[id].tsx"`
Expected: matches in both files (prop declaration/usage in `back-button.tsx`, two `<BackButton withBackdrop />` calls in `drama/[id].tsx`).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260729090000_increment_view_count.sql src/lib/dramas.ts src/components/back-button.tsx "src/app/drama/[id].tsx"
git commit -m "Add view count RPC and fix drama detail back-button visibility"
```

---

### Task 2: Rank badge support in `DramaCard` and `DramaRow`

**Files:**
- Modify: `src/components/drama-card.tsx`
- Modify: `src/components/drama-row.tsx`

**Interfaces:**
- Produces: `DramaCard`'s prop type gains `rank?: number` (renders a badge when present). `DramaRow`'s prop type gains `showRank?: boolean` (passes `rank={index + 1}` to each item when true). Both consumed by Task 3 (home screen) and Task 4 (new screen).

- [ ] **Step 1: Replace the full contents of `src/components/drama-card.tsx`**

```tsx
import { Image } from 'expo-image';
import { Pressable, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type Drama = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  genre: string;
  episodeCount: number;
  isNew: boolean;
  viewCount: number;
};

type DramaCardProps = {
  drama: Drama;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  rank?: number;
};

export function DramaCard({ drama, onPress, style, isFavorite, onToggleFavorite, rank }: DramaCardProps) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
      <ThemedView style={styles.thumbnailWrapper}>
        <ThemedView type="backgroundElement" style={styles.thumbnail} />
        {drama.thumbnailUrl && (
          <Image
            source={{ uri: drama.thumbnailUrl }}
            style={[styles.thumbnail, styles.thumbnailOverlay]}
            contentFit="cover"
            transition={300}
          />
        )}
        {rank !== undefined && (
          <View style={styles.rankBadge}>
            <ThemedText style={styles.rankText}>{rank}</ThemedText>
          </View>
        )}
        {onToggleFavorite && (
          <Pressable onPress={onToggleFavorite} style={styles.favoriteButton} hitSlop={8}>
            <ThemedText style={styles.favoriteGlyph}>{isFavorite ? '♥' : '♡'}</ThemedText>
          </Pressable>
        )}
      </ThemedView>
      <ThemedText type="smallBold" style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {drama.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
        {drama.genre} · {drama.episodeCount}화
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: Spacing.two,
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  rankBadge: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Spacing.one,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteGlyph: {
    color: '#FF3B5C',
    fontSize: 16,
  },
  title: {
    marginTop: Spacing.half + 4,
  },
  meta: {
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Replace the full contents of `src/components/drama-row.tsx`**

```tsx
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Drama } from '@/components/drama-card';
import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const CARD_WIDTH = 140;

type DramaRowProps = {
  title: string;
  data: Drama[];
  onPressDrama: (dramaId: string) => void;
  favoriteIds: Set<string>;
  onToggleFavorite?: (dramaId: string) => void;
  onSeeAll?: () => void;
  showRank?: boolean;
};

export function DramaRow({
  title,
  data,
  onPressDrama,
  favoriteIds,
  onToggleFavorite,
  onSeeAll,
  showRank,
}: DramaRowProps) {
  return (
    <ThemedView style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              전체보기 &gt;
            </ThemedText>
          </Pressable>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
        {data.map((drama, index) => (
          <View key={drama.id} style={styles.cardWrapper}>
            <DramaCard
              drama={drama}
              onPress={() => onPressDrama(drama.id)}
              isFavorite={favoriteIds.has(drama.id)}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(drama.id) : undefined}
              rank={showRank ? index + 1 : undefined}
            />
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.five,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  rowContent: {
    paddingHorizontal: Spacing.three,
    gap: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
});
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Confirm the rank props exist and other call sites are unaffected**

Run: `grep -n "rank" src/components/drama-card.tsx src/components/drama-row.tsx`
Expected: several matches in both files (the new prop, badge render, and the `rank={showRank ? index + 1 : undefined}` pass-through).

Run: `grep -c "showRank" "src/app/(tabs)/recommend.tsx" src/app/watch-history.tsx src/app/new-dramas.tsx`
Expected: `0` for all three (none of them pass `showRank` — they're untouched by this task).

- [ ] **Step 5: Commit**

```bash
git add src/components/drama-card.tsx src/components/drama-row.tsx
git commit -m "Add optional rank badge to DramaCard and DramaRow"
```

---

### Task 3: Home screen "실시간 Top 10" section

**Files:**
- Modify: `src/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `DramaRow`'s `showRank`/`onSeeAll` props (Task 2 and the earlier see-all feature, both already landed) — no new interface produced.

- [ ] **Step 1: Replace the full contents of `src/app/(tabs)/index.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaCard } from '@/components/drama-card';
import { DramaRow } from '@/components/drama-row';
import { HomeHeader } from '@/components/home-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDramas } from '@/hooks/use-dramas';
import { useFavorites } from '@/hooks/use-favorites';
import { useSession } from '@/hooks/use-session';
import { useWatchHistory } from '@/hooks/use-watch-history';
import { recordWatchHistory } from '@/lib/watch-history';

export default function HomeScreen() {
  const router = useRouter();
  const { session, isLoggedIn } = useSession();
  const { dramas, loading, error } = useDramas();
  const { dramas: recentlyWatched } = useWatchHistory(10);
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [query, setQuery] = useState('');

  const filteredDramas = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return dramas;
    return dramas.filter((drama) => drama.title.includes(trimmed));
  }, [dramas, query]);

  const newDramas = useMemo(() => dramas.slice(-10).reverse(), [dramas]);

  const topDramas = useMemo(() => [...dramas].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10), [dramas]);

  function handlePressDrama(dramaId: string) {
    if (!isLoggedIn || !session) {
      router.push('/login');
      return;
    }
    recordWatchHistory(session.user.id, dramaId);
    router.push({ pathname: '/drama/[id]', params: { id: dramaId } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <HomeHeader query={query} onQueryChange={setQuery} />
        {error ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            작품을 불러오지 못했어요.
          </ThemedText>
        ) : loading ? null : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {isLoggedIn && recentlyWatched.length > 0 && (
              <DramaRow
                title="시청 중인 드라마"
                data={recentlyWatched}
                onPressDrama={handlePressDrama}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onSeeAll={() => router.push('/watch-history')}
              />
            )}
            {topDramas.length > 0 && (
              <DramaRow
                title="실시간 Top 10"
                data={topDramas}
                onPressDrama={handlePressDrama}
                favoriteIds={favoriteIds}
                onToggleFavorite={isLoggedIn ? toggleFavorite : undefined}
                onSeeAll={() => router.push('/top-dramas')}
                showRank
              />
            )}
            {newDramas.length > 0 && (
              <DramaRow
                title="새로운 드라마"
                data={newDramas}
                onPressDrama={handlePressDrama}
                favoriteIds={favoriteIds}
                onToggleFavorite={isLoggedIn ? toggleFavorite : undefined}
                onSeeAll={() => router.push('/new-dramas')}
              />
            )}
            <ThemedText type="subtitle" style={styles.gridTitle}>
              모든 드라마 보기
            </ThemedText>
            <FlatList
              data={filteredDramas}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              columnWrapperStyle={styles.row}
              renderItem={({ item }) => (
                <DramaCard
                  drama={item}
                  onPress={() => handlePressDrama(item.id)}
                  isFavorite={favoriteIds.has(item.id)}
                  onToggleFavorite={isLoggedIn ? () => toggleFavorite(item.id) : undefined}
                />
              )}
              ListEmptyComponent={
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  검색 결과가 없어요
                </ThemedText>
              }
            />
          </ScrollView>
        )}
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
  scrollContent: {
    paddingBottom: Spacing.five,
  },
  gridTitle: {
    fontSize: 18,
    lineHeight: 24,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.five,
    marginBottom: Spacing.three,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  message: {
    padding: Spacing.three,
    textAlign: 'center',
  },
  row: {
    gap: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Confirm the section ordering and wiring**

Run: `grep -n "시청 중인 드라마\|실시간 Top 10\|새로운 드라마\|모든 드라마 보기" "src/app/(tabs)/index.tsx"`
Expected: four matches, in that exact order top-to-bottom.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(tabs)/index.tsx"
git commit -m "Add real-time Top 10 section to home screen"
```

---

### Task 4: Top dramas see-all screen

**Files:**
- Create: `src/app/top-dramas.tsx`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `DramaCard`'s `rank` prop (Task 2, already landed). `useDramas()`, `useFavorites()`, `useSession()`, `recordWatchHistory` — all existing, unchanged.
- Produces: the route `top-dramas`, navigated to via `router.push('/top-dramas')` (already wired by Task 3).

- [ ] **Step 1: Create `src/app/top-dramas.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDramas } from '@/hooks/use-dramas';
import { useFavorites } from '@/hooks/use-favorites';
import { useSession } from '@/hooks/use-session';
import { recordWatchHistory } from '@/lib/watch-history';

export default function TopDramasScreen() {
  const router = useRouter();
  const { session, isLoggedIn } = useSession();
  const { dramas, loading, error } = useDramas();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const rankedDramas = useMemo(() => [...dramas].sort((a, b) => b.viewCount - a.viewCount), [dramas]);

  function handlePressDrama(dramaId: string) {
    if (!isLoggedIn || !session) {
      router.push('/login');
      return;
    }
    recordWatchHistory(session.user.id, dramaId);
    router.push({ pathname: '/drama/[id]', params: { id: dramaId } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {error ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            작품을 불러오지 못했어요.
          </ThemedText>
        ) : loading ? null : rankedDramas.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            아직 등록된 작품이 없어요.
          </ThemedText>
        ) : (
          <FlatList
            data={rankedDramas}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.row}
            renderItem={({ item, index }) => (
              <DramaCard
                drama={item}
                onPress={() => handlePressDrama(item.id)}
                isFavorite={favoriteIds.has(item.id)}
                onToggleFavorite={isLoggedIn ? () => toggleFavorite(item.id) : undefined}
                rank={index + 1}
              />
            )}
          />
        )}
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
  listContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    gap: Spacing.three,
  },
  message: {
    padding: Spacing.four,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Register the route in `src/app/_layout.tsx`**

In `src/app/_layout.tsx`, change:

```tsx
        <Stack.Screen name="new-dramas" options={{ headerShown: true, title: '새로운 드라마' }} />
```

to:

```tsx
        <Stack.Screen name="new-dramas" options={{ headerShown: true, title: '새로운 드라마' }} />
        <Stack.Screen name="top-dramas" options={{ headerShown: true, title: '실시간 Top 10' }} />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Confirm the route is registered**

Run: `grep -n "top-dramas" src/app/_layout.tsx`
Expected: one match.

- [ ] **Step 5: Commit**

```bash
git add src/app/top-dramas.tsx src/app/_layout.tsx
git commit -m "Add top-dramas see-all screen"
```

---

### Task 5: Manual runtime verification

**Files:** none (verification only).

- [ ] **Step 1: Start the web dev server**

Run: `npx expo start --web --port 8085` (check for a free port first with `netstat -ano | grep LISTENING` if 8085 is taken).
Expected: `Web Bundled ...` with no errors in the log.

- [ ] **Step 2: Home screen section order and rank badges**

Open the home screen. Expected: sections appear in order 시청 중인 드라마 → 실시간 Top 10 →
새로운 드라마 → 모든 드라마 보기; the Top 10 row's cards each show a bold numbered badge (1–10)
in the top-left corner of the thumbnail.

- [ ] **Step 3: Top 10 see-all**

Tap "실시간 Top 10"'s "전체보기 >". Expected: opens a screen titled "실시간 Top 10" with every
drama in a 2-column grid, ranked/numbered, sorted by view count descending.

- [ ] **Step 4: View count increments**

Note a drama's `view_count` (e.g. via a direct Supabase query or by checking its rank position),
open its detail page, go back, and confirm the count increased by 1 (re-check via query, or
re-open the Top 10 list and see if its position moved appropriately for a low-view drama).

- [ ] **Step 5: Back button visibility**

Open any drama's detail page. Expected: the back button in the top-left is now clearly visible
(dark circular backdrop, white chevron) regardless of light/dark theme, and still navigates back
correctly when tapped.

- [ ] **Step 6: Unaffected screens**

Open `login`, `signup`, and a drama's episode feed (`watch/[dramaId]`). Expected: their back
buttons render exactly as before (no backdrop change). Open `recommend`, `watch-history`, and
`new-dramas`. Expected: no rank badges appear on any of their cards.

- [ ] **Step 7: Stop the dev server**

Stop the background process once verification is complete.
