# Nawrót — odwracanie wyniku testu

Data: 2026-08-26

## Po co

Przy stole nikt nie zabroni graczowi przymknąć oka na kość. Wersja
przeglądarkowa ma dać te same emocje: po ogłoszeniu wyniku testu można go
odwrócić — ale taśma to zapamięta.

## Zasady

- Odwrócić da się **tylko ostatni rzut w bieżącym paragrafie**, i **tylko raz**.
- Odwrócenie nie przerzuca kości. Na ekranie zostaje ten sam wynik, zmienia się
  wyłącznie werdykt: kości mówią 87, etykieta mówi SUKCES.
- Każde odwrócenie trwale podnosi rozpad obrazu i zostawia widoczny znacznik
  w dzienniku.

## Silnik (`src/engine/runner.js`)

Przy rzucie rozgałęziającym (`step.roll`, `choice.roll` — nie `bout`,
nie `sanCheck`, nie rzuty z `rules.js`) ramka dostaje checkpoint:

```
frame.rewind = { state, entryId, eventCount, cursor, stepIndex, source, choiceIndex, event }
```

- `state` — stan po pobraniu kości doraźnych, przed gałęzią.
- `eventCount` — pozycja rzutu na liście zdarzeń ramki.
- `event` — to samo zdarzenie, które trafiło do `frame.events`; tożsamość
  obiektu pozwala UI dokleić przycisk do właściwego pudełka kości.
- Checkpoint późniejszego rzutu wygrywa z wcześniejszym: w ramce zostaje ostatni.
- Skok po rzucie (`goto` w gałęzi) sklejał zdarzenia i gubił checkpoint —
  robi to teraz `mergeForward`, które przenosi go razem z nimi i przesuwa
  `eventCount` o długość prefiksu.

Punkt cofnięcia znika po dopłacie Szczęściem i po przyjęciu porażki: to są
decyzje zamykające sprawę, a kości i tak nie zostają na ekranie. Przepchnięcie
daje nowy rzut, więc dostaje własny punkt cofnięcia.

Nowa akcja `resume(ctx, frame, { type: "cheat" })`:

1. odcina zdarzenia do `eventCount`,
2. dopisuje ten sam rzut z odwróconym werdyktem,
3. przelicza przeciwną gałąź (`onSuccess` ↔ `onFail`).

Odwrócony werdykt:

- porażka → sukces: `level = successLevel(próg, target)`, `success = true`
- sukces → porażka: `level = "fail"`, `success = false`
- zdarzenie: `cheated: true`, `cheatedFrom: { level, success }`

## Ślad

- `state.cheats` — licznik, domyślnie 0, rośnie o 1 na odwrócenie.
- `dreadLevel()` dolicza `min(0.5, cheats × 0.06)` do rozpadu z Poczytalności.
- Dziennik i archiwum: przy odwróconym rzucie oryginalna etykieta stoi
  przekreślona obok nowej.
- `save.js` waliduje `cheats` jako opcjonalny nieujemny int (stare zapisy
  przechodzą). `frame.rewind` **nie jest zapisywane** — odświeżenie strony
  zamyka okazję.

## UI

Przycisk staje w pudełku rzutu, tuż pod kośćmi i przed ewentualnym rzędem
decyzji o Szczęściu i przepchnięciu. Odsłanianie (`reveal.js`) woła `onRoll`
z rzutem i jego pudełkiem, a `main.js` porównuje zdarzenie z `frame.rewind.event`
po tożsamości. Doklejanie na końcu ramki nie wchodziło w grę: ramka bywa
dłuższa niż jeden paragraf, więc kości byłyby wtedy dawno powyżej.

- po porażce: „A może jednak się udało?”
- po sukcesie: „A może jednak test się nie udał?”

Spoczynek: `opacity: 0.07`, bez ramki — ledwo widmo tekstu. Hover/focus: pełna
widoczność, czerwony outline (`--rec`), filtr szumu i animowany overlay linii.
Pod `prefers-reduced-motion` zostaje sam kontrast i outline.

## Testy

- `runner.test.js` — nawrót po porażce prowadzi na gałąź `onSuccess` i odwrotnie;
  kości niezmienione; `rewind` znika po użyciu; brak `rewind` przy `bout`/`sanCheck`.
- `dread.test.js` — licznik podbija rozpad z sufitem.
- `ui.test.js` — znacznik w dzienniku i archiwum, przycisk nawrotu.
- `save.test.js` — `cheats` w zapisie, `rewind` poza nim.
- `style.test.js` — klasy przycisku.
