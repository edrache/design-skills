# Lonely Patrons — Web App Design Spec

**Data:** 2026-05-17  
**Gra:** Lonely Patrons v1.2 (Designed by Pinayu / David López)  
**Cel:** Aplikacja webowa do grania w Lonely Patrons — losuje prompty, śledzi stan gry, nie zastępuje wyobraźni.

---

## 1. Wymagania

- Mobile-first, działa też na desktopie
- Dwujęzyczność EN/PL przełączana w każdej chwili bez przeładowania
- Struktura zgodna z zasadami gry z PDF (Przybycie → Pętla dzienna → Zakończenie)
- Dostęp do wszystkich wylosowanych danych + możliwość ponownego rzutu każdej tabeli
- Stan gry trwa między sesjami przeglądarki (localStorage)
- Estetyka: pergamin / papier — ciepłe beże, akcent czerwony, czcionki czytelne

---

## 2. Struktura plików

```
Lonely Patrons/
├── index.html          ← szkielet HTML; elementy UI mają data-i18n="klucz"
├── style.css           ← wszystkie style, mobile-first (max-width breakpointy)
└── js/
    ├── tables.js       ← dane tabel: { en: [...], pl: [...] } dla każdej tabeli
    ├── i18n.js         ← stringi UI: { en: {...}, pl: {...} }
    ├── game.js         ← stan gry, logika mechaniki, zapis/odczyt localStorage
    └── ui.js           ← renderowanie DOM, obsługa eventów
```

Źródłem danych do `tables.js` są pliki MD z:
- `Lonely Patrons/Tables/` — wersja angielska
- `Lonely Patrons/Tables/PL/` — wersja polska (kompletna)

---

## 3. Architektura i18n

Każdy element HTML z tekstem interfejsu: `<span data-i18n="tab.arrival">Przybycie</span>`

`i18n.js` eksportuje obiekt `I18N = { en: {...}, pl: {...} }` ze wszystkimi stringami UI.

`ui.js` eksponuje funkcję `setLanguage(lang)` która:
1. Iteruje po wszystkich elementach `[data-i18n]` i podmienia `textContent`
2. Aktualizuje `game.state.language` i zapisuje do localStorage
3. Ponownie renderuje wszystkie widoczne wyniki rzutów (z nową wersją językową tabel)

Dane tabel w `tables.js`:
```js
TABLES.season = {
  en: ["Winter", "Autumn", "Spring", "Summer"],   // indeks 0 = wynik 1
  pl: ["Zima", "Jesień", "Wiosna", "Lato"]
}

// D66 — obiekt kluczowany wynikami rzutu
TABLES.personality = {
  en: { 11: "formal", 12: "hooligan", ... },
  pl: { 11: "formalny", 12: "chuligański", ... }
}

// Tabele z zakresami (np. DELIVERY)
TABLES.delivery = {
  en: [
    { range: [2,4],  text: "It doesn't fully convince them..." },
    { range: [5,7],  text: "They appreciate it..." },
    ...
  ],
  pl: [
    { range: [2,4],  text: "Nie do końca ich to przekonuje..." },
    ...
  ]
}
```

Fallback: jeśli `pl` nie istnieje dla danej tabeli, używa `en`.

---

## 4. Stan gry (game.js)

```js
game.state = {
  language: "pl",           // "en" | "pl"
  phase: "arrival",         // "arrival" | "loop" | "ending"
  characterAge: 16,         // wiek postaci (do tabeli Important Event)
  day: 1,                   // numer aktualnego dnia w pętli
  workPoints: 30,           // aktualne WP
  improvementBonus: 0,      // 0 | 1 | 2 | 3

  landscape: {
    season: null, region: null, terrain: null,
    weather: null, house: null, knownFor: null
  },
  patron: {
    appearance: null, personality: null, nameInitials: null,
    ancestry: null, talent: null, theme1: null, theme2: null
  },

  morningSystem: null,      // wylosowany system TTRPG (raz na sesję)

  days: [
    // każdy dzień:
    {
      morning: { wpRolls: [], wpReductions: [] },
      afternoon: { activity1: null, activity2: null, chosen: null, enjoyment: null },
      night: { tone: null, topic1: null, topic2: null }
    }
  ],

  ending: {
    delivery: null, whatTheyLove: null,
    proposalRelationship: null, proposalRoll: null,
    event: null
  }
}
```

`game.save()` — serializuje do localStorage  
`game.load()` — deserializuje przy starcie  
`game.reset()` — czyści stan z potwierdzeniem (dialog)  
`game.newDay()` — dodaje wpis do `days[]`, inkrementuje `day`

---

## 5. Nawigacja

**Nagłówek (stały):**
```
[ Lonely Patrons ]                    [ EN | PL ]
```

**Zakładki dolne (stałe, 4 pozycje):**
```
[ 🏕 Przybycie ] [ ☀ Dzień N ] [ 🌙 Zakończenie ] [ 📋 Podsumowanie ]
```

- Przybycie: po zakończeniu wszystkich rzutów dostaje znacznik ✓
- Dzień N: licznik dni w etykiecie zakładki (Dzień 1, Dzień 2...)
- Zakończenie: zawsze dostępne (gracz decyduje kiedy kończy)
- Podsumowanie: widok tylko do odczytu, wszystkie wyniki w czasie

