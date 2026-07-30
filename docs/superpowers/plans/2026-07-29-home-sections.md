# Home Screen Sectioned Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the home screen (`src/app/(tabs)/index.tsx`) into a vertically-scrolling
stack of sections — "시청 중인 드라마" (recent watch history, hidden if logged out or empty),
"새로운 드라마" (10 newest dramas), and "모든 드라마 보기" (the existing full grid, unchanged,
moved to the bottom) — with the first two rendered as horizontally-scrolling `DramaCard` rows.

**Architecture:** Extract the horizontal-row rendering that already exists (duplicated) inside
`recommend.tsx` into a shared `DramaRow` component, extract the inline watch-history query from
`watch-history.tsx` into a `useWatchHistory` hook, then recompose `index.tsx` around both plus
the existing `useDramas` data (newest-10 derived via array slicing, no new query needed).

**Tech Stack:** Expo Router (`src/app`), React Native, Supabase JS client, TypeScript. No test
runner is configured in this project (no jest/testing-library in `package.json`) — verification
for every task in this plan is `npx tsc --noEmit` plus a manual `npx expo start --web` check,
not automated tests. Do not add a test framework as part of this plan; it is out of scope.

## Global Constraints

- Search box in `HomeHeader` filters only the "모든 드라마 보기" grid section — sections 1 and
  2 are unaffected by the search query.
- "시청 중인 드라마" is hidden (not rendered) whenever: logged out, still loading, query
  errored, or the result is empty. No spinner or error text for this section.
- "새로운 드라마" is hidden whenever `dramas` is loading or empty.
- "새로운 드라마" data comes from `dramas.slice(-10).reverse()` on the array already returned
  by `useDramas()` (which orders ascending by `created_at`) — no new query, no `createdAt`
  field added to the `Drama` type.
- The grid `FlatList` in "모든 드라마 보기" keeps its current props/behavior and is only given
  `scrollEnabled={false}` so it can sit inside the page's outer `ScrollView`.
- All three sections reuse the existing `handlePressDrama` (redirect to `/login` if logged out,
  else `recordWatchHistory` + navigate to `/drama/[id]`) and the same `favoriteIds`/
  `onToggleFavorite` wiring already used by the current grid.

---

### Task 1: Extract shared `DramaRow` component

**Files:**
- Create: `src/components/drama-row.tsx`
- Modify: `src/app/(tabs)/recommend.tsx`

**Interfaces:**
- Produces: `DramaRow` — `export function DramaRow({ title, data, onPressDrama, favoriteIds, onToggleFavorite }: { title: string; data: Drama[]; onPressDrama: (dramaId: string) => void; favoriteIds: Set<string>; onToggleFavorite?: (dramaId: string) => void }): JSX.Element`, imported from `@/components/drama-row`.

- [ ] **Step 1: Create `src/components/drama-row.tsx`**

```tsx
import { ScrollView, StyleSheet } from 'react-native';

import type { Drama } from '@/components/drama-card';
import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type DramaRowProps = {
  title: string;
  data: Drama[];
  onPressDrama: (dramaId: string) => void;
  favoriteIds: Set<string>;
  onToggleFavorite?: (dramaId: string) => void;
};

export function DramaRow({ title, data, onPressDrama, favoriteIds, onToggleFavorite }: DramaRowProps) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
        {data.map((drama) => (
          <DramaCard
            key={drama.id}
            drama={drama}
            onPress={() => onPressDrama(drama.id)}
            style={styles.rowCard}
            isFavorite={favoriteIds.has(drama.id)}
            onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(drama.id) : undefined}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.five,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  rowContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  rowCard: {
    width: 130,
    flex: 0,
  },
});
```

- [ ] **Step 2: Replace `recommend.tsx` with the version that imports the shared component**

Replace the full contents of `src/app/(tabs)/recommend.tsx` with:

