import { segmentEvents } from "./journal.js";
import { markEntry, markRoll, rollBranch } from "./progress.js";

function segmentsOf(record) {
  return segmentEvents(record.events, {
    entryId: record.entryId,
    originEntryId: record.originEntryId,
  });
}

function hasId(segment) {
  return segment.entryId !== null && segment.entryId !== undefined;
}

// Zdjęcie pamięci sprzed ramki. Czytamy magazyn, ZANIM zapiszemy bieżącą
// wizytę — inaczej paragraf przygasiłby sam siebie. `revisit` opisuje wznowiony
// zapis: ta ramka trafiła do magazynu już w poprzedniej sesji.
//
// Kształt wyniku jest ten, którego oczekuje journal.js: `seenEntries` obsługuje
// ramkę z kilkoma paragrafami (predykat przy renderze), a `seenBefore` to jedna
// flaga rekordu dla archiwum — prawdziwa tylko wtedy, gdy znane były wszystkie
// paragrafy ramki, żeby nowy tekst nigdy nie przygasł.
export function frameMemory(record, snapshot, { revisit = false } = {}) {
  const segments = segmentsOf(record);
  const seenEntries = {};
  const rollHistory = {};
  const floor = revisit ? 1 : 0;
  let seenBefore = segments.length > 0;

  for (const segment of segments) {
    if (!hasId(segment)) {
      seenBefore = false;
      continue;
    }
    const key = String(segment.entryId);
    if ((snapshot.entries[key] ?? 0) > floor) seenEntries[key] = true;
    else seenBefore = false;

    for (const event of segment.events) {
      if (event.kind !== "roll" || typeof event.skill !== "string") continue;
      const branches = snapshot.rolls[`${key}:${event.skill}`];
      if (branches?.length) rollHistory[event.skill] = [...branches];
    }
  }

  const taken = snapshot.choices[String(record.entryId)] ?? [];
  return { seenBefore, seenEntries, takenChoices: [...taken], rollHistory };
}

// Paragraf liczy się w chwili, gdy trafia na ekran, a nie po doczytaniu:
// gracz, który zamknie kartę w połowie, ten tekst i tak widział.
export function recordFrame(record) {
  for (const segment of segmentsOf(record)) {
    if (!hasId(segment)) continue;
    markEntry(segment.entryId);
    for (const event of segment.events) {
      if (event.kind !== "roll" || typeof event.skill !== "string") continue;
      markRoll(segment.entryId, event.skill, rollBranch(event));
    }
  }
}
