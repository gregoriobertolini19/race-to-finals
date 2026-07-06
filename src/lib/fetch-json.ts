export async function fetchJson<T>(
  url: string
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(url);
    const text = await res.text();

    let data: T & { error?: string } = {} as T & { error?: string };
    if (text) {
      try {
        data = JSON.parse(text) as T & { error?: string };
      } catch {
        return {
          ok: false,
          status: res.status,
          error: "Risposta del server non valida",
        };
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data.error ?? `Errore ${res.status}`,
      };
    }

    return { ok: true, data: data as T };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Impossibile contattare il server. Controlla la connessione.",
    };
  }
}
