import { useEffect, useState } from 'react';

import type { Drama } from '@/components/drama-card';
import { supabase } from '@/lib/supabase';

const DEBOUNCE_MS = 300;

// Escapes ILIKE wildcards (%, _) so typing a literal "%" or "_" matches that
// character instead of acting as a pattern, then quotes the result per
// PostgREST's .or() filter syntax so a comma or parenthesis in the search
// text (plausible in a drama title) isn't parsed as another filter clause.
function toIlikePattern(term: string) {
  const escapedWildcards = term.replace(/[%_]/g, (match) => `\\${match}`);
  const escapedQuotes = escapedWildcards.replace(/"/g, '\\"');
  return `"%${escapedQuotes}%"`;
}

export function useSearch(query: string) {
  const [results, setResults] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timeoutId = setTimeout(async () => {
      const pattern = toIlikePattern(trimmed);

      const { data, error: fetchError } = await supabase
        .from('dramas')
        .select('id, title, thumbnail_url, genre, episode_count, is_new, view_count')
        .eq('is_published', true)
        .or(`title.ilike.${pattern},genre.ilike.${pattern}`)
        .order('view_count', { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setError(null);
        setResults(
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
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query]);

  return { results, loading, error };
}
