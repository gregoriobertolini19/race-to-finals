export function phoneHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function formatPhoneDisplay(phone: string | null | undefined): string {
  return phone?.trim() || "—";
}
