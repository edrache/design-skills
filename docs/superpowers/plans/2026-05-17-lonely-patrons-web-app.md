# Lonely Patrons Web App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Statyczna aplikacja webowa do grania w Lonely Patrons — losuje prompty z tabel, śledzi stan gry (WP, dni), wyświetla podsumowanie sesji, działa po polsku i angielsku.

**Architecture:** Cztery pliki JS z globalnymi zmiennymi (bez bundlera): `tables.js` → `i18n.js` → `game.js` → `ui.js`. Stan gry w `localStorage`. Mobile-first, estetyka pergaminu.

**Tech Stack:** Vanilla HTML/CSS/JavaScript (ES5+), localStorage, bez frameworków ani build tools.

**Spec:** `docs/superpowers/specs/2026-05-17-lonely-patrons-web-app-design.md`

---

## Struktura plików

```
Lonely Patrons/
├── index.html
├── style.css
└── js/
    ├── tables.js    ← dane tabel EN+PL (generowane z MD — patrz Task 1)
    ├── i18n.js      ← stringi interfejsu EN+PL
    ├── game.js      ← stan gry, mechanika, localStorage
    └── ui.js        ← renderowanie, eventy
```

Kolejność `<script>` w HTML: `tables.js` → `i18n.js` → `game.js` → `ui.js`.

---

## Task 1: tables.js — dane tabel

**Files:**
- Create: `Lonely Patrons/js/tables.js`
- Source EN: `Lonely Patrons/Tables/*.md`
- Source PL: `Lonely Patrons/Tables/PL/*.md`

### Jak wygenerować dane z plików MD

Każdy plik MD ma tabelę Markdown. Przeczytaj oba pliki (EN + PL) dla każdej tabeli i przepisz dane do struktury JS.

Dla każdej tabeli format to:
```js
TABLES.kluczTabeli = {
  label: { en: "NAZWA EN", pl: "NAZWA PL" },
  type: "d4",  // typ rzutu — patrz niżej
  en: [...],   // dane EN
  pl: [...]    // dane PL
};
```

**Typy tabel i format danych:**

| Typ | Opis | Format `en`/`pl` |
|-----|------|-----------------|
| `d4`, `d6`, `d8`, `d12`, `d20`, `d100` | Tablica indeksowana od 1 | `[null, "wynik1", "wynik2", ...]` (null na index 0) |
| `d66` | Dwie kości d6, wyniki jako klucze (11–66) | `{ 11: "wynik", 12: "wynik", ... }` |
| `2d6` | Zakresy wyników | `[{min:2, max:4, text:"..."}, ...]` |
| `2d6-simple` | Prosta tabela z rzutem 2D6 | `[null, null, {text:"..."}, ...]` (index = wynik) |
| `age` | Klucze to wiek postaci (17–80) | `{ 17: "wynik", 18: "wynik", ..., 80: "wynik" }` |
| `adjective` | Specjalny — patrz niżej | Obiekt `{ 100: "wynik", 101: "wynik", ..., 699: "wynik" }` |

**Lista kluczy i ich pliki MD:**

```
TABLES.season          ← 1D4 - SEASON.md
TABLES.region          ← D66 - NATURE OF THE REGION.md
TABLES.terrain         ← 1D8 - PREDOMINANT TERRAIN.md
TABLES.weather         ← 1D12 - WEATHER.md
TABLES.patronHouse     ← 1D20 - PATRON'S HOUSE.md
TABLES.regionKnownFor  ← 1D100 - REGION KNOWN FOR.md
TABLES.appearance      ← 1D4 - APPEARANCE.md
TABLES.personality     ← D66 - PERSONALITY.md
TABLES.nameInitials    ← 1D8 - NAME.md
TABLES.ancestry        ← 1D12 - ANCESTRY.md   (uwaga: wyniki 1-3 → jeden wpis)
TABLES.talent          ← 1D20 - TALENT.md
TABLES.ttrpgThemes     ← 1D100 - TTRPG THEMES.md
TABLES.system          ← SYSTEM.md
TABLES.activities      ← AFTERNOON - ACTIVITIES.md
TABLES.enjoyment       ← YOUR ENJOYMENT.md
TABLES.tone            ← TONE.md
TABLES.topic           ← TOPIC.md
TABLES.delivery        ← DELIVERY.md         (type: "2d6", zakresowy)
TABLES.whatTheyLove    ← DELIVERY.md         (sekcja "Co najbardziej kochają")
TABLES.proposal        ← PROPOSAL.md         (type: "2d6", zakresowy)
TABLES.importantEvent  ← IMPORTANT EVENT.md  (type: "age")
TABLES.adjectives      ← 600 ADJECTIVES.md   (type: "adjective", klucze 100–699)
```

**Uwagi szczególne:**
- `ancestry`: wyniki `1-3` to jeden wpis `"human"/"człowiek"` — przy rzucie 1, 2 lub 3 użyj tego samego tekstu
- `delivery` i `proposal`: zakresowe — `[{min:2, max:4, text:"..."}, {min:5, max:7, text:"..."}, ...]`
- `adjectives` (600): obiekt `{ 100: "strong", 101: "fragile", ... 699: "atypical" }` — klucze to liczby 100–699
- `importantEvent`: klucze 17–79 to konkretne wpisy; klucz `80` obsługuje `80+`
- Przy brakującym tłumaczeniu PL — użyj wartości EN jako fallback

**Szablon pliku:**

```js
// js/tables.js
// Dane wygenerowane z Lonely Patrons/Tables/ (EN) i Tables/PL/ (PL)
var TABLES = {};

TABLES.season = {
  label: { en: "1D4 — SEASON", pl: "1D4 — PORA ROKU" },
  type: "d4",
  en: [null, "Winter", "Autumn", "Spring", "Summer"],
  pl: [null, "Zima", "Jesień", "Wiosna", "Lato"]
};

// ... pozostałe tabele według wzorca powyżej
```

- [ ] Przeczytaj wszystkie 23 pary plików MD (EN + PL) z folderów `Tables/` i `Tables/PL/`
- [ ] Stwórz `js/tables.js` z kompletem danych dla wszystkich tabel według wzorców powyżej
- [ ] Otwórz `index.html` w przeglądarce, wpisz w konsoli: `console.log(Object.keys(TABLES).length)` — oczekiwany wynik: `23`
- [ ] Sprawdź: `console.log(TABLES.season.pl[3])` → `"Wiosna"`
- [ ] Sprawdź: `console.log(TABLES.adjectives[602])` → `"robotic"` (EN)
- [ ] Commit: `git add "Lonely Patrons/js/tables.js" && git commit -m "feat: add tables.js with all EN+PL table data"`

---

## Task 2: i18n.js — stringi interfejsu

**Files:**
- Create: `Lonely Patrons/js/i18n.js`

- [ ] Stwórz `js/i18n.js` z poniższą zawartością:

