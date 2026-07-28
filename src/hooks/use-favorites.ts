import { useEffect, useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase';

export function useFavorites() {
  const { session } = useSession();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase
      .from('favorites')
      .select('drama_id')
      .then(({ data }) => {
        if (cancelled) return;
        setFavoriteIds(new Set((data ?? []).map((row: { drama_id: string }) => row.drama_id)));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function toggleFavorite(dramaId: string) {
    if (!session) return;

    if (favoriteIds.has(dramaId)) {
      await supabase.from('favorites').delete().eq('drama_id', dramaId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(dramaId);
        return next;
      });
    } else {
      await supabase.from('favorites').insert({ user_id: session.user.id, drama_id: dramaId });
      setFavoriteIds((prev) => new Set(prev).add(dramaId));
    }
  }

  return { favoriteIds, toggleFavorite, loading };
}
