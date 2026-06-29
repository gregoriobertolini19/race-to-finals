"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
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
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <TournamentPicker tournaments={tournaments} />
      </main>
    </>
  );
}
