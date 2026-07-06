"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/fetch-json";

interface Props {
  onAuthenticated: () => void;
}

export default function PlayerAuthGate({ onAuthenticated }: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await fetchJson<{ ok: boolean }>("/api/auth/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPassword("");
    onAuthenticated();
  }

  return (
    <div className="rounded-xl border border-border-accent bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Password torneo</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Per vedere chi puoi sfidare e i numeri di telefono, inserisci la
        password condivisa con i partecipanti.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="player-password"
            className="mb-1 block text-sm font-medium text-ink-secondary"
          >
            Password
          </label>
          <input
            id="player-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full max-w-sm rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Password del torneo"
            required
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Verifica..." : "Continua"}
        </button>
      </form>
    </div>
  );
}
