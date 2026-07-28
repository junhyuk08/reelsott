import { useEffect, useState } from 'react';

import type { Drama } from '@/components/drama-card';
import { supabase } from '@/lib/supabase';

export function useDramas() {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await supabase
        .from('dramas')
        .select('id, title, thumbnail_url, genre, episode_count, is_new, view_count')
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setDramas(
          (data ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            thumbnailUrl: row.thumbnail_url,
            genre: row.genre,
            episodeCount: row.episode_count,
            isNew: row.is_new,
            viewCount: row.view_count,
          }))
        );
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { dramas, loading, error };
}
