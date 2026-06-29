-- Esegui in Supabase → SQL Editor se il database esiste già
ALTER TABLE players ADD COLUMN IF NOT EXISTS phone TEXT;
