import { useEffect, useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase';

export type Episode = {
  id: string;
  episodeNumber: number;
  videoUrl: string | null;
};

export function useEpisodes(dramaId: string) {
  const { session } = useSession();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: fetchError } = await supabase
        .from('episodes')
        .select('id, episode_number, video_url')
        .eq('drama_id', dramaId)
        .order('episode_number', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setEpisodes(
        (data ?? []).map((row) => ({
          id: row.id,
          episodeNumber: row.episode_number,
          videoUrl: row.video_url,
        }))
      );

      if (session) {
        const { data: unlocks } = await supabase.from('unlocked_episodes').select('episode_id');
        if (!cancelled) {
          setUnlockedIds(new Set((unlocks ?? []).map((row: { episode_id: string }) => row.episode_id)));
        }
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [dramaId, session]);

  async function unlockEpisode(episodeId: string) {
    const { data, error: rpcError } = await supabase.rpc('unlock_episode', {
      target_episode_id: episodeId,
    });

    if (rpcError) {
      return { success: false as const, error: rpcError.message };
    }

    setUnlockedIds((prev) => new Set(prev).add(episodeId));
    return { success: true as const, coinBalance: data.coin_balance as number };
  }

  return { episodes, unlockedIds, loading, error, unlockEpisode };
}
