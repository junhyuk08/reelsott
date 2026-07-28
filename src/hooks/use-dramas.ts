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
        .eq('is_published', true)
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

export type DramaDetail = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  genre: string;
  episodeCount: number;
  freeEpisodeCount: number;
};

export function useDrama(id: string) {
  const [drama, setDrama] = useState<DramaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await supabase
        .from('dramas')
        .select('id, title, thumbnail_url, genre, episode_count, free_episode_count')
        .eq('id', id)
        .single();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setDrama({
          id: data.id,
          title: data.title,
          thumbnailUrl: data.thumbnail_url,
          genre: data.genre,
          episodeCount: data.episode_count,
          freeEpisodeCount: data.free_episode_count,
        });
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { drama, loading, error };
}
