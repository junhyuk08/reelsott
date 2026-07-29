import { supabase } from '@/lib/supabase';

export async function incrementViewCount(dramaId: string) {
  await supabase.rpc('increment_view_count', { target_drama_id: dramaId });
}
