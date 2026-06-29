"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Tournament } from "@/lib/types";

const globalLinks = [
  { href: "/", label: "Scegli torneo" },
  { href: "/tornei", label: "Gestione tornei" },
  { href: "/giocatori", label: "Anagrafica" },
];

interface Props {
  tournament?: Tournament | null;
}

export default function Nav({ tournament }: Props) {
  const pathname = usePathname();
  const tournamentMatch = pathname.match(/^\/tornei\/(\d+)/);
  const tournamentId = tournamentMatch?.[1];
  const isDraft = tournament?.status === "draft";

  const tournamentLinks = tournamentId
    ? [
        ...(!isDraft
          ? [
              { href: `/tornei/${tournamentId}`, label: "Classifica" },
              ...(tournament?.status === "active"
                ? [{ href: `/tornei/${tournamentId}/sfide`, label: "Sfide" }]
                : []),
            ]
          : []),
        {
          href: `/tornei/${tournamentId}/impostazioni`,
          label: isDraft ? "Configura" : "Impostazioni",
        },
      ]
    : [];

  return (
    <header className="border-b border-emerald-900/20 bg-emerald-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-emerald-950">
              R
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-emerald-300">
                Sporting Borgo Bagnolo
              </p>
              <h1 className="text-lg font-bold leading-tight">Race to Finals</h1>
            </div>
          </Link>
          <nav className="flex flex-wrap gap-1">
            {globalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname === link.href
                    ? "bg-emerald-800 text-white"
                    : "text-emerald-100 hover:bg-emerald-800 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {tournament && tournamentId && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-800/50 pt-3">
            <p className="text-sm text-emerald-200">
              Torneo:{" "}
              <span className="font-semibold text-white">{tournament.name}</span>
            </p>
            <nav className="flex flex-wrap gap-1">
              {tournamentLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    pathname === link.href
                      ? "bg-emerald-600 text-white"
                      : "text-emerald-100 hover:bg-emerald-800"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-sm text-emerald-300 hover:bg-emerald-800 hover:text-white"
              >
                Cambia torneo
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