```js
// js/i18n.js
var I18N = {
  en: {
    // Tabs
    "tab.arrival":     "Arrival",
    "tab.day":         "Day",
    "tab.ending":      "Ending",
    "tab.summary":     "Summary",

    // Arrival sections
    "section.landscape": "Landscape",
    "section.patron":    "Patron",

    // Day sub-tabs
    "subtab.morning":   "Morning",
    "subtab.afternoon": "Afternoon",
    "subtab.night":     "Night",

    // Buttons
    "btn.roll":         "🎲 Roll",
    "btn.reroll":       "↺",
    "btn.newDay":       "New Day →",
    "btn.newSession":   "New Session",
    "btn.copy":         "📋 Copy",
    "btn.adjective":    "🎲",
    "btn.rollWp":       "🎲 Roll (reduce WP)",
    "btn.rollActivity1":"🎲 Roll 1",
    "btn.rollActivity2":"🎲 Roll 2",

    // WP tracker
    "wp.label":        "Work Points",
    "wp.complete":     "Design complete! You can deliver it.",

    // Improvement
    "improvement.label":  "Improvement bonus",
    "improvement.try":    "Try improvement",

    // Afternoon
    "afternoon.choose":   "Choose one:",

    // Ending
    "ending.relationship.cordial":  "Cordial (+0)",
    "ending.relationship.kind":     "Kind (+1)",
    "ending.relationship.excellent":"Excellent (+2)",
    "ending.relationship.special":  "Super special (+3)",
    "ending.age.label":             "Character's age:",

    // Adjective overlay
    "adj.title":   "Adjective",
    "adj.new":     "↺ New",
    "adj.close":   "✕ Close",

    // Summary
    "summary.patron":    "Patron",
    "summary.landscape": "Landscape",
    "summary.system":    "TTRPG System",
    "summary.bonus":     "Improvement bonus",
    "summary.day":       "Day",
    "summary.morning":   "Morning",
    "summary.afternoon": "Afternoon",
    "summary.night":     "Night",
    "summary.ending":    "Ending",
    "summary.empty":     "No data yet. Start rolling!",

    // New session confirm
    "confirm.newSession": "Start a new session? All current data will be lost.",

    // Arrival done badge
    "arrival.done": "✓ Done"
  },
  pl: {
    "tab.arrival":     "Przybycie",
    "tab.day":         "Dzień",
    "tab.ending":      "Zakończenie",
    "tab.summary":     "Podsumowanie",

    "section.landscape": "Krajobraz",
    "section.patron":    "Patron",

    "subtab.morning":   "Rano",
    "subtab.afternoon": "Popołudnie",
    "subtab.night":     "Noc",

    "btn.roll":         "🎲 Rzuć",
    "btn.reroll":       "↺",
    "btn.newDay":       "Nowy dzień →",
    "btn.newSession":   "Nowa sesja",
    "btn.copy":         "📋 Kopiuj",
    "btn.adjective":    "🎲",
    "btn.rollWp":       "🎲 Rzuć (zredukuj WP)",
    "btn.rollActivity1":"🎲 Rzuć 1",
    "btn.rollActivity2":"🎲 Rzuć 2",

    "wp.label":        "Punkty Pracy",
    "wp.complete":     "Projekt ukończony! Możesz go wręczyć.",

    "improvement.label":  "Bonus ulepszenia",
    "improvement.try":    "Próba ulepszenia",

    "afternoon.choose":   "Wybierz jedną:",

    "ending.relationship.cordial":  "Serdeczna (+0)",
    "ending.relationship.kind":     "Życzliwa (+1)",
    "ending.relationship.excellent":"Doskonała (+2)",
    "ending.relationship.special":  "Wyjątkowa (+3)",
    "ending.age.label":             "Wiek postaci:",

    "adj.title":   "Przymiotnik",
    "adj.new":     "↺ Nowy",
    "adj.close":   "✕ Zamknij",

    "summary.patron":    "Patron",
    "summary.landscape": "Krajobraz",
    "summary.system":    "System TTRPG",
    "summary.bonus":     "Bonus ulepszenia",
    "summary.day":       "Dzień",
    "summary.morning":   "Rano",
    "summary.afternoon": "Popołudnie",
    "summary.night":     "Noc",
    "summary.ending":    "Zakończenie",
    "summary.empty":     "Brak danych. Zacznij rzucać!",

    "confirm.newSession": "Zacząć nową sesję? Wszystkie dane zostaną utracone.",

    "arrival.done": "✓ Gotowe"
  }
};

function t(key) {
  var lang = (window.Game && Game.state.language) || "pl";
  return (I18N[lang] && I18N[lang][key]) || I18N["en"][key] || key;
}
```

- [ ] Sprawdź w konsoli: `t("tab.arrival")` → `"Przybycie"` (przy domyślnym lang=pl)
- [ ] Commit: `git add "Lonely Patrons/js/i18n.js" && git commit -m "feat: add i18n.js with EN/PL UI strings"`

---

## Task 3: game.js — stan gry i mechanika

**Files:**
- Create: `Lonely Patrons/js/game.js`

- [ ] Stwórz `js/game.js` z poniższą zawartością:

```js
// js/game.js
var Game = {

  defaultState: function() {
    return {
      language: "pl",
      phase: "arrival",
      characterAge: 16,
      day: 1,
      workPoints: 30,
      improvementBonus: 0,
      improvementAttemptsToday: 0,
      landscape: {
        season: null, region: null, terrain: null,
        weather: null, house: null, knownFor: null
      },
      patron: {
        appearance: null, personality: null, nameInitials: null,
        ancestry: null, talent: null, theme1: null, theme2: null
      },
      morningSystem: null,
      days: [],
      ending: {
        delivery: null, deliveryRoll: null,
        whatTheyLove: null, proposalRelationship: 0,
        proposalRoll: null, event: null
      }
    };
  },

  state: null,

  init: function() {
    var saved = localStorage.getItem("lonely-patrons-state");
    if (saved) {
      try { this.state = JSON.parse(saved); }
      catch(e) { this.state = this.defaultState(); }
    } else {
      this.state = this.defaultState();
    }
  },

  save: function() {
    localStorage.setItem("lonely-patrons-state", JSON.stringify(this.state));
  },

  reset: function() {
    this.state = this.defaultState();
    this.save();
  },

  // Rzut kością n-ścienną (1..n)
  rollDie: function(n) {
    return Math.floor(Math.random() * n) + 1;
  },

  // D66: dwa d6, konkatenacja → klucz 11-66
  rollD66: function() {
    return this.rollDie(6) * 10 + this.rollDie(6);
  },

  // 2D6: suma
  roll2D6: function() {
    return this.rollDie(6) + this.rollDie(6);
  },

  // Auto-dobór kości wg aktualnych WP
  wpRollDie: function() {
    var wp = this.state.workPoints;
    var sides = wp >= 20 ? 20 : wp >= 12 ? 12 : wp >= 10 ? 10 : wp >= 8 ? 8 : wp >= 6 ? 6 : 4;
    return { sides: sides, result: this.rollDie(sides) };
  },

  // Redukcja WP (wynik ujemny → wartość bezwzględna)
  reduceWP: function(amount) {
    var newWP = this.state.workPoints - amount;
    if (newWP < 0) newWP = Math.abs(newWP);
    this.state.workPoints = newWP;
    this.save();
    return newWP;
  },

  // Pobierz wynik z tabeli wg klucza i aktualnego języka
  getResult: function(tableKey, rollValue) {
    var lang = this.state.language;
    var table = TABLES[tableKey];
    if (!table) return "?";
    var data = table[lang] || table["en"];

    if (table.type === "d66") {
      return data[rollValue] || "?";
    }
    if (table.type === "2d6") {
      for (var i = 0; i < data.length; i++) {
        var entry = data[i];
        if (rollValue >= entry.min && rollValue <= entry.max) return entry.text;
      }
      return "?";
    }
    if (table.type === "age") {
      return data[rollValue] || data[80] || "?";
    }
    if (table.type === "adjective") {
      return data[rollValue] || "?";
    }
    // Zwykłe tablice (d4, d6, d8, d12, d20, d100)
    return data[rollValue] || "?";
  },

  // Rzut przymiotnika (600 adjectives): 1D6×100 + (1D10%10)×10 + (1D10%10)
  rollAdjective: function() {
    var hundreds = this.rollDie(6) * 100;
    var tens = (this.rollDie(10) % 10) * 10;
    var units = this.rollDie(10) % 10;
    var num = hundreds + tens + units;
    return { number: num, text: this.getResult("adjectives", num) };
  },

  // Próba ulepszenia (improvement): max 2 próby dziennie
  tryImprovement: function() {
    if (this.state.improvementAttemptsToday >= 2) return null;
    var bonus = this.state.improvementBonus;
    var roll = this.rollDie(6);
    var threshold = bonus === 0 ? 3 : bonus === 1 ? 4 : 5;
    var success = roll >= threshold;
    this.state.improvementAttemptsToday += 1;
    if (success && bonus < 3) this.state.improvementBonus += 1;
    this.save();
    return { roll: roll, threshold: threshold, success: success, newBonus: this.state.improvementBonus };
  },

  // Nowy dzień: zapisuje aktualny dzień, resetuje próby ulepszenia
  newDay: function() {
    this.state.day += 1;
    this.state.improvementAttemptsToday = 0;
    this.save();
  },

  // Zapisz wynik rzutu w stanie gry
  setResult: function(path, value) {
    // path np. "landscape.season" lub "patron.theme1"
    var parts = path.split(".");
    var obj = this.state;
    for (var i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    this.save();
  }
};

Game.init();
```

