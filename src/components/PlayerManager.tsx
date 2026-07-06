"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
import { displayPlayerName } from "@/lib/player-name";
import { formatPhoneDisplay, phoneHref } from "@/lib/phone";

interface Props {
  players: Player[];
  onUpdated: () => void;
}

export default function PlayerManager({ players, onUpdated }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const missingPhoneCount = players.filter((p) => !p.phone?.trim()).length;

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: phone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFirstName("");
      setLastName("");
      setPhone("");
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  async function removePlayer(id: number) {
    if (!confirm("Rimuovere questo giocatore dall'anagrafica?")) return;
    const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    onUpdated();
  }

  async function savePhone(playerId: number) {
    setSavingId(playerId);
    setError("");
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: editPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingId(null);
      setEditPhone("");
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setSavingId(null);
    }
  }

  function startEditing(player: Player) {
    setEditingId(player.id);
    setEditPhone(player.phone ?? "");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditPhone("");
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={addPlayer}
        className="rounded-xl border border-border-accent bg-surface p-5 shadow-sm"
      >
        <h2 className="mb-3 text-lg font-semibold text-ink">
          Aggiungi giocatore
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          I giocatori restano in anagrafica e possono essere usati in più
          tornei. Il telefono serve per contattarsi quando si lancia una sfida.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">
              Nome
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Mario"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">
              Cognome
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Rossi"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-secondary">
              Telefono <span className="font-normal text-ink-muted">(opzionale)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="333 1234567"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Aggiungo..." : "Aggiungi"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {missingPhoneCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {missingPhoneCount === 1
            ? "1 giocatore senza telefono — aggiungilo dalla tabella sotto."
            : `${missingPhoneCount} giocatori senza telefono — aggiungili dalla tabella sotto.`}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border-accent bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-dark text-on-dark">
            <tr>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Telefono</th>
              <th className="px-4 py-3 font-semibold">In anagrafica dal</th>
              <th className="px-4 py-3 font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                  Nessun giocatore. Aggiungi il primo giocatore per iniziare.
                </td>
              </tr>
            ) : (
              players.map((p) => {
                const href = phoneHref(p.phone);
                const isEditing = editingId === p.id;
                const missingPhone = !p.phone?.trim();

                return (
                  <tr
                    key={p.id}
                    className={`border-t border-border ${
                      missingPhone ? "bg-amber-50/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">
                      {displayPlayerName(p.name)}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="333 1234567"
                            autoFocus
                            className="w-full min-w-[10rem] max-w-xs rounded-lg border border-border px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") savePhone(p.id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => savePhone(p.id)}
                            disabled={savingId === p.id}
                            className="rounded bg-accent px-2 py-1 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                          >
                            {savingId === p.id ? "Salvo..." : "Salva"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded border border-border px-2 py-1 text-xs font-medium text-ink-secondary hover:bg-surface-alt"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : href ? (
                        <a
                          href={href}
                          className="font-medium text-accent-dark hover:underline"
                        >
                          {formatPhoneDisplay(p.phone)}
                        </a>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {new Date(p.created_at).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => startEditing(p)}
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              missingPhone
                                ? "bg-accent text-white hover:bg-accent-hover"
                                : "bg-accent-muted text-accent-dark hover:bg-accent-muted/80"
                            }`}
                          >
                            {missingPhone ? "Aggiungi telefono" : "Modifica"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removePlayer(p.id)}
                          className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                        >
                          Rimuovi
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
