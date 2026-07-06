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
        <div className="mt-10 text-center">
          <Link
            href="/tornei"
            className="inline-block rounded-lg border border-border-accent bg-surface px-5 py-2.5 text-sm font-medium text-ink-secondary shadow-sm hover:border-accent hover:text-accent-dark"
          >
            Area gestione
          </Link>
        </div>
      </main>
    </>
  );
}