- [ ] Sprawdź w konsoli: `Game.rollDie(6)` → liczba 1–6
- [ ] Sprawdź: `Game.wpRollDie()` przy `Game.state.workPoints = 15` → `{ sides: 12, result: X }`
- [ ] Sprawdź: `Game.getResult("season", 3)` → `"Wiosna"` (przy lang=pl)
- [ ] Sprawdź: `Game.rollAdjective()` → `{ number: NNN, text: "..." }`
- [ ] Commit: `git add "Lonely Patrons/js/game.js" && git commit -m "feat: add game.js with state management and roll mechanics"`

---

## Task 4: index.html — szkielet HTML

**Files:**
- Create: `Lonely Patrons/index.html`

- [ ] Stwórz `Lonely Patrons/index.html`:

```html
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lonely Patrons</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <!-- NAGŁÓWEK -->
  <header id="app-header">
    <span class="header-title">Lonely Patrons</span>
    <div class="lang-toggle">
      <button id="btn-lang-en" class="lang-btn" onclick="UI.setLanguage('en')">EN</button>
      <span>|</span>
      <button id="btn-lang-pl" class="lang-btn" onclick="UI.setLanguage('pl')">PL</button>
    </div>
    <button id="btn-new-session" onclick="UI.confirmNewSession()">
      <span data-i18n="btn.newSession">Nowa sesja</span>
    </button>
  </header>

  <!-- GŁÓWNA ZAWARTOŚĆ ZAKŁADEK -->
  <main id="tab-content">

    <!-- TAB: PRZYBYCIE -->
    <section id="tab-arrival" class="tab-panel">
      <div class="section-header">
        <h2 data-i18n="section.landscape">Krajobraz</h2>
      </div>
      <div id="rolls-landscape" class="rolls-group"></div>

      <div class="section-header">
        <h2 data-i18n="section.patron">Patron</h2>
      </div>
      <div id="rolls-patron" class="rolls-group"></div>
    </section>

    <!-- TAB: DZIEŃ -->
    <section id="tab-day" class="tab-panel hidden">
      <div class="subtabs">
        <button class="subtab-btn active" data-subtab="morning" onclick="UI.showSubtab('morning')">
          <span data-i18n="subtab.morning">Rano</span>
        </button>
        <button class="subtab-btn" data-subtab="afternoon" onclick="UI.showSubtab('afternoon')">
          <span data-i18n="subtab.afternoon">Popołudnie</span>
        </button>
        <button class="subtab-btn" data-subtab="night" onclick="UI.showSubtab('night')">
          <span data-i18n="subtab.night">Noc</span>
        </button>
      </div>

      <!-- Rano -->
      <div id="subtab-morning" class="subtab-panel">
        <div id="wp-tracker"></div>
        <div id="rolls-morning" class="rolls-group"></div>
        <div id="improvement-section"></div>
        <button class="btn-secondary" onclick="UI.newDay()">
          <span data-i18n="btn.newDay">Nowy dzień →</span>
        </button>
      </div>

      <!-- Popołudnie -->
      <div id="subtab-afternoon" class="subtab-panel hidden">
        <div id="rolls-afternoon" class="rolls-group"></div>
      </div>

      <!-- Noc -->
      <div id="subtab-night" class="subtab-panel hidden">
        <div id="rolls-night" class="rolls-group"></div>
      </div>
    </section>

    <!-- TAB: ZAKOŃCZENIE -->
    <section id="tab-ending" class="tab-panel hidden">
      <div id="rolls-ending" class="rolls-group"></div>
    </section>

    <!-- TAB: PODSUMOWANIE -->
    <section id="tab-summary" class="tab-panel hidden">
      <div id="summary-content"></div>
      <button class="btn-secondary" onclick="UI.copySummary()">
        <span data-i18n="btn.copy">📋 Kopiuj</span>
      </button>
    </section>

  </main>

  <!-- DOLNA NAWIGACJA -->
  <nav id="bottom-nav">
    <button class="nav-btn active" data-tab="arrival" onclick="UI.showTab('arrival')">
      <span class="nav-icon">🏕</span>
      <span class="nav-label" data-i18n="tab.arrival">Przybycie</span>
    </button>
    <button class="nav-btn" data-tab="day" onclick="UI.showTab('day')">
      <span class="nav-icon">☀</span>
      <span class="nav-label" id="day-tab-label">Dzień 1</span>
    </button>
    <button class="nav-btn" data-tab="ending" onclick="UI.showTab('ending')">
      <span class="nav-icon">🌙</span>
      <span class="nav-label" data-i18n="tab.ending">Zakończenie</span>
    </button>
    <button class="nav-btn" data-tab="summary" onclick="UI.showTab('summary')">
      <span class="nav-icon">📋</span>
      <span class="nav-label" data-i18n="tab.summary">Podsumowanie</span>
    </button>
  </nav>

  <!-- FLOATING: PRZYMIOTNIK -->
  <button id="btn-adj-float" onclick="UI.openAdjectiveOverlay()">
    <span data-i18n="btn.adjective">🎲</span>
  </button>

  <!-- OVERLAY: PRZYMIOTNIK -->
  <div id="adj-overlay" class="overlay hidden">
    <div class="overlay-card">
      <div class="overlay-title" data-i18n="adj.title">Przymiotnik</div>
      <div id="adj-result" class="overlay-result">—</div>
      <div id="adj-number" class="overlay-number"></div>
      <div class="overlay-actions">
        <button onclick="UI.rollAdjective()" data-i18n="adj.new">↺ Nowy</button>
        <button onclick="UI.closeAdjectiveOverlay()" data-i18n="adj.close">✕ Zamknij</button>
      </div>
    </div>
  </div>

  <script src="js/tables.js"></script>
  <script src="js/i18n.js"></script>
  <script src="js/game.js"></script>
  <script src="js/ui.js"></script>
</body>
</html>
```

- [ ] Otwórz plik w przeglądarce — strona powinna załadować się bez błędów JS w konsoli (ignoruj "UI is not defined" — ui.js jeszcze nie istnieje)
- [ ] Commit: `git add "Lonely Patrons/index.html" && git commit -m "feat: add index.html skeleton"`

---

## Task 5: style.css — style mobile-first

**Files:**
- Create: `Lonely Patrons/style.css`

- [ ] Stwórz `Lonely Patrons/style.css`:

