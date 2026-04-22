// Phone normalization helpers. We default to Tanzania (+255) since this is a TZS app,
// but accept any E.164-style international number that starts with '+'.

export function normalizePhone(raw: string, defaultCountry = "255"): string {
  if (!raw) return "";
  let s = raw.replace(/[\s\-()]/g, "");
  if (s.startsWith("+")) {
    return "+" + s.slice(1).replace(/\D/g, "");
  }
  s = s.replace(/\D/g, "");
  if (!s) return "";
  // Local TZ format like 0712345678 → 255712345678
  if (s.startsWith("0")) s = defaultCountry + s.slice(1);
  // Already has country code (255...)
  if (!s.startsWith(defaultCountry) && s.length <= 10) s = defaultCountry + s;
  return "+" + s;
}

export function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw);
  return /^\+[1-9]\d{7,14}$/.test(p);
}

// Synthetic email used to satisfy Supabase Auth when only a phone is provided.
// We use a non-routable .invalid TLD so nothing ever gets emailed.
export function phoneToSyntheticEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@phone.rosca.invalid`;
}
