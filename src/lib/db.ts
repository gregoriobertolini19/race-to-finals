import postgres, { type Sql, type TransactionSql } from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __raceSql: Sql | undefined;
}

function parseConnection(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const hostname = parsed.hostname;
  const port = parsed.port || "5432";
  const connectionKind = hostname.includes("pooler")
    ? "pooler"
    : hostname.startsWith("db.")
      ? "direct"
      : "other";

  return { hostname, port, connectionKind };
}

export function getSql(): Sql {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL non configurato. Aggiungi la connection string Supabase in .env.local"
    );
  }

  const { port, connectionKind } = parseConnection(databaseUrl);

  if (connectionKind === "direct") {
    throw new Error(
      "DATABASE_URL usa la connessione Direct (IPv6). Su rete IPv4 usa il Session pooler da Supabase → Connect → Session pooler (host pooler.supabase.com, porta 5432)."
    );
  }

  if (!global.__raceSql) {
    const isTransactionPooler =
      connectionKind === "pooler" && (port === "6543" || port === "");
    global.__raceSql = postgres(databaseUrl, {
      ssl: databaseUrl.includes("supabase") ? "require" : undefined,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: isTransactionPooler ? false : undefined,
    });
  }

  return global.__raceSql;
}

export type { Sql, TransactionSql };