```css
/* ===== ZMIENNE ===== */
:root {
  --bg:          #f5ede0;
  --bg-card:     #eddec8;
  --border:      #d4b896;
  --text:        #3d2310;
  --text-muted:  #8b5e3c;
  --accent:      #c0392b;
  --accent-soft: #f0d0c0;
  --accent-bg:   #fff8ee;
  --nav-height:  60px;
  --header-height: 52px;
}

/* ===== RESET I BASE ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 16px;
  line-height: 1.5;
}
button { cursor: pointer; font-family: inherit; }
.hidden { display: none !important; }

/* ===== NAGŁÓWEK ===== */
#app-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--header-height);
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  z-index: 100;
}
.header-title {
  font-family: Georgia, serif;
  font-weight: bold;
  font-size: 18px;
  flex: 1;
  color: var(--accent);
}
.lang-toggle { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-muted); }
.lang-btn {
  background: none;
  border: none;
  font-size: 13px;
  color: var(--text-muted);
  padding: 2px 4px;
  border-radius: 4px;
}
.lang-btn.active { color: var(--accent); font-weight: bold; background: var(--accent-soft); }
#btn-new-session {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-muted);
}

/* ===== GŁÓWNA ZAWARTOŚĆ ===== */
#tab-content {
  position: fixed;
  top: var(--header-height);
  bottom: var(--nav-height);
  left: 0; right: 0;
  overflow-y: auto;
  padding: 16px 12px;
}

/* ===== SEKCJE ZAKŁADEK ===== */
.section-header { margin: 16px 0 8px; }
.section-header h2 {
  font-family: Georgia, serif;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--accent);
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}

/* ===== SUB-ZAKŁADKI (Rano/Popołudnie/Noc) ===== */
.subtabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}
.subtab-btn {
  flex: 1;
  padding: 8px 4px;
  background: none;
  border: none;
  font-size: 14px;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.subtab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: bold;
}

/* ===== RZĄD RZUTU ===== */
.roll-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.roll-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex: 1;
  min-width: 120px;
}
.btn-roll, .btn-reroll {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 14px;
  min-height: 36px;
  min-width: 44px;
}
.btn-reroll {
  background: var(--bg-card);
  color: var(--text-muted);
  border: 1px solid var(--border);
  padding: 6px 8px;
}
.roll-result {
  display: flex;
  align-items: center;
  gap: 6px;
}
.result-value {
  background: var(--accent-bg);
  border: 1px solid var(--accent-soft);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 15px;
  font-weight: bold;
  color: var(--text);
}

/* ===== WP TRACKER ===== */
#wp-tracker {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}
.wp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.wp-count { font-size: 22px; font-weight: bold; color: var(--accent); }
.wp-bar-bg {
  height: 8px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}
.wp-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.3s;
}
.wp-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.wp-adj-btn {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--text);
  min-height: 36px;
}
.wp-complete {
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--accent);
  margin-top: 8px;
  text-align: center;
}

/* ===== ULEPSZENIE (Improvement) ===== */
#improvement-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  margin: 12px 0;
}
.improvement-header {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.improvement-bonus {
  font-size: 20px;
  font-weight: bold;
  color: var(--accent);
  margin-bottom: 8px;
}
.improvement-log { font-size: 13px; color: var(--text-muted); margin-top: 6px; }

/* ===== AKTYWNOŚCI (wybór) ===== */
.activities-choice {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.activity-option {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  flex: 1;
  min-width: 120px;
  text-align: center;
}
.activity-option.chosen {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: bold;
}

/* ===== ZAKOŃCZENIE - relacja ===== */
.relationship-select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text);
  font-size: 14px;
  margin-bottom: 8px;
}
.age-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text);
  font-size: 14px;
}

/* ===== PODSUMOWANIE ===== */
#summary-content {
  font-size: 14px;
  line-height: 1.7;
}
.summary-section { margin-bottom: 16px; }
.summary-section-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.summary-value { color: var(--text); }
.summary-empty { color: var(--text-muted); font-style: italic; }

/* ===== PRZYCISK SEKUNDARNY ===== */
.btn-secondary {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  color: var(--text);
  margin-top: 16px;
  min-height: 44px;
}

/* ===== DOLNA NAWIGACJA ===== */
#bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: var(--nav-height);
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  display: flex;
  z-index: 100;
}
.nav-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  font-size: 10px;
  color: var(--text-muted);
  gap: 2px;
  padding: 4px;
}
.nav-btn.active { color: var(--accent); }
.nav-icon { font-size: 20px; line-height: 1; }
.nav-label { font-size: 11px; }

/* ===== FLOATING BUTTON ===== */
#btn-adj-float {
  position: fixed;
  bottom: calc(var(--nav-height) + 12px);
  right: 12px;
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  border: none;
  font-size: 22px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== OVERLAY PRZYMIOTNIKA ===== */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.overlay-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  min-width: 240px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,0.2);
}
.overlay-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.overlay-result {
  font-size: 28px;
  font-weight: bold;
  color: var(--text);
  margin-bottom: 4px;
  font-family: Georgia, serif;
}
.overlay-number { font-size: 12px; color: var(--text-muted); margin-bottom: 16px; }
.overlay-actions { display: flex; gap: 8px; justify-content: center; }
.overlay-actions button {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  color: var(--text);
  min-height: 44px;
}

/* ===== DESKTOP (600px+) ===== */
@media (min-width: 600px) {
  #tab-content { padding: 20px 24px; max-width: 640px; margin: 0 auto; }
  .roll-label { min-width: 180px; }
}

/* ===== DESKTOP WIDE (1024px+) ===== */
@media (min-width: 1024px) {
  #tab-content {
    max-width: 1000px;
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 24px;
    align-items: start;
  }
  .tab-panel { grid-column: 1; }
  #tab-summary { grid-column: 2; display: block !important; position: sticky; top: 0; }
}
```

- [ ] Odśwież stronę — widać nagłówek, dolną nawigację, brak błędów layout
- [ ] Sprawdź na telefonie (DevTools → mobile emulation) — nawigacja u dołu, treść przewijalna
- [ ] Commit: `git add "Lonely Patrons/style.css" && git commit -m "feat: add style.css parchment theme mobile-first"`

---

## Task 6: ui.js — rdzeń: język, zakładki, komponent rzutu

**Files:**
- Create: `Lonely Patrons/js/ui.js`

- [ ] Stwórz `Lonely Patrons/js/ui.js` z poniższą zawartością (cały plik — kolejne taski rozbudują go):

