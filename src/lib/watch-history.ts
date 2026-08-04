import { supabase } from '@/lib/supabase';

// episodeId is omitted (not just undefined) when the caller doesn't know a
// specific episode (e.g. tapping a card just opens the drama synopsis) —
// upsert only sets the columns present in the payload, so leaving the key
// out preserves whatever last_episode_id was already recorded instead of
// clobbering it with null.
export async function recordWatchHistory(userId: string, dramaId: string, episodeId?: string) {
  await supabase.from('watch_history').upsert(
    {
      user_id: userId,
      drama_id: dramaId,
      watched_at: new Date().toISOString(),
      ...(episodeId ? { last_episode_id: episodeId } : {}),
    },
    { onConflict: 'user_id,drama_id' }
  );
}