```tsx
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaRow } from '@/components/drama-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDramas } from '@/hooks/use-dramas';
import { useFavorites } from '@/hooks/use-favorites';
import { useSession } from '@/hooks/use-session';
import { recordWatchHistory } from '@/lib/watch-history';

export default function RecommendScreen() {
  const router = useRouter();
  const { session, isLoggedIn } = useSession();
  const { dramas, loading, error } = useDramas();
  const { favoriteIds, toggleFavorite } = useFavorites();

  function handlePressDrama(dramaId: string) {
    if (!isLoggedIn || !session) {
      router.push('/login');
      return;
    }
    recordWatchHistory(session.user.id, dramaId);
    router.push({ pathname: '/drama/[id]', params: { id: dramaId } });
  }

  const trending = [...dramas].sort((a, b) => b.viewCount - a.viewCount).slice(0, 4);
  const newDramas = dramas.filter((drama) => drama.isNew);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.pageTitle}>
            추천
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.pageSubtitle}>
            취향에 맞춰 골라본 작품들이에요
          </ThemedText>

          {error ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.pageSubtitle}>
              작품을 불러오지 못했어요.
            </ThemedText>
          ) : loading ? null : (
            <>
              <DramaRow
                title="인기 급상승"
                data={trending}
                onPressDrama={handlePressDrama}
                favoriteIds={favoriteIds}
                onToggleFavorite={isLoggedIn ? toggleFavorite : undefined}
              />
              <DramaRow
                title="새로 나온 작품"
                data={newDramas}
                onPressDrama={handlePressDrama}
                favoriteIds={favoriteIds}
                onToggleFavorite={isLoggedIn ? toggleFavorite : undefined}
              />
            </>
          )}
        </ScrollView>
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
    paddingVertical: Spacing.three,
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    paddingHorizontal: Spacing.three,
  },
  pageSubtitle: {
    marginTop: Spacing.half,
    paddingHorizontal: Spacing.three,
  },
});
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Confirm the old local `DramaRow` definition is gone**

Run: `grep -n "function DramaRow" src/app/(tabs)/recommend.tsx`
Expected: no output (the function no longer lives in this file).

- [ ] **Step 5: Commit**

```bash
git add src/components/drama-row.tsx src/app/(tabs)/recommend.tsx
git commit -m "Extract shared DramaRow component from recommend screen"
```

---

### Task 2: Extract `useWatchHistory` hook

**Files:**
- Create: `src/hooks/use-watch-history.ts`
- Modify: `src/app/watch-history.tsx`

**Interfaces:**
- Consumes: `useSession()` from `@/hooks/use-session` (existing) — `{ session: Session | null, isLoggedIn: boolean, loading: boolean }`. `Drama` type from `@/components/drama-card`.
- Produces: `useWatchHistory(limit?: number): { dramas: Drama[]; loading: boolean; error: string | null }`, imported from `@/hooks/use-watch-history`.

- [ ] **Step 1: Create `src/hooks/use-watch-history.ts`**

```ts
import { useEffect, useState } from 'react';

import type { Drama } from '@/components/drama-card';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase';

type WatchHistoryRow = {
  dramas: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    genre: string;
    episode_count: number;
    is_new: boolean;
    view_count: number;
  } | null;
};

export function useWatchHistory(limit?: number) {
  const { session } = useSession();
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setDramas([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      let query = supabase
        .from('watch_history')
        .select('dramas(id, title, thumbnail_url, genre, episode_count, is_new, view_count)')
        .order('watched_at', { ascending: false });

      if (limit !== undefined) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setDramas(
          ((data ?? []) as unknown as WatchHistoryRow[])
            .map((row) => row.dramas)
            .filter((d): d is NonNullable<WatchHistoryRow['dramas']> => d !== null)
            .map((d) => ({
              id: d.id,
              title: d.title,
              thumbnailUrl: d.thumbnail_url,
              genre: d.genre,
              episodeCount: d.episode_count,
              isNew: d.is_new,
              viewCount: d.view_count,
            }))
        );
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session, limit]);

  return { dramas, loading, error };
}
```

- [ ] **Step 2: Replace `src/app/watch-history.tsx` with the version that uses the hook**

```tsx
import { Redirect } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/hooks/use-favorites';
import { useSession } from '@/hooks/use-session';
import { useWatchHistory } from '@/hooks/use-watch-history';

