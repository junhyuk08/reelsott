# Section "전체보기" Button + New Dramas List Screen — Design

## Goal

Add a "전체보기 >" (see all) link next to each home-screen section's title, aligned on the
same row (title left, link right), that navigates to a full list of that section's content.
"시청 중인 드라마" links to the existing watch-history screen; "새로운 드라마" links to a new
screen showing every drama sorted newest-first in a grid.

## `DramaRow` component change

`src/components/drama-row.tsx` gains one new optional prop: `onSeeAll?: () => void`. It's a
callback (matching the existing `onPressDrama`/`onToggleFavorite` callback style, not an href),
so the parent screen owns navigation decisions — `DramaRow` itself stays router-agnostic.

The section header (currently just the title `ThemedText`) becomes a row:
`flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'`, with the title on
the left and, only when `onSeeAll` is passed, a `Pressable` showing "전체보기 >" on the right —
styled `ThemedText type="small" themeColor="textSecondary"`, reusing the existing small/muted-gray
convention already used elsewhere in this app (e.g. the genre/episode-count line on `DramaCard`),
so no new color or text style is introduced.

Because `onSeeAll` is optional, `recommend.tsx`'s two existing `DramaRow` usages ("인기 급상승",
"새로 나온 작품") are completely unaffected — they simply don't pass it and render no button.

## Home screen wiring

`src/app/(tabs)/index.tsx`: pass `onSeeAll={() => router.push('/watch-history')}` to the "시청
중인 드라마" row (reusing the existing watch-history screen, unchanged), and
`onSeeAll={() => router.push('/new-dramas')}` to the "새로운 드라마" row.

## New screen: `src/app/new-dramas.tsx`

Following this project's existing convention for secondary list screens (`favorites.tsx`,
`watch-history.tsx` — flat top-level files, not nested directories, registered in `_layout.tsx`
with `headerShown: true` + a `title`, so the native stack header supplies the back button and
title automatically — no manual `BackButton`/title JSX needed inside the screen itself).

- No login gate (unlike `favorites`/`watch-history`) — this is the same public drama catalog the
  home screen's grid already shows to logged-out users.
- Data: reuses `useDramas()` (already orders ascending by `created_at`) with no new query —
  `[...dramas].reverse()` gives the full catalog newest-first (no `slice`, since this is the
  "see all" screen, unlike the home section's top-10 preview).
  `useFavorites()` and `useSession()` are reused exactly as the home screen uses them.
- Rendering: a 2-column `FlatList` of `DramaCard`, mirroring the home screen's "모든 드라마 보기"
  grid exactly (`numColumns={2}`, same `columnWrapperStyle`/`contentContainerStyle` shape,
  `isFavorite`/`onToggleFavorite` wiring identical). Tapping a card behaves exactly like the home
  screen's `handlePressDrama`: redirect to `/login` if logged out, else `recordWatchHistory` +
  navigate to `/drama/[id]`.
- Empty state: mirrors `watch-history.tsx`'s pattern exactly — a top-level
  `!loading && dramas.length === 0` check showing a muted message ("아직 등록된 작품이 없어요.")
  instead of the grid, rather than a `FlatList` `ListEmptyComponent`.
- Error state: mirrors the home screen's "작품을 불러오지 못했어요." message.

`src/app/_layout.tsx` registers the route:
```tsx
<Stack.Screen name="new-dramas" options={{ headerShown: true, title: '새로운 드라마' }} />
```

## Files touched

1. `src/components/drama-row.tsx` (add `onSeeAll` prop + header row layout)
2. `src/app/(tabs)/index.tsx` (wire both `onSeeAll` callbacks)
3. `src/app/new-dramas.tsx` (new)
4. `src/app/_layout.tsx` (register the new route)

## Verification

- `npx tsc --noEmit` clean.
- `npx expo start --web`: confirm both section headers show title-left/"전체보기 >"-right on one
  line, tapping "시청 중인 드라마"'s see-all opens the existing watch-history screen, tapping
  "새로운 드라마"'s see-all opens the new screen with every drama newest-first in a 2-column
  grid, and `recommend.tsx`'s two rows are visually unchanged (no see-all button).
