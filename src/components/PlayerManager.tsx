"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
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

  async function editPhone(player: Player) {
    const next = prompt(
      `Numero di telefono per ${player.name}:`,
      player.phone ?? ""
    );
    if (next === null) return;

    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    onUpdated();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={addPlayer}
        className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 text-lg font-semibold text-emerald-950">
          Aggiungi giocatore
        </h2>
        <p className="mb-3 text-sm text-gray-600">
          I giocatori restano in anagrafica e possono essere usati in più
          tornei. Il telefono serve per contattarsi quando si lancia una sfida.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nome
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Mario"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cognome
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Rossi"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Telefono <span className="font-normal text-gray-500">(opzionale)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="333 1234567"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Aggiungo..." : "Aggiungi"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-emerald-50 text-emerald-900">
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
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Nessun giocatore. Aggiungi il primo giocatore per iniziare.
                </td>
              </tr>
            ) : (
              players.map((p) => {
                const href = phoneHref(p.phone);
                return (
                  <tr key={p.id} className="border-t border-emerald-100">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      {href ? (
                        <a
                          href={href}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {formatPhoneDisplay(p.phone)}
                        </a>
                      ) : (
                        <span className="text-gray-400">
                          {formatPhoneDisplay(p.phone)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(p.created_at).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editPhone(p)}
                          className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                        >
                          Telefono
                        </button>
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
