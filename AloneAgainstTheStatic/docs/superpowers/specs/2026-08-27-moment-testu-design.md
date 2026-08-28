# Moment testu: jednolite decyzje przy każdym rzucie

## Problem

Gracz zgłasza dwie skargi: czasem nie da się wybrać wyniku innego niż wypadł
(brak cheata), czasem nie da się przyjąć wyniku rzutu i jedynym wyjściem jest
cheat. Obie mają jedną przyczynę: dostępność czterech akcji przy teście rządzi
się trzema niezależnymi mechanizmami.

1. Panel decyzji (a więc i przycisk przyjęcia wyniku) powstaje warunkowo —
   `runner.js`: `if (pendingDecision.canPush || canLuck)`. W danych tylko 12 z
   81 rzutów ma `push`, a `canLuck` jest z zasady zablokowane dla rzutów Sanity
   (17 rzutów) i Luck (3). Nieudany rzut np. na Spot Hidden (par. 19) albo
   Sanity (par. 22) silnik stosuje sam i pędzi dalej. Przy sukcesie pauzy nie
   ma nigdy.
2. Cheat wisi na `frame.rewind` — jednym punkcie cofnięcia na całą ramkę,
   w którym wygrywa ostatni rzut (`withRewind`, `mergeForward`). Ramka potrafi
   przelecieć kilka paragrafów: par. 3 (Psychology) prowadzi do par. 5 (CON),
   więc cheat dotyczy już tylko CON. Rzuty rodzące się w efektach (`sanCheck`,
   `bout`) nie mają rewind nigdy, po `luck`/`accept`/`cheat` rewind przepada,
   a `save.js` w ogóle go nie zapisuje — po wczytaniu zapisu cheata nie ma.
3. Forsowanie pojawia się wyłącznie tam, gdzie dane mają `push: true`.

## Rozwiązanie

Silnik zatrzymuje się **na rzucie, przed zastosowaniem gałęzi**. Cheat
przestaje być cofnięciem po fakcie i staje się czwartą decyzją obok przyjęcia
wyniku, forsowania i wydania Szczęścia. Dostępność wszystkich czterech liczy
jedna funkcja.

| akcja | dostępna |
| --- | --- |
| przyjmuję wynik | zawsze |
| forsuj (push) | porażka ∧ `push: true` w danych ∧ rzut nie był już forsowany |
| wypal Szczęście (N) | porażka ∧ `kind === "skill"` ∧ rzut nie był forsowany ∧ rzut nie na Sanity i nie na Luck ∧ `luckCost > 0` ∧ `state.luck >= luckCost` |
| cheat (przeciwny wynik) | zawsze, w obie strony |

Świadome konsekwencje przyjęte przez zamawiającego:

- każdy rzut wymaga kliknięcia, także udany;
- cheat jest dostępny tylko w momencie rzutu, nie po zobaczeniu, gdzie
  zaprowadziła porażka;
- forsowanie zostaje sterowane danymi (`push: true`), nie regułami 7e.

## Architektura

### Ramka i pending

`pending.type === "rollDecision"` staje się jedynym stanem po rzucie i nosi
wszystko, co potrzebne do wznowienia:

```js
{
  type: "rollDecision",
  kind: "skill" | "sanCheck" | "bout", // co zastosować po decyzji
  roll: check,                          // pełny wynik z skillCheck
  skill,                                // etykieta rzutu ("Spot Hidden", "Sanity", "INT")
  source: undefined | "choice",
  choiceIndex,                          // gdy source === "choice"
  stepIndex,                            // indeks kroku w on[] albo choices[]
  cursor,                               // pozycja wznowienia w on[]
  pushed: false,                        // czy ten rzut był już forsowany
  notation,                             // tylko sanCheck, np. "1/1d4"
  canPush, canLuck, luckCost,
  canCheat: true,
}
```

Nowa funkcja `decisionFor(state, check, step, context)` w `runner.js` liczy
`canPush`, `canLuck`, `luckCost`, `canCheat` — jedno miejsce prawdy zamiast
trzech rozproszonych warunków.

### Rozstrzyganie decyzji

`resume(ctx, frame, action)`:

