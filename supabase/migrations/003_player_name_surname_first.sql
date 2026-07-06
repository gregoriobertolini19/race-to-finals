-- Da "Nome Cognome" a "Cognome Nome" (solo nomi con due parole)
UPDATE players
SET name = split_part(name, ' ', 2) || ' ' || split_part(name, ' ', 1)
WHERE name ~ '^[^ ]+ [^ ]+$';
