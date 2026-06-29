export function resolveMatchResult(
  challengerId: number,
  challengedId: number,
  challengerScore: number,
  challengedScore: number
): { winnerId: number; score: string } | { error: string } {
  if (!Number.isFinite(challengerScore) || !Number.isFinite(challengedScore)) {
    return { error: "Inserisci un punteggio valido per entrambi i giocatori" };
  }
  if (challengerScore < 0 || challengedScore < 0) {
    return { error: "Il punteggio non può essere negativo" };
  }
  if (challengerScore === challengedScore) {
    return { error: "Il punteggio non può essere pareggio" };
  }

  return {
    winnerId: challengerScore > challengedScore ? challengerId : challengedId,
    score: `${challengerScore}-${challengedScore}`,
  };
}
