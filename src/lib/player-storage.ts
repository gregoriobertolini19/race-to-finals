const PREFIX = "rtf_player_";

export function getStoredPlayerId(tournamentId: number): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${PREFIX}${tournamentId}`);
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

export function setStoredPlayerId(
  tournamentId: number,
  playerId: number | null
): void {
  if (typeof window === "undefined") return;
  const key = `${PREFIX}${tournamentId}`;
  if (playerId === null) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, String(playerId));
}
