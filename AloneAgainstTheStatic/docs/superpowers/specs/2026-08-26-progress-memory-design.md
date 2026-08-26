# Pamięć poznanych paragrafów

Data: 2026-08-26

## Cel

Gra ma pamiętać — ponad pojedynczą rozgrywką — które paragrafy gracz już
widział, które opcje wyboru już podjął i jakie wyniki testów już uzyskał.
Wiedza ta jest widoczna w interfejsie jako przygaszenie i dopiski, żeby przy
ponownym przejściu scenariusza gracz odróżniał znane od nowego.

## Zakres

1. Paragraf widziany wcześniej: proza w alfie 70%, nagłówek „PARAGRAF *n*”
   w żółtej ramce.
2. Opcja wyboru podjęta wcześniej: alfa 50%, nadal klikalna.
3. Test rozgałęziający się na różne paragrafy: pod rzutem lista gałęzi, które
   gracz już przeszedł (SUKCES / PORAŻKA / PORAŻKA FORSOWANA).
4. Przycisk resetu pamięci w ustawieniach.

Oznaczenia obowiązują w bieżącym paragrafie i w Dzienniku.

## Magazyn — `src/ui/progress.js`

Nowy moduł, osobny klucz `localStorage`: `aats-progress`. Niezależny od
`aats-save`, więc „Nowa gra” go nie kasuje.

```json
{
  "version": 1,
  "entries": { "31": 2 },
  "choices": { "31": [0] },
  "rolls":   { "117:Intimidate": ["success", "fail"] }
}
```

- `entries[id]` — ile razy paragraf się pojawił.
- `choices[id]` — indeksy opcji wybranych kiedykolwiek w tym paragrafie.
- `rolls["<id>:<skill>"]` — gałęzie, które padły na tym teście. Klucz jest
  jednoznaczny: żaden paragraf w `story.json` nie powtarza tej samej
  umiejętności w rzucie (sprawdzone).

API:

```js
readProgress()                    // → { entries, choices, rolls }, zawsze poprawny obiekt
markEntry(id)                     // → nowy snapshot
markChoice(id, index)
markRoll(id, skill, branch)
resetProgress()
rollBranch(event)                 // → "success" | "pushedFail" | "fail"
```

`rollBranch` wylicza gałąź ze zdarzenia rzutu, które i tak renderuje dziennik:
`event.success` → `"success"`; `event.pushed && !event.success` →
`"pushedFail"`; reszta → `"fail"`. Dzięki temu silnik (`src/engine/`) nie
wymaga żadnej zmiany — cała pamięć żyje w warstwie UI.

Moduł jest defensywny jak `save.js`: uszkodzony lub obcej wersji wpis jest
kasowany i traktowany jak pusty, wyjątek z `localStorage` (tryb prywatny,
przekroczony limit) wyłącza pamięć, ale nie przerywa gry. Zapisy są
idempotentne — powtórzony `markChoice` nie dubluje indeksu.

## Prezentacja

### Paragraf

`main.js` robi zdjęcie pamięci **przed** zapisaniem bieżącej wizyty i podaje
flagę `seenBefore` do `createEntryBlock` w `journal.js`. Blok wpisu dostaje
wtedy atrybut `data-seen`.

```css
.journal-entry[data-seen] p          { opacity: .7; }
.journal-entry[data-seen] .entry-number { /* żółta ramka */ }
```

Przygaszona jest wyłącznie proza. Notatki mechaniczne (`.event-note`,
`.rollbox`, `.missing`) zostają w pełnej sile — to informacja o stanie, nie
tekst do czytania. Reguła nie koliduje z odsłanianiem: `reveal.js` steruje
`visibility` na `.veil`, `opacity` na `p` działa niezależnie.

### Wybór

Opcja obecna w `choices[entryId]` dostaje `data-taken` i `opacity: .5`.
Pozostaje klikalna. To osobny stan od istniejącego `:disabled`
(`data-reason="used"` dla opcji `once`, `data-reason="blocked"` dla guardów),
który zostaje bez zmian.

### Historia testu

Pod `.rollbox` dochodzi węzeł `.roll-history` z gałęziami zapisanymi **przed**
bieżącą ramką, np. `Już było: SUKCES · PORAŻKA`. Pojawia się razem z bramką
`RZUĆ: …`, czyli zanim gracz kliknie — wtedy jest najbardziej użyteczna.
Etykiety idą przez `COPY` w `journal.js` (pl/en). Pusta historia = brak węzła.

### Dziennik

Te same oznaczenia. Żeby archiwum nie przygasło w całości (każdy wpis jest
„widziany” z chwilą pojawienia się), flaga `seenBefore` zapisuje się raz —
w rekordzie dziennika, w momencie wejścia w paragraf — i stamtąd wraca przy
renderze archiwum. Analogicznie rekord niesie historię rzutu sprzed ramki.

`save.js` waliduje nowe pola tolerancyjnie: brak = `false` / pusta lista.
Wersja zapisu **nie** rośnie, więc istniejące zapisy działają dalej.

### Reset

W ustawieniach przycisk „Wyczyść poznane paragrafy” / „Clear discovered
entries”, z potwierdzeniem `confirm()`, jak przy „Nowej grze”. Wywołuje
`resetProgress()`; bieżąca rozgrywka trwa dalej.

## Moment zapisu

Paragraf trafia do pamięci w chwili, gdy pojawia się na ekranie — nie po
doczytaniu. Gracz, który zamknie kartę w połowie, następnym razem i tak ten
tekst widział. Wybór zapisuje się przy kliknięciu, gałąź rzutu — gdy w
zdarzeniach ramki pojawi się `roll`.

## Testy

- `test/progress.test.js` (nowy): odczyt i zapis, idempotencja, odrzucenie
  uszkodzonego JSON-a i obcej wersji, zachowanie przy zablokowanym
  `localStorage`, `resetProgress`, `rollBranch` dla trzech gałęzi.
- `test/journal.test.js` / `ui.test.js`: `data-seen`, `data-taken`, obecność i
  brak `.roll-history`, przygaszenie tylko prozy.
- `test/save.test.js`: rekord dziennika z `seenBefore` i bez niego.
- `test/style.test.js`: nowe reguły CSS.

`test/helpers/fake-dom.js` może wymagać drobnego uzupełnienia (np. `confirm`,
atrybuty danych) — do sprawdzenia przy implementacji.

## Podział plików

| Plik | Rola |
|---|---|
| `src/ui/progress.js` (nowy) | cała logika pamięci, ~120 linii |
| `src/ui/journal.js` | węzły: `data-seen`, `data-taken`, `.roll-history` |
| `style.css` | wygląd oznaczeń |
| `src/ui/main.js` | spięcie: zapis wizyty, wyboru, wyniku rzutu |
| `src/ui/save.js` | tolerancyjna walidacja `seenBefore` w rekordzie dziennika |
| `src/ui/settings.js` | przycisk resetu |

Silnik pozostaje nietknięty.