```js
// js/ui.js
var UI = {

  // ===== JĘZYK =====
  setLanguage: function(lang) {
    Game.state.language = lang;
    Game.save();
    // Zaktualizuj przyciski lang
    document.getElementById("btn-lang-en").classList.toggle("active", lang === "en");
    document.getElementById("btn-lang-pl").classList.toggle("active", lang === "pl");
    // Podmień wszystkie data-i18n
    document.querySelectorAll("[data-i18n]").forEach(function(el) {
      var key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    // Przerenderuj aktywną zakładkę (wyniki rzutów w nowym języku)
    UI.renderActiveTab();
    // Aktualizuj etykietę dnia
    UI.updateDayLabel();
  },

  // ===== ZAKŁADKI =====
  showTab: function(tabName) {
    document.querySelectorAll(".tab-panel").forEach(function(el) {
      el.classList.add("hidden");
    });
    document.querySelectorAll(".nav-btn").forEach(function(el) {
      el.classList.remove("active");
    });
    var panel = document.getElementById("tab-" + tabName);
    if (panel) panel.classList.remove("hidden");
    var btn = document.querySelector(".nav-btn[data-tab='" + tabName + "']");
    if (btn) btn.classList.add("active");
    UI.currentTab = tabName;
    UI.renderActiveTab();
  },

  currentTab: "arrival",
  currentSubtab: "morning",

  showSubtab: function(name) {
    document.querySelectorAll(".subtab-panel").forEach(function(el) {
      el.classList.add("hidden");
    });
    document.querySelectorAll(".subtab-btn").forEach(function(el) {
      el.classList.remove("active");
    });
    var panel = document.getElementById("subtab-" + name);
    if (panel) panel.classList.remove("hidden");
    var btn = document.querySelector(".subtab-btn[data-subtab='" + name + "']");
    if (btn) btn.classList.add("active");
    UI.currentSubtab = name;
  },

  renderActiveTab: function() {
    var tab = UI.currentTab;
    if (tab === "arrival")  UI.renderArrival();
    if (tab === "day")      UI.renderDay();
    if (tab === "ending")   UI.renderEnding();
    if (tab === "summary")  UI.renderSummary();
  },

  updateDayLabel: function() {
    var el = document.getElementById("day-tab-label");
    if (el) el.textContent = t("tab.day") + " " + Game.state.day;
  },

  // ===== KOMPONENT RZUTU =====
  // Tworzy rząd: etykieta | przycisk rzutu | wynik + re-roll
  makeRollRow: function(tableKey, statePath, rollFn) {
    var table = TABLES[tableKey];
    var lang = Game.state.language;
    var label = table.label[lang] || table.label["en"];

    // Pobierz istniejący wynik z state
    var existing = UI.getStateValue(statePath);

    var row = document.createElement("div");
    row.className = "roll-row";
    row.id = "row-" + tableKey;

    var labelEl = document.createElement("span");
    labelEl.className = "roll-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);

    var resultDiv = document.createElement("div");
    resultDiv.className = "roll-result";
    resultDiv.id = "result-" + tableKey;

    if (existing) {
      resultDiv.innerHTML = UI.makeResultHTML(tableKey, existing);
    } else {
      var rollBtn = document.createElement("button");
      rollBtn.className = "btn-roll";
      rollBtn.textContent = t("btn.roll");
      rollBtn.onclick = function() { rollFn(); };
      resultDiv.appendChild(rollBtn);
    }

    row.appendChild(resultDiv);
    return row;
  },

  makeResultHTML: function(tableKey, rollValue) {
    var text = Game.getResult(tableKey, rollValue);
    return '<span class="result-value">' + text + '</span>' +
           '<button class="btn-reroll" onclick="UI.reroll(\'' + tableKey + '\')">' + t("btn.reroll") + '</button>';
  },

  reroll: function(tableKey) {
    // Znajdź statePath i rollFn z konfiguracji
    var cfg = UI.rollConfig[tableKey];
    if (cfg) cfg.rollFn();
  },

  getStateValue: function(path) {
    if (!path) return null;
    var parts = path.split(".");
    var obj = Game.state;
    for (var i = 0; i < parts.length; i++) {
      if (obj == null) return null;
      obj = obj[parts[i]];
    }
    return obj;
  },

  updateResult: function(tableKey, rollValue, statePath) {
    if (statePath) Game.setResult(statePath, rollValue);
    var resultDiv = document.getElementById("result-" + tableKey);
    if (resultDiv) resultDiv.innerHTML = UI.makeResultHTML(tableKey, rollValue);
    UI.renderSummaryIfVisible();
  },

  renderSummaryIfVisible: function() {
    if (UI.currentTab === "summary") UI.renderSummary();
  },

  // ===== NOWA SESJA =====
  confirmNewSession: function() {
    if (confirm(t("confirm.newSession"))) {
      Game.reset();
      UI.renderActiveTab();
      UI.showTab("arrival");
      UI.updateDayLabel();
    }
  },

  // ===== NOWY DZIEŃ =====
  newDay: function() {
    Game.newDay();
    UI.updateDayLabel();
    UI.renderDay();
  },

  // Konfiguracja rzutów (wypełniana przez renderArrival/renderDay/renderEnding)
  rollConfig: {},

  // ===== OVERLAY PRZYMIOTNIKA =====
  openAdjectiveOverlay: function() {
    document.getElementById("adj-overlay").classList.remove("hidden");
    UI.rollAdjective();
  },
  closeAdjectiveOverlay: function() {
    document.getElementById("adj-overlay").classList.add("hidden");
  },
  rollAdjective: function() {
    var r = Game.rollAdjective();
    document.getElementById("adj-result").textContent = r.text;
    document.getElementById("adj-number").textContent = "#" + r.number;
  },

  // ===== INIT =====
  init: function() {
    // Ustaw język z state
    var lang = Game.state.language || "pl";
    UI.setLanguage(lang);
    UI.showTab("arrival");
    UI.updateDayLabel();
  }
};

// Uruchom po załadowaniu DOM
document.addEventListener("DOMContentLoaded", function() { UI.init(); });
```

- [ ] Otwórz stronę — nagłówek widoczny, zakładki działają, brak błędów JS
- [ ] Kliknij EN — etykiety zmieniają się na angielskie
- [ ] Kliknij PL — etykiety wracają do polskich
- [ ] Commit: `git add "Lonely Patrons/js/ui.js" && git commit -m "feat: add ui.js core — language switch, tabs, roll component"`

---

## Task 7: ui.js — zakładka Przybycie

**Files:**
- Modify: `Lonely Patrons/js/ui.js`

Dodaj do obiektu `UI` (przed `init`) następujące metody:

- [ ] Dodaj `rollConfig` i `renderArrival` do `UI`:

```js
  // Konfiguracja rzutów — tableKey → { statePath, rollFn }
  rollConfig: {},

  renderArrival: function() {
    var lang = Game.state.language;

    // --- KRAJOBRAZ ---
    var landscapeGroup = document.getElementById("rolls-landscape");
    landscapeGroup.innerHTML = "";

    function makeRoll(tableKey, statePath, rollFn) {
      UI.rollConfig[tableKey] = { statePath: statePath, rollFn: rollFn };
      return UI.makeRollRow(tableKey, statePath, rollFn);
    }

    landscapeGroup.appendChild(makeRoll("season", "landscape.season", function() {
      UI.updateResult("season", Game.rollDie(4), "landscape.season");
    }));
    landscapeGroup.appendChild(makeRoll("region", "landscape.region", function() {
      UI.updateResult("region", Game.rollD66(), "landscape.region");
    }));
    landscapeGroup.appendChild(makeRoll("terrain", "landscape.terrain", function() {
      UI.updateResult("terrain", Game.rollDie(8), "landscape.terrain");
    }));
    landscapeGroup.appendChild(makeRoll("weather", "landscape.weather", function() {
      UI.updateResult("weather", Game.rollDie(12), "landscape.weather");
    }));
    landscapeGroup.appendChild(makeRoll("patronHouse", "landscape.house", function() {
      UI.updateResult("patronHouse", Game.rollDie(20), "landscape.house");
    }));
    landscapeGroup.appendChild(makeRoll("regionKnownFor", "landscape.knownFor", function() {
      var roll = Game.rollDie(100);
      if (roll >= 95) roll = 95; // 95+ → jeden wynik
      UI.updateResult("regionKnownFor", roll, "landscape.knownFor");
    }));

    // --- PATRON ---
    var patronGroup = document.getElementById("rolls-patron");
    patronGroup.innerHTML = "";

    patronGroup.appendChild(makeRoll("appearance", "patron.appearance", function() {
      UI.updateResult("appearance", Game.rollDie(4), "patron.appearance");
    }));
    patronGroup.appendChild(makeRoll("personality", "patron.personality", function() {
      UI.updateResult("personality", Game.rollD66(), "patron.personality");
    }));
    patronGroup.appendChild(makeRoll("nameInitials", "patron.nameInitials", function() {
      UI.updateResult("nameInitials", Game.rollDie(8), "patron.nameInitials");
    }));
    patronGroup.appendChild(makeRoll("ancestry", "patron.ancestry", function() {
      var roll = Game.rollDie(12);
      var r = roll <= 3 ? 1 : roll; // 1-3 → wspólny wynik na index 1
      UI.updateResult("ancestry", r, "patron.ancestry");
    }));
    patronGroup.appendChild(makeRoll("talent", "patron.talent", function() {
      UI.updateResult("talent", Game.rollDie(20), "patron.talent");
    }));
    patronGroup.appendChild(makeRoll("ttrpgThemes", "patron.theme1", function() {
      var r1 = Game.rollDie(100);
      var r2 = Game.rollDie(100);
      // Zapisz oba tematy; wyświetl połączone w jednym wyniku
      Game.setResult("patron.theme1", r1);
      Game.setResult("patron.theme2", r2);
      var t1 = Game.getResult("ttrpgThemes", r1);
      var t2 = Game.getResult("ttrpgThemes", r2);
      var resultDiv = document.getElementById("result-ttrpgThemes");
      if (resultDiv) {
        resultDiv.innerHTML =
          '<span class="result-value">' + t1 + ' / ' + t2 + '</span>' +
          '<button class="btn-reroll" onclick="UI.reroll(\'ttrpgThemes\')">' + t("btn.reroll") + '</button>';
      }
      UI.renderSummaryIfVisible();
    }));
  },
```

