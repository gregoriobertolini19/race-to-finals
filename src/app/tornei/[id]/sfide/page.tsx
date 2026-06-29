"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import ChallengeForm from "@/components/ChallengeForm";
import WeeklyChallenges from "@/components/WeeklyChallenges";
import type { Challenge, Tournament, TournamentEntry } from "@/lib/types";

export default function TournamentSfidePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<TournamentEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const load = useCallback(async () => {
    const [rankingRes, challengesRes] = await Promise.all([
      fetch(`/api/tournaments/${id}/ranking`),
      fetch(`/api/tournaments/${id}/challenges`),
    ]);

    if (!challengesRes.ok) {
      router.replace(`/tornei/${id}`);
      return;
    }

    const ranking = await rankingRes.json();
    const challengeData = await challengesRes.json();
    setTournament(challengeData.tournament ?? ranking.tournament);
    setEntries(ranking.entries ?? []);
    setChallenges(challengeData.challenges ?? []);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (!tournament) {
    return (
      <>
        <Nav />
        <p className="px-4 py-8 text-ink-muted">Caricamento...</p>
      </>
    );
  }

  return (
    <>
      <Nav tournament={tournament} />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Sfide</h1>
          <p className="mt-1 text-sm text-ink-muted">{tournament.name}</p>
        </div>

        <ChallengeForm
          tournamentId={parseInt(id, 10)}
          entries={entries}
          onCreated={load}
        />
        <WeeklyChallenges
          challenges={challenges}
          tournament={tournament}
          onUpdated={load}
        />

        <p className="text-center text-sm text-ink-muted">
          <Link href={`/tornei/${id}`} className="text-accent-dark hover:underline">
            ← Torna alla classifica
          </Link>
        </p>
      </div>
    </>
  );
}
