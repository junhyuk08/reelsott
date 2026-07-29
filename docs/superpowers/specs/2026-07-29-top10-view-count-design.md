# Real-Time Top 10 + View Count — Design

## Goal

Add view-count tracking (incrementing on every drama detail-page visit) and a "실시간 Top 10"
home-screen section ranked by view count, with a see-all screen. Also fix the drama detail
screen's back button, which exists in code but is hard to see against its background.

## View count

`dramas.view_count` already exists (`bigint not null default 0`, from the original
`create_dramas.sql` migration) — no column migration needed. The only new migration adds an
RPC:

`supabase/migrations/20260729090000_increment_view_count.sql`:
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

Unlike `unlock_episode`/`check_attendance`, this has no `auth.uid()` check and is granted to
`anon` too — browsing a drama's detail page doesn't require login anywhere else in this app, so
view counting shouldn't either. `update ... set view_count = view_count + 1` is a single atomic
statement — no explicit row lock is needed the way the coin-balance RPCs need `for update`,
because there's no read-then-branch business logic here, just an increment.

Client side: a new `incrementViewCount(dramaId: string)` helper (in `src/lib/dramas.ts`, mirroring
`src/lib/watch-history.ts`'s `recordWatchHistory` shape) wraps
`supabase.rpc('increment_view_count', { target_drama_id: dramaId })`. `src/app/drama/[id].tsx`
calls it once from a `useEffect` keyed on `id`, fire-and-forget (not awaited, errors not surfaced
to the user) — the same style `recordWatchHistory` already uses elsewhere in this app.

## "실시간 Top 10" section

Home screen section order becomes: 시청 중인 드라마 → **실시간 Top 10** → 새로운 드라마 →
모든 드라마 보기.

No new query — the home screen's already-loaded `dramas` array is sorted by `viewCount`
descending and the top 10 taken (`[...dramas].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10)`),
the same "derive from what's already loaded" approach the "새로운 드라마" section uses.

### Rank badge

`DramaCard` gains an optional `rank?: number` prop: when present, renders a bold white number in
a semi-transparent dark rounded box in the thumbnail's top-left corner (mirroring the existing
favorite-heart button's `rgba(0,0,0,...)` circular-backdrop convention on the opposite corner, so
the visual language is consistent within the card).

`DramaRow` gains an optional `showRank?: boolean` prop: when true, each rendered `DramaCard` gets
`rank={index + 1}` (1-based position in the `data` array as passed in — the caller is responsible
for having already sorted `data` by view count before passing it). Only the "실시간 Top 10"
section passes `showRank`; every other `DramaRow` usage is unaffected (prop is optional, defaults
to no badges).

### See-all screen

"실시간 Top 10"'s "전체보기" (already available for free via the existing `onSeeAll` mechanism)
opens a new screen, `src/app/top-dramas.tsx`, mirroring `new-dramas.tsx`'s structure exactly (no
login gate, same grid/error/empty patterns, same tap → login-redirect-or-record-and-navigate
behavior) but sorted by `viewCount` descending instead of `createdAt`, and rendering rank badges
on every grid item too (`rank={index + 1}` on each `DramaCard`, same convention as the home
section). Registered in `_layout.tsx` with `headerShown: true, title: '실시간 Top 10'`.

## Back button visibility fix

`BackButton` (`src/components/back-button.tsx`) gains an optional `withBackdrop?: boolean` prop,
default `false` (every existing usage — `login.tsx`, `signup.tsx`, `watch/[dramaId].tsx` — is
completely unaffected). When `true`, the button renders with a semi-transparent dark circular
backdrop behind the glyph and forces the glyph to white, guaranteeing visibility against any
background regardless of theme — the same fix pattern already established for the favorite-heart
button. Only `src/app/drama/[id].tsx`'s two `<BackButton />` usages (the error branch and the main
render) are changed to `<BackButton withBackdrop />`; no other screen changes.

## Files touched

1. `supabase/migrations/20260729090000_increment_view_count.sql` (new)
2. `src/lib/dramas.ts` (new — `incrementViewCount`)
3. `src/app/drama/[id].tsx` (call `incrementViewCount` on mount; both `BackButton` usages gain `withBackdrop`)
4. `src/components/drama-card.tsx` (add `rank?: number` prop + badge rendering)
5. `src/components/drama-row.tsx` (add `showRank?: boolean` prop)
6. `src/components/back-button.tsx` (add `withBackdrop?: boolean` prop)
7. `src/app/(tabs)/index.tsx` (add the Top 10 section between 시청 중인 드라마 and 새로운 드라마)
8. `src/app/top-dramas.tsx` (new)
9. `src/app/_layout.tsx` (register the new route)

## Verification

- `npx tsc --noEmit` clean.
- `npx expo start --web`: confirm the Top 10 section appears in the right position with rank
  badges 1–10, its see-all opens the new view-count-sorted grid (also ranked), the back button on
  the drama detail screen is now clearly visible with its dark circular backdrop, and visiting a
  drama's detail page increments its view count (checkable via a direct Supabase query before/after).
