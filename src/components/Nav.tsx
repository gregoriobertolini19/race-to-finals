"use client";

import Image from "next/image";
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
    <header className="border-b border-dark-elevated bg-dark text-on-dark">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-border-accent">
              <Image
                src="/borgo-bagnolo-logo.png"
                alt="Logo Sporting Borgo Bagnolo"
                width={40}
                height={40}
                className="h-full w-full object-contain p-0.5"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-on-dark-muted">
                Sporting Borgo Bagnolo
              </p>
              <h1 className="text-lg font-bold leading-tight text-on-dark">
                Race to Finals
              </h1>
            </div>
          </Link>
          <nav className="flex flex-wrap gap-1">
            {globalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname === link.href
                    ? "bg-accent text-white"
                    : "text-on-dark-muted hover:bg-dark-elevated hover:text-on-dark"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {tournament && tournamentId && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dark-elevated pt-3">
            <p className="text-sm text-on-dark-muted">
              Torneo:{" "}
              <span className="font-semibold text-on-dark">{tournament.name}</span>
            </p>
            <nav className="flex flex-wrap gap-1">
              {tournamentLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    pathname === link.href
                      ? "bg-accent text-white"
                      : "text-on-dark-muted hover:bg-dark-elevated hover:text-on-dark"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-sm text-on-dark-muted hover:bg-dark-elevated hover:text-on-dark"
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
