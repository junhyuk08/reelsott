import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { getRpcErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export const EPISODE_COIN_COST = 30;

export type Episode = {
  id: string;
  episodeNumber: number;
  videoUrl: string | null;
};

export type LockReason = 'login' | 'coin' | null;

// Guests can only watch episode 1 — this check always wins over the coin
// lock, regardless of freeEpisodeCount, so a guest never plays episode 2+.
export function getLockReason(
  episode: Episode,
  { freeEpisodeCount, unlockedIds, isLoggedIn }: { freeEpisodeCount: number; unlockedIds: Set<string>; isLoggedIn: boolean }
): LockReason {
  if (!isLoggedIn && episode.episodeNumber > 1) return 'login';
  if (episode.episodeNumber > freeEpisodeCount && !unlockedIds.has(episode.id)) return 'coin';
  return null;
}

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

  // Refetches unlocked_episodes whenever this screen regains focus (not just
  // on mount) — otherwise going back to drama/[id].tsx after unlocking an
  // episode in watch/[dramaId].tsx's own hook instance still shows it locked,
  // since the two screens don't share state.
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let cancelled = false;

      supabase
        .from('unlocked_episodes')
        .select('episode_id')
        .then(({ data }) => {
          if (cancelled) return;
          setUnlockedIds(new Set((data ?? []).map((row: { episode_id: string }) => row.episode_id)));
        });

      return () => {
        cancelled = true;
      };
    }, [session])
  );

  async function unlockEpisode(episodeId: string) {
    const { data, error: rpcError } = await supabase.rpc('unlock_episode', {
      target_episode_id: episodeId,
    });

    if (rpcError) {
      return {
        success: false as const,
        error: getRpcErrorMessage(rpcError, '잠금 해제에 실패했습니다. 잠시 후 다시 시도해주세요.'),
      };
    }

    setUnlockedIds((prev) => new Set(prev).add(episodeId));
    return { success: true as const, coinBalance: data.coin_balance as number };
  }

  return { episodes, unlockedIds, loading, error, unlockEpisode };
}
