-- Snapshot posizioni al momento dell'aggiornamento classifica (per annullare risultati)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS winner_position_before INTEGER;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS loser_position_before INTEGER;
