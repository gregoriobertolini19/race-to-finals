export type PlayerStatus = "active" | "standby" | "in_challenge";

export type TournamentStatus = "draft" | "active" | "completed";

export type ChallengeStatus =
  | "pending"
  | "active"
  | "completed"
  | "cancelled";

/** Giocatore permanente in anagrafica */
export interface Player {
  id: number;
  name: string;
  created_at: string;
}

/** Torneo (edizione Race to Finals) */
export interface Tournament {
  id: number;
  name: string;
  status: TournamentStatus;
  end_date: string | null;
  created_at: string;
  started_at: string | null;
  player_count?: number;
}

/** Partecipazione di un giocatore a un torneo */
export interface TournamentEntry {
  id: number;
  tournament_id: number;
  player_id: number;
  position: number;
  status: PlayerStatus;
  standby_since: string | null;
  name: string;
}

export interface Challenge {
  id: number;
  tournament_id: number;
  challenger_id: number;
  challenged_id: number;
  status: ChallengeStatus;
  winner_id: number | null;
  score: string | null;
  created_at: string;
  scheduled_at: string | null;
  completed_at: string | null;
  ranking_applied: boolean;
  challenger_name?: string;
  challenged_name?: string;
  challenger_position?: number;
  challenged_position?: number;
}

export interface RankingUpdate {
  id: number;
  tournament_id: number;
  applied_at: string;
  challenges_applied: number;
  notes: string | null;
}
