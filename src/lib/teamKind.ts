/** Jumelo = binôme 2/2 — seul format produit. */
export function isDuoCapacity(capacity: number): boolean {
  return capacity <= 2;
}

export function formatKindLabel(_capacity?: number): 'Jumelo' {
  return 'Jumelo';
}
