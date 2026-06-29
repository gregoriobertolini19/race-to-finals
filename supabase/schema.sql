-- Esegui questo script in Supabase → SQL Editor → New query → Run

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tournament_entries (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  standby_since TIMESTAMPTZ,
  UNIQUE (tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  challenger_id INTEGER NOT NULL REFERENCES players(id),
  challenged_id INTEGER NOT NULL REFERENCES players(id),
  status TEXT NOT NULL DEFAULT 'pending',
  winner_id INTEGER REFERENCES players(id),
  score TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at DATE,
  completed_at TIMESTAMPTZ,
  ranking_applied BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS ranking_updates (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  challenges_applied INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_challenges_tournament ON challenges(tournament_id);
CREATE INDEX IF NOT EXISTS idx_entries_tournament ON tournament_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(tournament_id, status);
