/**
 * Noms auto / placeholder considérés comme « pas encore choisis »
 * (formation daily : « Alice × Bob », ou libellé générique).
 */
export function isProvisionalJumeloName(name: string | null | undefined): boolean {
  const n = (name ?? '').trim();
  if (!n) return true;
  if (/^nouveau jumelo$/i.test(n)) return true;
  // Auto-name post-formation : « Prénom × Prénom »
  if (/\s×\s/.test(n)) return true;
  return false;
}
