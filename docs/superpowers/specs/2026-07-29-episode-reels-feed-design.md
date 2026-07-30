# Episode Reels Feed — Design

## Goal

Replace the current single-video episode player with a TikTok/Reels-style vertical
swipe feed, scoped to one drama at a time (inspired by the competitor app EveryReels,
but limited in scope to a single drama's episodes rather than a cross-drama feed).
Tapping any episode row on the drama detail page — locked or unlocked — opens this
feed positioned at that episode; swiping down advances to the next episode in the
same drama.

## Scope

- **In scope:** one drama's episode list rendered as a vertically-paginated video
  feed; auto-play of the focused episode; auto-advance to the next episode when the
  current one finishes; pausing off-screen episodes; an in-feed paywall overlay for
  locked episodes, reusing the existing coin-unlock RPC.
- **Out of scope:** cross-drama feed / mixed recommendations (the EveryReels-style
  "endless feed" is explicitly not being built now — this is a single-drama feed
  only, matching the earlier decision). No changes to `watch_history` recording
  (unchanged — still fires only when a drama card is tapped from the home/recommend
  grids, not per-episode). No changes to the coin-unlock cost, RLS, or the
  `unlock_episode()` RPC itself.

## Navigation change

`src/app/watch/[episodeId].tsx` (currently receives a single `episodeId`, `videoUrl`,
and `title` via route params) is deleted and replaced by `src/app/watch/[dramaId].tsx`,
which receives `dramaId` and `startEpisodeId` (the tapped episode's id — used to
compute the feed's initial scroll position, not to filter what's loaded).
`src/app/_layout.tsx`'s `<Stack.Screen name="watch/[episodeId]" />` is renamed to
`<Stack.Screen name="watch/[dramaId]" />`.

`src/app/drama/[id].tsx` (the episode list) is simplified: tapping **any** row that
has a `videoUrl` — whether locked or unlocked — navigates straight to the feed at
that episode's position:

```
router.push({ pathname: '/watch/[dramaId]', params: { dramaId, startEpisodeId: episode.id } });
```

This is a deliberate behavior unification, confirmed with the user: previously,
tapping a locked row triggered an inline unlock attempt on the list screen itself
(`handlePressLocked`, with `Alert.alert` on failure) before playing. Now, tapping a
locked row opens the feed at that episode, and the feed shows the same paywall
overlay there that swiping into a locked episode shows. The list screen loses its
own unlock logic entirely — `handlePressLocked`, `unlockingId` state, and the
`unlockEpisode` call all move into the feed. The list keeps its `isLocked` check
only to decide row *appearance* (🔒 label with cost vs. ▶ 재생 vs. "준비 중" for rows
with no `videoUrl`, which stay non-interactive as today).

## Feed screen (`src/app/watch/[dramaId].tsx`)

Data: reuses `useDrama(dramaId)` (for `title`, `freeEpisodeCount`) and
`useEpisodes(dramaId)` (for `episodes`, `unlockedIds`, `unlockEpisode`) exactly as
`drama/[id].tsx` does today — no new queries, no schema changes.

Structure:
- A vertical `FlatList` over `episodes` (already ordered by `episode_number`
  ascending from `useEpisodes`), `pagingEnabled`, `showsVerticalScrollIndicator=false`,
  each row exactly one screen tall (`useWindowDimensions().height`), so paging snaps
  one episode per swipe.
- `initialScrollIndex` = the index of the episode whose `id` matches `startEpisodeId`
  (falls back to `0` if not found — e.g. a stale/bad param).
- `onViewableItemsChanged` (with `viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}`)
  tracks which single episode is currently focused (`focusedEpisodeId` state). Only
  the focused item's video plays; every other item's player is paused. No extra
  preloading/windowing beyond `FlatList`'s own virtualization — the dataset (a
  drama's episode count, tens at most) doesn't need it.
- A fixed overlay above the list (not repeated per row): `BackButton` (white, as the
  current player uses) plus the *focused* episode's title text, in the same
  `"${dramaTitle} ${episodeNumber}화"` format the current player shows.
- When the focused episode's video finishes playing, the feed auto-scrolls to the
  next index (`flatListRef.current.scrollToIndex({ index: focusedIndex + 1 })`), the
  auto-advance behavior that gives this feed its "reels" feel. The exact `expo-video`
  API for detecting playback completion (event name / hook) must be confirmed
  against this project's installed `expo-video` version (`~3.0.16`) during
  implementation — by checking the package's own TypeScript types, the same way the
  installed `expo-image` API was checked earlier in this project for the thumbnail
  work — rather than assumed from general expo-video knowledge, since AGENTS.md
  requires verifying behavior against the exact installed version before writing
  code. If no next index exists (last episode), the feed simply stops advancing.
- Loading state: while `useDrama`/`useEpisodes` are loading, render nothing (mirrors
  `drama/[id].tsx`'s existing `if (dramaLoading || episodesLoading) return null;`).
  Error state: mirrors the existing "작품을 불러오지 못했어요." message.

## Episode reel item (`src/components/episode-reel.tsx`, new)

Props: `episode: Episode`, `dramaTitle: string`, `isFocused: boolean`, `isLocked: boolean`,
`onUnlock: () => Promise<{ success: true; coinBalance: number } | { success: false; error: string }>`.

- If `isLocked`: renders a dark full-screen placeholder with a centered unlock
  button ("🔒 30코인으로 잠금 해제"), reusing the exact same cost label and
  success/failure handling `drama/[id].tsx`'s `handlePressLocked` has today
  (disable the button while the unlock call is in flight; `Alert.alert` the
  RPC's error message on failure). On success, the item re-renders as playable
  immediately (no navigation needed — `unlockedIds` updates via the shared
  `useEpisodes` state, same as today).
- If not locked: renders `expo-video`'s `VideoView` bound to a player for
  `episode.videoUrl`. The player only calls `.play()` when `isFocused` is true;
  it's paused (and reasonable to seek back to `0`) when `isFocused` becomes false,
  so re-focusing an already-watched episode restarts it rather than resuming
  mid-playback.

## Files touched

1. `src/app/watch/[dramaId].tsx` (new — replaces `src/app/watch/[episodeId].tsx`, which is deleted)
2. `src/components/episode-reel.tsx` (new)
3. `src/app/drama/[id].tsx` (simplified: remove `handlePressLocked`/`unlockingId`/`unlockEpisode` usage; tapping any playable row navigates to the feed)
4. `src/app/_layout.tsx` (rename the `Stack.Screen` for the watch route)

## Verification

- `npx tsc --noEmit` clean.
- `npx expo start --web`: confirm feed opens at the tapped episode, swiping down
  advances episodes, off-screen episodes are paused, a locked episode shows the
  paywall overlay and unlocking it in-place lets playback continue, and finishing
  an episode auto-advances to the next one.
