import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Episode = {
  id: string;
  episodeNumber: number;
  videoUrl: string | null;
  isLocked: boolean;
};

export function useEpisodes(dramaId: string) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await supabase
        .from('episodes')
        .select('id, episode_number, video_url, is_locked')
        .eq('drama_id', dramaId)
        .order('episode_number', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEpisodes(
          (data ?? []).map((row) => ({
            id: row.id,
            episodeNumber: row.episode_number,
            videoUrl: row.video_url,
            isLocked: row.is_locked,
          }))
        );
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [dramaId]);

  return { episodes, loading, error };
}
