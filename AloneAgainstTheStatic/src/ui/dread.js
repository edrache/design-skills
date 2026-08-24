// Poziom rozpadu obrazu rośnie wraz ze spadkiem Poczytalności: na starcie
// gry (pełna Poczytalność) rozpad jest zerowy, przy zerowej Poczytalności
// sięga maksimum. Czysta funkcja — bez DOM, bez document, do użycia
// zarówno w UI, jak i w testach pod Node.
export function dreadLevel(state) {
  const start = Number(state?.startingSan);
  const current = Number(state?.san);
  if (!Number.isFinite(start) || !Number.isFinite(current) || start <= 0) return 0;
  const dread = 1 - current / start;
  return Math.max(0, Math.min(1, dread));
}
