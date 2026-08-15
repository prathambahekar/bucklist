/*
# Create watchlist table (single-tenant, no auth)

## Purpose
Stores movies the user wants to watch plus a record of movies they have already watched.
This is a single-user app with no sign-in, so data is shared/public across the anon key.

## New Tables
- `watchlist`
  - `id` (uuid, primary key)
  - `tmdb_id` (integer, the TMDB movie ID for deduplication)
  - `title` (text, movie title)
  - `poster_path` (text, TMDB poster image path, nullable)
  - `release_year` (text, 4-digit year, nullable)
  - `genres` (text array, genre names from TMDB)
  - `platforms` (text array, streaming/OTT platform names)
  - `watched` (boolean, default false — whether the user has watched it)
  - `watched_date` (date, when the user watched it, nullable)
  - `rating` (smallint, 1–5 star rating, nullable)
  - `created_at` (timestamptz, when added to the watchlist)

## Security
- Enable RLS on `watchlist`.
- Allow anon + authenticated full CRUD because this is a single-user, no-auth app
  and the data is intentionally shared/public.
*/

CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id integer NOT NULL,
  title text NOT NULL,
  poster_path text,
  release_year text,
  genres text[] NOT NULL DEFAULT '{}',
  platforms text[] NOT NULL DEFAULT '{}',
  watched boolean NOT NULL DEFAULT false,
  watched_date date,
  rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_watchlist" ON watchlist;
CREATE POLICY "anon_select_watchlist" ON watchlist FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_watchlist" ON watchlist;
CREATE POLICY "anon_insert_watchlist" ON watchlist FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_watchlist" ON watchlist;
CREATE POLICY "anon_update_watchlist" ON watchlist FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_watchlist" ON watchlist;
CREATE POLICY "anon_delete_watchlist" ON watchlist FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_watchlist_watched ON watchlist(watched);
CREATE INDEX IF NOT EXISTS idx_watchlist_created_at ON watchlist(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_tmdb_id ON watchlist(tmdb_id);
