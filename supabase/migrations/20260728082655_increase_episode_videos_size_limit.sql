-- Default bucket creation left file_size_limit unset, which falls back to
-- the project-wide 50MiB cap and rejected several real episode uploads
-- (up to ~181MB) with "Payload too large". 300MB covers those with room
-- to spare for future episodes.
update storage.buckets
set file_size_limit = 300 * 1024 * 1024
where id = 'episode-videos';
