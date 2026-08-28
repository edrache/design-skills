# Plan wdrożenia — warstwa szaleństwa na grafice paragrafu

Spec: `docs/superpowers/specs/2026-08-28-madness-overlay-design.md`

Każde zadanie w TDD: najpierw test, który nie przechodzi, potem kod.
Weryfikacja całości: `npm test` w `AloneAgainstTheStatic/`.

## Zadanie 1 — moduł poziomów (`src/ui/madness.js`)

Niezależne od pozostałych.

1. `test/madness.test.js`: `madnessBase` (paragraf szaleństwa, paragraf pod
   progiem, nad progiem, wejścia śmieciowe), `pulseAt` (podkład bez zrywu,
   zryw w znanym slocie, zakres 0…1, zero przy `base = 0`, czas ujemny).
2. `src/ui/madness.js` — stałe `MADNESS_ENTRIES`, `DRIFT_FLOOR`, `DRIFT_MAX`,
   `ENTRY_BASE`, `PULSE_SLOT_MS`, `PULSE_LENGTH_MS`; funkcje `madnessBase`
   i `pulseAt` wg specyfikacji.

## Zadanie 2 — struktura DOM (`src/ui/journal.js`)

Niezależne od 1 i 3.

1. `test/ui.test.js`: `createEntryBlock` daje `figure.entry-art` z `.entry-image`
   i `.entry-madness`; `data-madness` = `"entry"` dla 330, `"drift"` dla 31;
   `dataset.image` nadal na bloku; brak grafiki → brak figury.
2. `createEntryBlock` składa figurę; błąd ładowania kadru usuwa figurę, błąd
   warstwy szaleństwa usuwa samą warstwę.

## Zadanie 3 — filtr i style (`index.html`, `style.css`)

Niezależne od 1 i 2.

1. `test/style.test.js`: `.entry-art` składa `var(--madness-filter…)`,
   `.entry-madness` ma `mix-blend-mode: screen` i `var(--madness-blend…)`,
   `prefers-reduced-motion` zeruje filtr figury. Istniejący test `.entry-image`
   ma dalej przechodzić.
2. Filtr `#madness-warp` w `index.html`, reguły `.entry-art` / `.entry-madness`
   w `style.css`, przeniesienie marginesu z `.entry-image` na figurę.

## Zadanie 4 — sterowanie (`src/ui/effects.js`)

Wymaga zadania 1 (API `madness.js`). Wykonywane po nim.

1. `test/effects.test.js`: cel `[data-madness]` dostaje `--madness-blend`
   i `--madness-filter`; poniżej progu obie znikają; `unobserveAll()` czyści.
2. Drugi zbiór obserwowanych, drugi przebieg w `tick()`, przepisanie atrybutów
   filtra, podtrzymanie pętli.

## Zadanie 5 — weryfikacja w przeglądarce

Po scaleniu 1–4: `npm test`, potem podgląd paragrafu 330 i paragrafu zwykłego
przy niskiej Poczytalności. Sprawdzić, że `mix-blend-mode` nie przecieka poza
figurę i że klatki nie siadają.
