# Home Screen Sectioned Layout — Design

## Goal

Rebuild the home screen (`src/app/(tabs)/index.tsx`) from a single 2-column grid into a
vertically-scrolling stack of sections, each with a title and (for the first two) a
horizontally-scrolling row of `DramaCard`s, Netflix/OTT-style:

1. **시청 중인 드라마** — dramas the logged-in user most recently watched, from
   `watch_history`. Hidden entirely when logged out or when there's no history.
2. **새로운 드라마** — the 10 most recently created dramas (`dramas.created_at desc`).
3. **모든 드라마 보기** — the existing full 2-column grid, unchanged in behavior, moved to
   the bottom of the page.

## Search behavior

The existing search box in `HomeHeader` now filters **only** the "모든 드라마 보기" grid
section. Sections 1 and 2 are fixed curated shortcuts and are not affected by the search
query, regardless of what's typed.

## Component/hook changes

### `src/components/drama-row.tsx` (new)

Extracted verbatim (props and rendering) from the local `DramaRow` component currently
defined inside `recommend.tsx`: a `ThemedView` section with a title (`ThemedText
type="subtitle"`) and a horizontal `ScrollView` of `DramaCard`s (`showsHorizontalScrollIndicator={false}`,
fixed card width 130). `recommend.tsx` is updated to import this shared component instead
of defining it locally; its local copy and section-specific styles are removed.

### `src/hooks/use-watch-history.ts` (new)

Extracts the inline Supabase query currently living in `watch-history.tsx` into a
`useWatchHistory(limit?: number)` hook, mirroring the shape of `useDramas()`:

- Returns `{ dramas, loading, error }`.
- If there's no session, returns `{ dramas: [], loading: false, error: null }` immediately
  without querying (same pattern as `useFavorites`).
- Otherwise queries `watch_history` joined to `dramas` (same column selection as today),
  ordered by `watched_at desc`, with `.limit(limit)` applied when `limit` is passed.
- RLS already restricts rows to the caller's own `user_id` (`auth.uid() = user_id`), so no
  explicit `user_id` filter is needed in the query, consistent with the existing code.

`src/app/watch-history.tsx` is refactored to call this hook (no limit — full history) instead
of duplicating the query inline. Its own rendering/behavior (2-column grid, redirect-if-logged-out,
empty message) is unchanged.

### "새로운 드라마" data

No new query. `useDramas()` already orders ascending by `created_at`, so the newest 10 are
`dramas.slice(-10).reverse()`. The `Drama` type is not changed (no `createdAt` field needed).

## Home screen (`index.tsx`) structure

```
HomeHeader (query only affects the grid section below)
ScrollView
  ├─ [isLoggedIn && watchHistoryDramas.length > 0]
  │     <DramaRow title="시청 중인 드라마" data={watchHistoryDramas} .../>
  ├─ [newDramas.length > 0]
  │     <DramaRow title="새로운 드라마" data={newDramas} .../>
  └─ <ThemedText>모든 드라마 보기</ThemedText>
     <FlatList ... numColumns={2} scrollEnabled={false} data={filteredDramas} .../>
```

The grid `FlatList` keeps its existing `columnWrapperStyle`/`contentContainerStyle` and is
only made non-scrolling (`scrollEnabled={false}`) so it can live inside the page's outer
`ScrollView` without a nested-VirtualizedList warning. This is the "reuse over
rewrite" option (vs. a unified `SectionList` or manual grid chunking) — appropriate given the
current dataset size (10 seed dramas); revisit if the catalog grows into the hundreds.

All three sections reuse the same `handlePressDrama` (login redirect + `recordWatchHistory`
+ navigate to `/drama/[id]`) and the same `favoriteIds`/`onToggleFavorite` wiring already used
by the current grid.

## Loading / error / empty handling

- **시청 중인 드라마**: hidden (not rendered) while loading, on error, or when the result is
  empty. No spinner or error message for this section — it fails/loads closed and silently.
- **새로운 드라마**: hidden while `dramas` is loading or empty (mirrors current top-level
  `loading ? null : ...` behavior of the page).
- **모든 드라마 보기**: unchanged from today — error message on `useDramas` error, "검색
  결과가 없어요" when the search filter yields zero rows.

## Files touched

1. `src/components/drama-row.tsx` (new)
2. `src/hooks/use-watch-history.ts` (new)
3. `src/app/(tabs)/recommend.tsx` (use shared `DramaRow`)
4. `src/app/watch-history.tsx` (use `useWatchHistory`)
5. `src/app/(tabs)/index.tsx` (sectioned layout)

## Verification

- `npx tsc --noEmit` clean.
- `npx expo start --web`: confirm section visibility toggles correctly logged-out vs.
  logged-in-with-history vs. logged-in-without-history; confirm horizontal scroll works;
  confirm search only narrows the bottom grid.
