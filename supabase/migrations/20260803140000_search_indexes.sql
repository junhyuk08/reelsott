-- Powers title/genre search (ILIKE '%term%'). A plain btree index can't
-- serve a leading-wildcard pattern, so this needs a trigram GIN index
-- instead. Negligible at today's catalog size, but required once it grows.
create extension if not exists pg_trgm with schema extensions;

create index if not exists dramas_title_trgm_idx
  on public.dramas using gin (title extensions.gin_trgm_ops);

create index if not exists dramas_genre_trgm_idx
  on public.dramas using gin (genre extensions.gin_trgm_ops);