- [ ] Odśwież stronę, zakładka Przybycie — widać 6 rzutów Krajobrazu i 6 rzutów Patrona
- [ ] Kliknij "Rzuć" przy Pora Roku — wynik pojawia się, przycisk ↺ zastępuje "Rzuć"
- [ ] Kliknij ↺ — wynik zmienia się
- [ ] Zmień język — wyniki tabel zmieniają się na drugą wersję językową
- [ ] Commit: `git add "Lonely Patrons/js/ui.js" && git commit -m "feat: render Arrival tab with landscape and patron rolls"`

---

## Task 8: ui.js — zakładka Dzień (Rano / Popołudnie / Noc)

**Files:**
- Modify: `Lonely Patrons/js/ui.js`

Dodaj do `UI`:

- [ ] Dodaj metody `renderDay`, `renderWPTracker`, `renderMorning`, `renderAfternoon`, `renderNight`:

```js
  renderDay: function() {
    UI.renderWPTracker();
    UI.renderMorning();
    UI.renderAfternoon();
    UI.renderNight();
  },

  renderWPTracker: function() {
    var wp = Game.state.workPoints;
    var pct = Math.round((wp / 30) * 100);
    var container = document.getElementById("wp-tracker");
    var complete = wp === 0;
    container.innerHTML =
      '<div class="wp-header">' +
        '<span>' + t("wp.label") + '</span>' +
        '<span class="wp-count">' + wp + ' / 30</span>' +
      '</div>' +
      '<div class="wp-bar-bg"><div class="wp-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="wp-actions">' +
        (complete ? '' :
          '<button class="btn-roll" onclick="UI.doWPRoll()">' + t("btn.rollWp") + '</button>' +
          '<button class="wp-adj-btn" onclick="Game.state.workPoints = Math.min(30, Game.state.workPoints+1); Game.save(); UI.renderWPTracker();">+</button>' +
          '<button class="wp-adj-btn" onclick="Game.state.workPoints = Math.max(0, Game.state.workPoints-1); Game.save(); UI.renderWPTracker();">−</button>'
        ) +
      '</div>' +
      (complete ? '<div class="wp-complete">' + t("wp.complete") + '</div>' : '');
  },

  doWPRoll: function() {
    var r = Game.wpRollDie();
    Game.reduceWP(r.result);
    UI.renderWPTracker();
    UI.renderSummaryIfVisible();
    // Log rzutu w sekcji Rano
    var log = document.getElementById("wp-roll-log");
    if (!log) {
      log = document.createElement("div");
      log.id = "wp-roll-log";
      log.style.cssText = "font-size:13px;color:var(--text-muted);margin-top:8px";
      document.getElementById("wp-tracker").parentNode.insertBefore(log, document.getElementById("wp-tracker").nextSibling);
    }
    log.textContent += "1D" + r.sides + " → " + r.result + "  ";
  },

  renderMorning: function() {
    var group = document.getElementById("rolls-morning");
    group.innerHTML = "";

    // System TTRPG (raz na sesję)
    UI.rollConfig["system"] = { statePath: "morningSystem", rollFn: function() {
      UI.updateResult("system", Game.rollDie(20), "morningSystem");
    }};
    group.appendChild(UI.makeRollRow("system", "morningSystem", UI.rollConfig["system"].rollFn));

    // Sekcja ulepszenia
    UI.renderImprovement();
  },

  renderImprovement: function() {
    var sec = document.getElementById("improvement-section");
    var bonus = Game.state.improvementBonus;
    var attempts = Game.state.improvementAttemptsToday;
    var maxAttempts = 2;
    sec.innerHTML =
      '<div class="improvement-header">' + t("improvement.label") + '</div>' +
      '<div class="improvement-bonus">+' + bonus + '</div>' +
      (attempts < maxAttempts ?
        '<button class="btn-roll" onclick="UI.doImprovement()">' + t("improvement.try") + ' (' + (maxAttempts - attempts) + ')</button>' :
        '<div class="improvement-log">' + t("improvement.label") + ': max</div>'
      );
  },

  doImprovement: function() {
    var r = Game.tryImprovement();
    if (!r) return;
    var log = (r.success ? "✓ " : "✗ ") + "1D6=" + r.roll + " (próg " + r.threshold + "+) → +" + r.newBonus;
    UI.renderImprovement();
    var sec = document.getElementById("improvement-section");
    var logEl = document.createElement("div");
    logEl.className = "improvement-log";
    logEl.textContent = log;
    sec.appendChild(logEl);
  },

  renderAfternoon: function() {
    var group = document.getElementById("rolls-afternoon");
    group.innerHTML = "";

    // Dwa osobne rzuty aktywności
    var state = Game.state;
    if (!state._act1) state._act1 = null;
    if (!state._act2) state._act2 = null;
    if (!state._actChosen) state._actChosen = null;

    var row = document.createElement("div");
    row.innerHTML =
      '<div class="roll-row">' +
        '<span class="roll-label">' + (TABLES.activities.label[state.language] || TABLES.activities.label.en) + '</span>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="btn-roll" onclick="UI.rollActivity(1)">' + t("btn.rollActivity1") + '</button>' +
          '<button class="btn-roll" onclick="UI.rollActivity(2)">' + t("btn.rollActivity2") + '</button>' +
        '</div>' +
      '</div>' +
      '<div id="activities-results"></div>';
    group.appendChild(row);
    UI.renderActivityResults();

    // Satysfakcja
    UI.rollConfig["enjoyment"] = { statePath: null, rollFn: function() {
      var r = Game.rollDie(12);
      var text = Game.getResult("enjoyment", r);
      var el = document.getElementById("result-enjoyment");
      if (el) el.innerHTML = '<span class="result-value">' + text + '</span>' +
        '<button class="btn-reroll" onclick="UI.reroll(\'enjoyment\')">' + t("btn.reroll") + '</button>';
    }};
    group.appendChild(UI.makeRollRow("enjoyment", null, UI.rollConfig["enjoyment"].rollFn));
  },

  rollActivity: function(num) {
    var r = Game.rollDie(100);
    var state = Game.state;
    if (num === 1) state._act1 = r; else state._act2 = r;
    Game.save();
    UI.renderActivityResults();
  },

  renderActivityResults: function() {
    var state = Game.state;
    var lang = state.language;
    var container = document.getElementById("activities-results");
    if (!container) return;
    var html = '<div class="activities-choice">';
    if (state._act1) {
      var t1 = Game.getResult("activities", state._act1);
      html += '<button class="activity-option' + (state._actChosen === 1 ? " chosen" : "") + '" onclick="UI.chooseActivity(1)">' + t1 + '</button>';
    }
    if (state._act2) {
      var t2 = Game.getResult("activities", state._act2);
      html += '<button class="activity-option' + (state._actChosen === 2 ? " chosen" : "") + '" onclick="UI.chooseActivity(2)">' + t2 + '</button>';
    }
    html += '</div>';
    container.innerHTML = html;
  },

  chooseActivity: function(num) {
    Game.state._actChosen = num;
    Game.save();
    UI.renderActivityResults();
    UI.renderSummaryIfVisible();
  },

  renderNight: function() {
    var group = document.getElementById("rolls-night");
    group.innerHTML = "";

    UI.rollConfig["tone"] = { statePath: null, rollFn: function() {
      var r = Game.rollDie(6);
      var el = document.getElementById("result-tone");
      if (el) el.innerHTML = '<span class="result-value">' + Game.getResult("tone", r) + '</span>' +
        '<button class="btn-reroll" onclick="UI.reroll(\'tone\')">' + t("btn.reroll") + '</button>';
    }};
    group.appendChild(UI.makeRollRow("tone", null, UI.rollConfig["tone"].rollFn));

    UI.rollConfig["topic"] = { statePath: null, rollFn: function() {
      var r = Game.rollDie(100);
      var el = document.getElementById("result-topic");
      if (el) el.innerHTML = '<span class="result-value">' + Game.getResult("topic", r) + '</span>' +
        '<button class="btn-reroll" onclick="UI.reroll(\'topic\')">' + t("btn.reroll") + '</button>';
    }};
    group.appendChild(UI.makeRollRow("topic", null, UI.rollConfig["topic"].rollFn));
  },
```

