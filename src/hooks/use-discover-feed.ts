import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type DiscoverItem = {
  dramaId: string;
  episodeId: string;
  title: string;
  genre: string;
  videoUrl: string | null;
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function useDiscoverFeed() {
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await supabase
        .from('dramas')
        .select('id, title, genre, episodes!inner(id, episode_number, video_url)')
        .eq('is_published', true)
        .eq('episodes.episode_number', 1);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const mapped = (data ?? [])
        .map((row): DiscoverItem | null => {
          const episode = Array.isArray(row.episodes) ? row.episodes[0] : row.episodes;
          if (!episode) return null;
          return {
            dramaId: row.id,
            episodeId: episode.id,
            title: row.title,
            genre: row.genre,
            videoUrl: episode.video_url,
          };
        })
        .filter((item): item is DiscoverItem => item !== null);

      setItems(shuffle(mapped));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