export default function WatchHistoryScreen() {
  const { isLoggedIn, loading: sessionLoading } = useSession();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { dramas, loading } = useWatchHistory();

  if (sessionLoading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {!loading && dramas.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            아직 시청한 작품이 없어요.
          </ThemedText>
        ) : (
          <FlatList
            data={dramas}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <DramaCard
                drama={item}
                onPress={() => {}}
                isFavorite={favoriteIds.has(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
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

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Confirm the inline query is gone from the page**

Run: `grep -n "from('watch_history')" src/app/watch-history.tsx`
Expected: no output (the query now lives only in `use-watch-history.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-watch-history.ts src/app/watch-history.tsx
git commit -m "Extract useWatchHistory hook from watch-history screen"
```

---

### Task 3: Recompose the home screen into sections

**Files:**
- Modify: `src/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `DramaRow` from `@/components/drama-row` (Task 1). `useWatchHistory(limit?: number)` from `@/hooks/use-watch-history` (Task 2). `useDramas()`, `useFavorites()`, `useSession()`, `recordWatchHistory`, `HomeHeader` — all existing, unchanged signatures.

- [ ] **Step 1: Replace `src/app/(tabs)/index.tsx` with the sectioned version**

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
              />
            )}
            {newDramas.length > 0 && (
              <DramaRow
                title="새로운 드라마"
                data={newDramas}
                onPressDrama={handlePressDrama}
                favoriteIds={favoriteIds}
                onToggleFavorite={isLoggedIn ? toggleFavorite : undefined}
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

- [ ] **Step 3: Confirm the grid FlatList is non-scrolling and nested correctly**

Run: `grep -n "scrollEnabled={false}" src/app/(tabs)/index.tsx`
Expected: one match, on the grid `FlatList`.

- [ ] **Step 4: Commit**

```bash
git add src/app/(tabs)/index.tsx
git commit -m "Recompose home screen into watch-history/new/all-dramas sections"
```

---

### Task 4: Manual runtime verification

**Files:** none (verification only).

- [ ] **Step 1: Start the web dev server**

Run: `npx expo start --web --port 8083` (use a free port; check with `netstat -ano | grep LISTENING` first if 8083 is taken).
Expected: `Web Bundled ...` with no errors in the log.

- [ ] **Step 2: Logged-out view**

Open `http://localhost:8083` without logging in. Expected: no "시청 중인 드라마" section; "새로운 드라마" section shows up to 10 cards, horizontally scrollable; "모든 드라마 보기" grid shows all dramas below it.

- [ ] **Step 3: Logged-in, no watch history**

Log in with an account that has never opened a drama detail page. Expected: still no "시청 중인 드라마" section (empty, so hidden).

- [ ] **Step 4: Logged-in, with watch history**

From the logged-in account, open a drama's detail page (this calls `recordWatchHistory`), then return to the home tab. Expected: "시청 중인 드라마" section now appears at the top, showing that drama, horizontally scrollable.

- [ ] **Step 5: Search scoping**

Type a query into the home search box that matches only some drama titles. Expected: "시청 중인 드라마" and "새로운 드라마" rows are unaffected (same cards as before typing); only the "모든 드라마 보기" grid narrows to matching titles (or shows "검색 결과가 없어요" if none match).

- [ ] **Step 6: Recommend screen regression check**

Open the "추천" tab. Expected: renders exactly as before (인기 급상승 / 새로 나온 작품 rows) — confirms the `DramaRow` extraction in Task 1 didn't change its behavior.

- [ ] **Step 7: Stop the dev server**

Stop the background process once verification is complete.