- [ ] Kliknij zakładkę Dzień — widać tracker WP, rzut Systemu, sekcję ulepszenia
- [ ] Kliknij "Rzuć (zredukuj WP)" — WP maleje, log się pojawia
- [ ] Kliknij + / − przy WP — wartość zmienia się
- [ ] Przełącz na Popołudnie — dwa przyciski Rzuć 1 / Rzuć 2, po rzucie można wybrać aktywność
- [ ] Przełącz na Noc — rzuty Ton i Temat działają
- [ ] Commit: `git add "Lonely Patrons/js/ui.js" && git commit -m "feat: render Day tab — WP tracker, morning, afternoon, night"`

---

## Task 9: ui.js — zakładka Zakończenie + Podsumowanie

**Files:**
- Modify: `Lonely Patrons/js/ui.js`

- [ ] Dodaj metody `renderEnding` i `renderSummary` do `UI`:

```js
  renderEnding: function() {
    var group = document.getElementById("rolls-ending");
    var lang = Game.state.language;
    group.innerHTML = "";

    // Dostawa (2D6 + bonus)
    var deliveryRow = document.createElement("div");
    deliveryRow.className = "roll-row";
    deliveryRow.innerHTML =
      '<span class="roll-label">' + (TABLES.delivery.label[lang] || TABLES.delivery.label.en) + ' (2D6+' + Game.state.improvementBonus + ')</span>' +
      '<div id="result-delivery">' +
        '<button class="btn-roll" onclick="UI.doDelivery()">' + t("btn.roll") + '</button>' +
      '</div>';
    group.appendChild(deliveryRow);

    // Co kochają w grze (1D6)
    UI.rollConfig["whatTheyLove"] = { statePath: "ending.whatTheyLove", rollFn: function() {
      UI.updateResult("whatTheyLove", Game.rollDie(6), "ending.whatTheyLove");
    }};
    group.appendChild(UI.makeRollRow("whatTheyLove", "ending.whatTheyLove", UI.rollConfig["whatTheyLove"].rollFn));

    // Propozycja (2D6 + relacja)
    var proposalSection = document.createElement("div");
    proposalSection.innerHTML =
      '<div class="roll-row" style="flex-direction:column;align-items:flex-start;gap:8px">' +
        '<span class="roll-label">' + (TABLES.proposal.label[lang] || TABLES.proposal.label.en) + '</span>' +
        '<select class="relationship-select" id="relationship-select" onchange="Game.state.ending.proposalRelationship=parseInt(this.value);Game.save();">' +
          '<option value="0">' + t("ending.relationship.cordial") + '</option>' +
          '<option value="1">' + t("ending.relationship.kind") + '</option>' +
          '<option value="2">' + t("ending.relationship.excellent") + '</option>' +
          '<option value="3">' + t("ending.relationship.special") + '</option>' +
        '</select>' +
        '<div id="result-proposal">' +
          '<button class="btn-roll" onclick="UI.doProposal()">' + t("btn.roll") + '</button>' +
        '</div>' +
      '</div>';
    group.appendChild(proposalSection);

    // Ważne Wydarzenie (wiek)
    var eventSection = document.createElement("div");
    eventSection.innerHTML =
      '<div class="roll-row" style="flex-direction:column;align-items:flex-start;gap:8px">' +
        '<span class="roll-label">' + (TABLES.importantEvent.label[lang] || TABLES.importantEvent.label.en) + '</span>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span>' + t("ending.age.label") + '</span>' +
          '<input type="number" class="age-input" id="age-input" min="16" max="100" value="' + Game.state.characterAge + '"' +
            ' onchange="Game.state.characterAge=parseInt(this.value)||16;Game.save();">' +
        '</div>' +
        '<div id="result-importantEvent">' +
          '<button class="btn-roll" onclick="UI.doEvent()">' + t("btn.roll") + '</button>' +
        '</div>' +
      '</div>';
    group.appendChild(eventSection);

    // Przywróć istniejące wyniki
    if (Game.state.ending.deliveryRoll) {
      var text = Game.getResult("delivery", Game.state.ending.deliveryRoll);
      document.getElementById("result-delivery").innerHTML =
        '<span class="result-value">' + text + '</span>' +
        '<button class="btn-reroll" onclick="UI.doDelivery()">' + t("btn.reroll") + '</button>';
    }
    if (Game.state.ending.proposalRoll) {
      var pt = Game.getResult("proposal", Game.state.ending.proposalRoll);
      document.getElementById("result-proposal").innerHTML =
        '<span class="result-value">' + pt + '</span>' +
        '<button class="btn-reroll" onclick="UI.doProposal()">' + t("btn.reroll") + '</button>';
    }
    if (Game.state.ending.event) {
      var ev = TABLES.importantEvent[lang] ? TABLES.importantEvent[lang][Game.state.ending.event] : TABLES.importantEvent.en[Game.state.ending.event];
      if (!ev) ev = TABLES.importantEvent.en[Game.state.ending.event] || "?";
      document.getElementById("result-importantEvent").innerHTML =
        '<span class="result-value">' + ev + '</span>' +
        '<button class="btn-reroll" onclick="UI.doEvent()">' + t("btn.reroll") + '</button>';
    }
  },

  doDelivery: function() {
    var roll = Game.roll2D6() + Game.state.improvementBonus;
    var capped = Math.min(roll, 12);
    Game.state.ending.deliveryRoll = capped;
    Game.save();
    var text = Game.getResult("delivery", capped);
    var el = document.getElementById("result-delivery");
    if (el) el.innerHTML = '<span class="result-value">' + text + ' (' + roll + ')</span>' +
      '<button class="btn-reroll" onclick="UI.doDelivery()">' + t("btn.reroll") + '</button>';
    UI.renderSummaryIfVisible();
  },

  doProposal: function() {
    var rel = Game.state.ending.proposalRelationship || 0;
    var roll = Game.roll2D6() + rel;
    Game.state.ending.proposalRoll = roll;
    Game.save();
    var text = Game.getResult("proposal", roll);
    var el = document.getElementById("result-proposal");
    if (el) el.innerHTML = '<span class="result-value">' + text + ' (' + roll + ')</span>' +
      '<button class="btn-reroll" onclick="UI.doProposal()">' + t("btn.reroll") + '</button>';
    UI.renderSummaryIfVisible();
  },

  doEvent: function() {
    var age = Game.state.characterAge || 16;
    var tableKey = age >= 80 ? 80 : age;
    Game.state.ending.event = tableKey;
    Game.save();
    var lang = Game.state.language;
    var data = TABLES.importantEvent[lang] || TABLES.importantEvent.en;
    var text = data[tableKey] || data[80] || "?";
    var el = document.getElementById("result-importantEvent");
    if (el) el.innerHTML = '<span class="result-value">' + text + '</span>' +
      '<button class="btn-reroll" onclick="UI.doEvent()">' + t("btn.reroll") + '</button>';
    UI.renderSummaryIfVisible();
  },

  renderSummary: function() {
    var s = Game.state;
    var lang = s.language;
    var container = document.getElementById("summary-content");

    function val(tableKey, rollValue) {
      if (rollValue == null) return "—";
      return Game.getResult(tableKey, rollValue);
    }

    var html = "";

    // Patron
    html += '<div class="summary-section">';
    html += '<div class="summary-section-title">' + t("summary.patron") + '</div>';
    html += '<div class="summary-value">';
    html += [
      val("appearance", s.patron.appearance),
      val("personality", s.patron.personality),
      val("nameInitials", s.patron.nameInitials),
      val("ancestry", s.patron.ancestry),
      val("talent", s.patron.talent)
    ].join(" · ");
    if (s.patron.theme1 || s.patron.theme2) {
      html += "<br>" + val("ttrpgThemes", s.patron.theme1) + " / " + val("ttrpgThemes", s.patron.theme2);
    }
    html += '</div></div>';

    // Krajobraz
    html += '<div class="summary-section">';
    html += '<div class="summary-section-title">' + t("summary.landscape") + '</div>';
    html += '<div class="summary-value">';
    html += [
      val("season", s.landscape.season),
      val("region", s.landscape.region),
      val("terrain", s.landscape.terrain),
      val("weather", s.landscape.weather),
      val("patronHouse", s.landscape.house),
      val("regionKnownFor", s.landscape.knownFor)
    ].join(" · ");
    html += '</div></div>';

    // System + bonus
    if (s.morningSystem) {
      html += '<div class="summary-section">';
      html += '<div class="summary-section-title">' + t("summary.system") + '</div>';
      html += '<div class="summary-value">' + val("system", s.morningSystem) + ' · ' + t("summary.bonus") + ': +' + s.improvementBonus + '</div>';
      html += '</div>';
    }

    // Dni (aktywności + noc)
    if (s._act1 || s._act2) {
      html += '<div class="summary-section">';
      html += '<div class="summary-section-title">' + t("summary.day") + ' ' + s.day + '</div>';
      if (s._actChosen) {
        var chosenRoll = s._actChosen === 1 ? s._act1 : s._act2;
        html += '<div class="summary-value">' + t("summary.afternoon") + ': ' + val("activities", chosenRoll) + '</div>';
      }
      html += '</div>';
    }

    // Zakończenie
    if (s.ending.deliveryRoll) {
      html += '<div class="summary-section">';
      html += '<div class="summary-section-title">' + t("summary.ending") + '</div>';
      html += '<div class="summary-value">' + val("delivery", s.ending.deliveryRoll) + '</div>';
      if (s.ending.whatTheyLove) html += '<div class="summary-value">' + val("whatTheyLove", s.ending.whatTheyLove) + '</div>';
      if (s.ending.event) {
        var data = TABLES.importantEvent[lang] || TABLES.importantEvent.en;
        html += '<div class="summary-value">' + (data[s.ending.event] || "?") + '</div>';
      }
      html += '</div>';
    }

    if (html === "") html = '<div class="summary-empty">' + t("summary.empty") + '</div>';
    container.innerHTML = html;
  },

  copySummary: function() {
    var text = document.getElementById("summary-content").innerText;
    navigator.clipboard.writeText(text).catch(function() {
      // fallback dla starszych przeglądarek
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
  },
```