**Wewnątrz zakładki Dzień** — poziome przełączniki sub-faz:
```
[ Rano ] [ Popołudnie ] [ Noc ]
```

---

## 6. Mechanika rzutów (ui.js)

Każda tabela renderuje się jako komponent:

```html
<div class="roll-row">
  <span class="roll-label">1D4 — PORA ROKU</span>
  <button class="btn-roll" onclick="roll('season')">🎲 Rzuć</button>
  <div class="roll-result" id="result-season">
    <!-- po rzucie: -->
    <span class="result-value">Lato</span>
    <button class="btn-reroll" onclick="roll('season')">↺</button>
  </div>
</div>
```

**Specjalne rzuty:**
- **D66** — dwa osobne 1D6, konkatenacja cyfr jako klucz (np. `2` + `3` = `23`)
- **1D100** — liczba 1–100
- **2D6** — suma dwóch kości
- **WP roll** — `game.js` automatycznie dobiera kość wg aktualnych WP:
  - 20+ WP → 1D20, 12–19 WP → 1D12, 10–11 WP → 1D10,
  - 8–9 WP → 1D8, 6–7 WP → 1D6, ≤5 WP → 1D4
  - Wynik ujemny zamienia się na wartość bezwzględną (zgodnie z zasadami)

**Tracker WP (zakładka Rano):**
- Pasek postępu + licznik `18 / 30 WP`
- Przyciski `[🎲 Rzuć]` → auto-dobiera kość, odejmuje wynik od WP
- Przyciski `[+]` `[−]` do ręcznej korekty
- Gdy WP = 0: baner "Projekt ukończony! Możesz go wręczyć."

**Ulepszenie (Poprawa):**
- Dwa przyciski prób per ranek (1D6 per próba)
- Logika progresji: próba na +1 → 3+, na +2 → 4+, na +3 → 5+
- Aktualny bonus widoczny jako `Bonus: +2`

---

## 7. Zakładka Podsumowanie

Widok tylko do odczytu, przewijalny, zorganizowany chronologicznie:

```
PATRON
  Wygląd: Dojrzały · Osobowość: Marzycielski · Imię: RST... · Rodowód: Elf
  Talent: Magia/religia/kradzież
  Tematy TTRPG: Kosmiczny horror · Cyberpunk

KRAJOBRAZ
  Lato · Delta/moczary · Błoto/popiół · Mgła
  Dom: Zamek · Słynie z: Tajemnic dawnych zbrodni

SYSTEM TTRPG: OSR · Bonus ulepszenia: +2

DZIEŃ 1
  Rano: −8 WP (1D8) · −4 WP (1D4) = 18 WP
  Popołudnie: Łucznictwo / Taniec → wybrał: Łucznictwo · Satysfakcja: Było fajnie.
  Noc: Plotka · Temat: Tajemnica

DZIEŃ 2
  ...
```

Przycisk `[📋 Kopiuj]` — kopiuje podsumowanie do schowka jako tekst.

---

## 8. Floating button — 600 Przymiotników

Stały przycisk `🎲` w prawym dolnym rogu (ponad zakładkami), widoczny w każdej fazie.  
Po kliknięciu: losuje przymiotnik z tabeli 600 Adjectives, pokazuje w małym overlay/toaście.  
Overlay ma `↺ Nowy` i `✕ Zamknij`.

---

## 9. Estetyka (style.css)

**Paleta:**
```css
--bg:          #f5ede0;   /* pergamin */
--bg-card:     #eddec8;   /* karta/panel */
--border:      #d4b896;   /* obramowania */
--text:        #3d2310;   /* ciemny brąz */
--text-muted:  #8b5e3c;   /* drugorzędny */
--accent:      #c0392b;   /* czerwony akcent */
--accent-soft: #f0d0c0;   /* tło akcentu */
```

**Typografia:** systemowe fonty serif (Georgia, Times) dla nagłówków sekcji; sans-serif dla przycisków i wyników.

**Mobile-first breakpointy:**
- `< 600px` — zakładki pełna szerokość, stack pionowy
- `600–1024px` — zakładki + panel boczny
- `> 1024px` — layout dwukolumnowy: aktywna faza | podsumowanie

**Przyciski rzutów:** duże (min. 44px touch target), wyraźny kolor akcentu.

---

## 10. Zachowanie brzegowe i decyzje

- Gracz może rzucać tabele w dowolnej kolejności — app nie wymusza sekwencji w ramach fazy
- Ponowny rzut nadpisuje poprzedni wynik i aktualizuje Podsumowanie
- Wiek postaci (do Important Event) gracz wpisuje ręcznie w polu input; domyślnie 16
- Tabela Pogody (1D12) ma oznaczenie "(można rzucać codziennie)" — osobny przycisk w zakładce Rano
- Aktywność ×2 w popołudniu: dwa osobne przyciski `🎲 Rzuć 1` i `🎲 Rzuć 2`, gracz wybiera klikając na wynik
- Propozycja w Zakończeniu: dropdown z wyborem poziomu relacji (cordial/kind/excellent/super special) przed rzutem
- `game.reset()` wymaga potwierdzenia (`confirm()` lub custom modal)

---

## Źródła danych

- Tabele EN: `Lonely Patrons/Tables/*.md`
- Tabele PL: `Lonely Patrons/Tables/PL/*.md`
- Zasady gry: `PDF_input/LONELY PATRONS V12.pdf`
