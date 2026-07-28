import { supabase } from '@/lib/supabase';

export async function recordWatchHistory(userId: string, dramaId: string) {
  await supabase.from('watch_history').upsert(
    { user_id: userId, drama_id: dramaId, watched_at: new Date().toISOString() },
    { onConflict: 'user_id,drama_id' }
  );
}
