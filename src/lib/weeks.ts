import type { Challenge } from "./types";

/** Parse YYYY-MM-DD o datetime SQLite come data locale */
export function parseDateLocal(dateStr: string): Date {
  const datePart = dateStr.slice(0, 10);
  return new Date(datePart + "T12:00:00");
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Lunedì della settimana (inizio settimana) */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekKey(dateStr: string): string {
  return formatDateKey(getMonday(parseDateLocal(dateStr)));
}

/** Data di riferimento per la settimana di gioco */
export function getChallengePlayDate(challenge: Challenge): string {
  if (challenge.scheduled_at) return challenge.scheduled_at;
  if (challenge.status === "completed" && challenge.completed_at) {
    return challenge.completed_at.slice(0, 10);
  }
  return challenge.created_at.slice(0, 10);
}

export function isCurrentWeek(weekStartKey: string): boolean {
  return getWeekKey(formatDateKey(new Date())) === weekStartKey;
}

export function getWeekNumber(
  weekStartKey: string,
  tournamentStart: string | null
): number {
  if (!tournamentStart) return 1;
  const tMonday = getMonday(parseDateLocal(tournamentStart));
  const wMonday = getMonday(parseDateLocal(weekStartKey));
  const diffWeeks = Math.round(
    (wMonday.getTime() - tMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return Math.max(1, diffWeeks + 1);
}

export function formatWeekTitle(weekNum: number): string {
  return `Settimana ${weekNum}`;
}

export function formatWeekRange(weekStartKey: string): string {
  const start = parseDateLocal(weekStartKey);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });

  const year =
    start.getFullYear() === end.getFullYear()
      ? start.getFullYear()
      : `${start.getFullYear()}/${end.getFullYear()}`;

  return `${fmt(start)} – ${fmt(end)} ${year}`;
}

export function groupChallengesByPlayWeek(
  challenges: Challenge[]
): Map<string, Challenge[]> {
  const map = new Map<string, Challenge[]>();
  for (const challenge of challenges) {
    const key = getWeekKey(getChallengePlayDate(challenge));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(challenge);
  }
  return map;
}
