# Section See-All Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "전체보기 >" link to the right of each home-screen section's title (시청 중인
드라마 / 새로운 드라마), navigating to a full list — the existing watch-history screen for the
former, a new grid screen for the latter.

**Architecture:** `DramaRow` gains an optional `onSeeAll` callback prop and a header row layout
(title left, link right). The home screen wires that callback to `router.push` for each of its
two sections. A new screen, `src/app/new-dramas.tsx`, shows every drama newest-first in the same
2-column grid pattern already used elsewhere, registered in `_layout.tsx` like the existing
`favorites`/`watch-history` screens.

**Tech Stack:** Expo Router, React Native. No test runner is configured in this project (no
jest/testing-library in `package.json`) — verification for every task is `npx tsc --noEmit` plus
a manual `npx expo start --web` check, not automated tests.

## Global Constraints

- `onSeeAll` is a callback (`() => void`), not an href — `DramaRow` stays router-agnostic; the
  parent screen owns navigation. It's optional, so `recommend.tsx`'s two existing `DramaRow`
  usages (which don't pass it) render unaffected, with no see-all button.
- The "전체보기 >" text uses `ThemedText type="small" themeColor="textSecondary"` — the same
  small/muted-gray convention already used elsewhere in this app, no new color/style introduced.
- `src/app/new-dramas.tsx` has no login gate — it's the same public drama catalog the home
  screen's grid already shows to logged-out users.
- `new-dramas.tsx`'s data comes from the existing `useDramas()` (already orders ascending by
  `created_at`) via `[...dramas].reverse()` — no new query, no pagination, shows the full catalog
  (not the home section's top-10 preview).
- Tapping a card in `new-dramas.tsx` behaves exactly like the home screen's `handlePressDrama`:
  redirect to `/login` if logged out, else `recordWatchHistory` + navigate to `/drama/[id]`.

---

### Task 1: `DramaRow` see-all button + home screen wiring

**Files:**
- Modify: `src/components/drama-row.tsx`
- Modify: `src/app/(tabs)/index.tsx`

**Interfaces:**
- Produces: `DramaRow`'s prop type gains `onSeeAll?: () => void`, consumed by Task 1's own home-screen wiring (no other task depends on this).

- [ ] **Step 1: Replace the full contents of `src/components/drama-row.tsx`**

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
};

export function DramaRow({ title, data, onPressDrama, favoriteIds, onToggleFavorite, onSeeAll }: DramaRowProps) {
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
        {data.map((drama) => (
          <View key={drama.id} style={styles.cardWrapper}>
            <DramaCard
              drama={drama}
              onPress={() => onPressDrama(drama.id)}
              isFavorite={favoriteIds.has(drama.id)}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(drama.id) : undefined}
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

- [ ] **Step 2: Replace the full contents of `src/app/(tabs)/index.tsx`**

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
                onSeeAll={() => router.push('/watch-history')}
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

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Confirm the see-all wiring and header layout are present**

Run: `grep -n "onSeeAll" src/components/drama-row.tsx "src/app/(tabs)/index.tsx"`
Expected: matches in both files — the prop declaration/usage in `drama-row.tsx`, and two
`onSeeAll={() => router.push(...)}` calls in `index.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/components/drama-row.tsx "src/app/(tabs)/index.tsx"
git commit -m "Add see-all button to home screen sections"
```

---

### Task 2: New dramas list screen

**Files:**
- Create: `src/app/new-dramas.tsx`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `useDramas()`, `useFavorites()`, `useSession()` from their existing hook files (all unchanged signatures). `recordWatchHistory` from `@/lib/watch-history` (unchanged). `DramaCard` from `@/components/drama-card` (unchanged).
- Produces: the route `new-dramas`, navigated to via `router.push('/new-dramas')` (already wired by Task 1).

- [ ] **Step 1: Create `src/app/new-dramas.tsx`**

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

export default function NewDramasScreen() {
  const router = useRouter();
  const { session, isLoggedIn } = useSession();
  const { dramas, loading, error } = useDramas();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const newestFirst = useMemo(() => [...dramas].reverse(), [dramas]);

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
        ) : loading ? null : newestFirst.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            아직 등록된 작품이 없어요.
          </ThemedText>
        ) : (
          <FlatList
            data={newestFirst}
            keyExtractor={(item) => item.id}
            numColumns={2}
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
        <Stack.Screen name="watch-history" options={{ headerShown: true, title: '시청기록' }} />
```

to:

```tsx
        <Stack.Screen name="watch-history" options={{ headerShown: true, title: '시청기록' }} />
        <Stack.Screen name="new-dramas" options={{ headerShown: true, title: '새로운 드라마' }} />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Confirm the route is registered**

Run: `grep -n "new-dramas" src/app/_layout.tsx`
Expected: one match.

- [ ] **Step 5: Commit**

```bash
git add src/app/new-dramas.tsx src/app/_layout.tsx
git commit -m "Add new-dramas list screen"
```

---

### Task 3: Manual runtime verification

**Files:** none (verification only).

- [ ] **Step 1: Start the web dev server**

Run: `npx expo start --web --port 8085` (check for a free port first with `netstat -ano | grep LISTENING` if 8085 is taken).
Expected: `Web Bundled ...` with no errors in the log.

- [ ] **Step 2: Home screen section headers**

Open the home screen. Expected: "시청 중인 드라마" (if present) and "새로운 드라마" each show
their title on the left and a small gray "전체보기 >" on the right, same line.

- [ ] **Step 3: "새로운 드라마" see-all**

Tap "새로운 드라마"'s "전체보기 >". Expected: navigates to a screen titled "새로운 드라마"
(native header, with a back button) showing every drama in a 2-column grid, newest first.

- [ ] **Step 4: "시청 중인 드라마" see-all**

Log in, watch at least one episode so watch history is non-empty, return to home, tap "시청 중인
드라마"'s "전체보기 >". Expected: navigates to the existing 시청기록 (watch-history) screen.

- [ ] **Step 5: recommend.tsx regression check**

Open the "추천" tab. Expected: "인기 급상승" / "새로 나온 작품" section headers show only their
titles — no "전체보기 >" button (unaffected by this change).

- [ ] **Step 6: Stop the dev server**

Stop the background process once verification is complete.
