export function redactEntryPhones<T extends { phone?: string | null }>(
  entries: T[]
): T[] {
  return entries.map((entry) => ({ ...entry, phone: null }));
}

export function redactEntryPhone<T extends { phone?: string | null }>(
  entry: T
): T {
  return { ...entry, phone: null };
}
