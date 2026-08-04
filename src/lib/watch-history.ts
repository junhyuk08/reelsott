import { supabase } from '@/lib/supabase';

// episodeId is only passed where we actually know which episode is being
// watched (the reel screen). Omitting it (e.g. just opening a drama's detail
// page) leaves last_episode_id untouched on conflict, rather than clearing
// the previously-recorded resume point.
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
