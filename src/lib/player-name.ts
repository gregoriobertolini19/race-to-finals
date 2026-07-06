export function formatPlayerName(firstName: string, lastName: string): string {
  return `${capitalizeNamePart(firstName)} ${capitalizeNamePart(lastName)}`;
}

/** Cognome prima, nome dopo (es. "Gianluigi Franza" → "Franza Gianluigi"). */
export function displayPlayerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return fullName.trim();

  const nome = parts[0];
  const cognome = parts.slice(1).join(" ");
  return `${cognome} ${nome}`;
}

function capitalizeNamePart(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toLocaleUpperCase("it-IT") +
        word.slice(1).toLocaleLowerCase("it-IT")
    )
    .join(" ");
}
