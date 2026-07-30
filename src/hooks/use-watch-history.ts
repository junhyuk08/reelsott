import { useEffect, useState } from 'react';

import type { Drama } from '@/components/drama-card';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase';

type WatchHistoryRow = {
  dramas: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    genre: string;
    episode_count: number;
    is_new: boolean;
    view_count: number;
  } | null;
};

export function useWatchHistory(limit?: number) {
  const { session } = useSession();
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setDramas([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      let query = supabase
        .from('watch_history')
        .select('dramas(id, title, thumbnail_url, genre, episode_count, is_new, view_count)')
        .order('watched_at', { ascending: false });

      if (limit !== undefined) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setDramas(
          ((data ?? []) as unknown as WatchHistoryRow[])
            .map((row) => row.dramas)
            .filter((d): d is NonNullable<WatchHistoryRow['dramas']> => d !== null)
            .map((d) => ({
              id: d.id,
              title: d.title,
              thumbnailUrl: d.thumbnail_url,
              genre: d.genre,
              episodeCount: d.episode_count,
              isNew: d.is_new,
              viewCount: d.view_count,
            }))
        );
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session, limit]);

  return { dramas, loading, error };
}
