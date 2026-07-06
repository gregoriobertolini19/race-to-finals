"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PlayerHeader from "@/components/PlayerHeader";
import TournamentPicker from "@/components/TournamentPicker";
import type { Tournament } from "@/lib/types";

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/tournaments");
    const data = await res.json();
    setTournaments(data.tournaments ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PlayerHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <TournamentPicker tournaments={tournaments} />
        <p className="mt-10 text-center text-sm text-ink-muted">
          <Link href="/login" className="text-accent-dark hover:underline">
            Area gestore →
          </Link>
        </p>
      </main>
    </>
  );
}