- [ ] Zakładka Zakończenie — widać sekcje Dostawa, Co kochają, Propozycja (z dropdownem relacji), Wydarzenie (z polem wieku)
- [ ] Rzuć Dostawę — wynik opisowy się pojawia
- [ ] Zakładka Podsumowanie — zbiera dane z poprzednich rzutów
- [ ] Kliknij "Kopiuj" — tekst trafia do schowka
- [ ] Commit: `git add "Lonely Patrons/js/ui.js" && git commit -m "feat: render Ending and Summary tabs"`

---

## Task 10: Persistencja i test end-to-end

**Files:**
- No new files

- [ ] Zagraj pełną sesję w przeglądarce:
  1. Zakładka Przybycie: wylosuj wszystkie 12 rzutów (krajobraz + patron)
  2. Zakładka Dzień → Rano: zredukuj WP do 0 kilkoma rzutami
  3. Zakładka Dzień → Popołudnie: rzuć dwukrotnie, wybierz aktywność, rzuć satysfakcję
  4. Zakładka Dzień → Noc: rzuć ton i temat
  5. Zakładka Zakończenie: dostawa, co kochają, propozycja, wydarzenie
  6. Zakładka Podsumowanie: wszystkie wyniki widoczne
- [ ] Zamknij i otwórz ponownie zakładkę przeglądarki — stan gry odtworzony z localStorage
- [ ] Przełącz język EN ↔ PL — wszystkie wyniki zmieniają się natychmiast
- [ ] Kliknij "Nowa sesja" → potwierdź — stan gry wyczyszczony, zaczynasz od nowa
- [ ] Sprawdź na telefonie (lub DevTools mobile) — zakładki dostępne kciukiem, przyciski wystarczająco duże
- [ ] Kliknij floating 🎲 — overlay przymiotnika otwiera się, ↺ losuje nowy
- [ ] Commit: `git add -A && git commit -m "feat: complete Lonely Patrons web app"`

---

## Uwagi dla implementującego

- **Tłumaczenia w tabelach:** `TABLES.ancestry` — dla rzutów 1, 2, 3 zwracaj ten sam wynik (index 1 w tablicy)
- **regionKnownFor:** wyniki 95–100 → wszystkie dają `95` jako klucz (jeden wpis `95+`)
- **importantEvent:** klucz `80` obsługuje wszystkich w wieku 80+
- **delivery:** zakres `12+` — w kodzie użyj `Math.min(roll, 12)` jako klucza
- **proposal:** zakres `7-` i `11+` — sprawdź `roll <= 7`, `8 <= roll <= 10`, `roll >= 11`
- **Aktywności 99 i 100:** specjalne opisy `[patron talent]` i `[o krajobrazie]` — wyświetl je dosłownie jako placeholder do odegrania
- **adjectives:** niektóre numery mają wartość `null` (luki w tabeli) — fallback na sąsiedni numer