- `accept` → `applyRolled(pending.roll)`;
- `push` → nowy `skillCheck`, ponowna pauza z `pushed: true`;
- `luck` → `spendLuck`, wynik podbity do progu (`result = threshold`,
  `success: true`, `spentLuck`), gałąź `onSuccess`;
- `cheat` → `countCheat`, `invertedRoll(pending.roll)`, potem `applyRolled`
  na odwróconym wyniku.

`applyRolled(check)` rozgałęzia się po `pending.kind`:

- `skill` → `applyBranch` na `onSuccess` / `onPushedFail` (gdy `pushed`
  i gałąź istnieje) / `onFail`;
- `sanCheck` → `applySanityCheck(state, check, notation, character, rng)`;
- `bout` → `applyBout(state, check, rng)`.

### Rzuty wewnętrzne

Dane potwierdzają, że wszystkie 5 wystąpień `sanCheck` (par. 248, 271, 273,
315, 348) i jedyny `bout` (par. 329) są krokami `on[]` — nie występują
w gałęziach `onSuccess`/`onFail`. Wznowienie to więc zwykła para
`(entryId, cursor)`; nie potrzeba reprezentacji kontynuacji dla efektów.

`rules.js` rozdziela rzut od skutku:

- `sanityCheck` → `rollSanity(state, rng)` + `applySanityCheck(state, check, notation, character, rng)`;
- `resolveBout` → `rollBout(state, character, rng)` + `applyBout(state, check, rng)`.

Przy `bout` obowiązuje dzisiejsza semantyka: nieudany rzut INT wraca tam,
skąd przyszliśmy (`popReturn`), udany kieruje do paragrafu kary.

### Co znika

`frame.rewind`, `withRewind`, `rewindFor`, przenoszenie rewind w
`mergeForward`, gałąź `cheat` operująca na rewindzie, `rollBoxOf` w
`main.js` i osobne wywołania `renderCheat` poza panelem decyzji.
`invertedRoll` zostaje — działa teraz na `pending.roll`.

### UI

`renderRollDecision` (`journal.js`) rysuje jeden panel w kolejności:
przyjmij wynik, forsuj rzut, wypal Szczęście (N), cheat. Cheat zachowuje
dzisiejszą dyskretną formę (klasa `.cheat`, tekst „A może jednak…”) i staje
pod kośćmi, po pozostałych przyciskach. Etykieta `accept` przestaje mówić
o porażce — „Przyjmij wynik” / „Accept the result”, bo pojawia się też przy
sukcesie. `main.js` traci gałąź `renderCheat` na rewindzie; cheat jedzie
przez `decide("cheat")` razem z resztą.

### Zapis

`save.js`: warunek `(pending.canPush || pending.canLuck)` odpada, walidacja
`rollDecision` dostaje `kind`, `cursor`, `pushed` i `notation`, a rekonstrukcja
`compatibleRoll` sprawdza zgodność ze `step` dla `kind === "skill"` oraz z
krokiem `sanCheck`/`bout` dla pozostałych. Stare zapisy z pending, które nie
przechodzą walidacji, są odrzucane jak dziś.

## Testy

Kolejność TDD — najpierw czerwone testy dostępności, potem silnik.

- `runner.test.js`: pauza po udanym rzucie; pauza po nieudanym bez `push`
  i bez Luck (dziś przechodzi automatem); cheat dostępny przy pierwszym
  z dwóch rzutów w jednej ramce; cheat po `sanCheck` i po `bout`; push
  niedostępny po forsowaniu; Luck niedostępne przy Sanity i Luck; `accept`
  po sukcesie idzie `onSuccess`.
- `rules.test.js`: rozdzielone `rollSanity`/`applySanityCheck` i
  `rollBout`/`applyBout` dają te same skutki co dziś dla tych samych rzutów.
- `save.test.js`: pending `rollDecision` z samym `accept`/`cheat` przechodzi
  walidację i odtwarza się po wczytaniu; pending dla `sanCheck` również.
- `ui.test.js`: panel zawiera przyjęcie i cheat przy każdym rzucie, push
  i Luck tylko gdy wolno.

## Poza zakresem

Reguły 7e dla forsowania (dane zostają wyrocznią), zmiana treści paragrafów,
zmiana wyglądu kości i osobny licznik cheatów.
