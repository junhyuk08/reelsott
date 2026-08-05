import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Drama } from '@/components/drama-card';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase';

export type WatchedDrama = Drama & { lastEpisodeId: string | null };

type WatchHistoryRow = {
  last_episode_id: string | null;
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

export type WatchHistoryDrama = Drama & { lastEpisodeId: string | null };

export function useWatchHistory(limit?: number) {
  const { session } = useSession();
  const [dramas, setDramas] = useState<WatchHistoryDrama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setDramas([]);
        setLoading(false);
        return;
      }

      let cancelled = false;

      async function load() {
        let query = supabase
          .from('watch_history')
          .select('last_episode_id, dramas(id, title, thumbnail_url, genre, episode_count, is_new, view_count)')
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
              .filter((row): row is WatchHistoryRow & { dramas: NonNullable<WatchHistoryRow['dramas']> } => row.dramas !== null)
              .map((row) => ({
                id: row.dramas.id,
                title: row.dramas.title,
                thumbnailUrl: row.dramas.thumbnail_url,
                genre: row.dramas.genre,
                episodeCount: row.dramas.episode_count,
                isNew: row.dramas.is_new,
                viewCount: row.dramas.view_count,
                lastEpisodeId: row.last_episode_id,
              }))
          );
        }
        setLoading(false);
      }

      load();
      return () => {
        cancelled = true;
      };
    }, [session, limit])
  );

  return { dramas, loading, error };
}
