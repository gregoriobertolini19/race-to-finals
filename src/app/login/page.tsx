"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/tornei";

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Accesso negato");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di accesso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-border-accent">
          <Image
            src="/borgo-bagnolo-logo.png"
            alt="Logo Sporting Borgo Bagnolo"
            width={64}
            height={64}
            className="h-full w-full object-contain p-1"
            priority
          />
        </div>
        <h1 className="mt-4 text-xl font-bold text-ink">Area gestore</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Accesso riservato alla gestione torneo
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border-accent bg-surface p-6 shadow-sm"
      >
        <label className="mb-1 block text-sm font-medium text-ink-secondary">
          PIN amministratore
        </label>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Inserisci il PIN"
          required
        />

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Accesso..." : "Accedi"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link href="/" className="text-accent-dark hover:underline">
          ← Torna alla classifica
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center px-4 py-12">
      <Suspense fallback={<p className="text-ink-muted">Caricamento...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
