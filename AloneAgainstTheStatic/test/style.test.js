import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("grafika paragrafu zachowuje pełny kadr i własne kolory", () => {
  const blocks = [...css.matchAll(/\.entry-image\s*\{([^}]+)\}/g)].map((match) => match[1]);
  const finalRule = blocks.at(-1) ?? "";

  assert.match(finalRule, /height:\s*auto/);
  assert.match(finalRule, /max-height:\s*none/);
  assert.match(finalRule, /object-fit:\s*contain/);
  assert.match(finalRule, /filter:\s*none/);
});

// `.t-wrong` i `[data-effect="static"]` mają identyczną specyficzność
// (0,1,0) i trafiają w ten sam element (bo TAGS.wrong ma effect: "static"),
// więc bez selektora złożonego o wygranej deklaracji `filter` decydowałaby
// tylko kolejność reguł w pliku — krucho, bo porządkowanie style.css po
// cichu odwraca, który filtr (blur czy sam --vhs-filter) wygra. Ten test
// pilnuje, żeby reguła `.t-wrong[data-effect="static"]` (specyficzność
// (0,2,0), niezależna od kolejności) istniała i wciąż składała blur z
// szumem — a nie żeby ktoś ją "uprościł" z powrotem do samego `.t-wrong`.
test("reguła .t-wrong[data-effect=\"static\"] składa blur i --vhs-filter", () => {
  const match = css.match(/\.t-wrong\[data-effect="static"\]\s*\{([^}]*)\}/);
  assert.ok(match, "brak reguły dla selektora złożonego .t-wrong[data-effect=\"static\"]");
  const body = match[1];
  const filterMatch = body.match(/filter:\s*([^;]+);/);
  assert.ok(filterMatch, "reguła nie ustawia filter");
  assert.match(filterMatch[1], /blur\(/, "filter powinien zawierać blur(...)");
  assert.match(filterMatch[1], /var\(--vhs-filter/, "filter powinien składać się z var(--vhs-filter...)");
});

// Oznaczenia pamięci poznanych paragrafów (patrz spec
// docs/superpowers/specs/2026-08-26-progress-memory-design.md). Reguły są
// czysto wizualne, więc test pilnuje tego, co da się zepsuć po cichu:
// zasięgu przygaszenia i tego, że nic tu nie zaczyna się ruszać.
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "m"));
  return match?.[1] ?? null;
}

test("przygaszenie widzianego paragrafu obejmuje wyłącznie prozę", () => {
  const prose = rule(".journal-entry[data-seen] > p");
  assert.ok(prose, "brak reguły przygaszającej prozę widzianego paragrafu");
  assert.match(prose, /opacity:\s*0?\.7\s*;/);

  // Selektor dziecka bezpośredniego trzyma notatki mechaniczne poza zasięgiem;
  // gdyby ktoś rozluźnił go do potomka, `.event-note` też by przygasło.
  assert.ok(
    !/\.journal-entry\[data-seen\]\s+p\s*\{/.test(css),
    "reguła nie powinna sięgać dowolnego potomka p",
  );
  for (const mechanical of [".event-note", ".rollbox", ".missing", ".choice"]) {
    assert.ok(
      !new RegExp(`\\.journal-entry\\[data-seen\\][^{]*\\${mechanical}[^{]*\\{[^}]*opacity`).test(css),
      `${mechanical} nie powinien być przygaszany razem z prozą`,
    );
  }
});

test("nagłówek widzianego paragrafu dostaje żółtą ramkę ze zmiennej --seen", () => {
  assert.match(css, /^\s*--seen:\s*oklch\(/m, "brak zmiennej --seen w :root");
  const number = rule(".journal-entry[data-seen] .entry-number");
  assert.ok(number, "brak reguły ramki dla .entry-number");
  assert.match(number, /border:[^;]*var\(--seen\)/, "ramka powinna używać var(--seen)");
});

test("opcja podjęta wcześniej jest przygaszona, ale wraca do pełni pod kursorem", () => {
  const taken = rule(".choice[data-taken]");
  assert.ok(taken, "brak reguły .choice[data-taken]");
  assert.match(taken, /opacity:\s*0?\.5\s*;/);
  // Stan osobny od :disabled — data-taken nie może wyłączać wskaźnika kursora.
  assert.ok(!/cursor:\s*not-allowed/.test(taken));
  assert.match(css, /\.choice\[data-taken\]:hover[^{]*\{[^}]*opacity:\s*1/);
});

// Klasa .appearing zostaje na przycisku po animacji, a `fill-mode: both`
// utrwala ostatnią klatkę. Wartość animowana bije w kaskadzie każdą zwykłą
// deklarację, więc twarde `opacity: 1` w klatce końcowej kasowałoby
// przygaszenie podjętego wyboru — i robiło to po cichu, bo reguła w pliku jest.
test("animacja wejścia nie kasuje przygaszenia podjętego wyboru", () => {
  const frames = css.match(/@keyframes appear\s*\{([\s\S]*?)\n\}/);
  assert.ok(frames, "brak klatek animacji appear");
  const end = frames[1].match(/to\s*\{([^}]*)\}/);
  assert.ok(end, "animacja appear nie ma klatki końcowej");
  assert.match(end[1], /opacity:\s*var\(--appear-opacity/, "klatka końcowa musi oddawać alfę elementowi");

  const taken = rule(".choice[data-taken]");
  assert.match(taken, /--appear-opacity:\s*0?\.5\s*;/, "podjęty wybór musi obniżyć alfę także dla animacji");
  assert.match(css, /\.choice\[data-taken\]:hover[^{]*\{[^}]*--appear-opacity:\s*1/);
});

test("historia rzutu jest cicha i nieruchoma", () => {
  const history = rule(".roll-history");
  assert.ok(history, "brak reguły .roll-history");
  assert.match(history, /font-size:\s*0?\.\d+rem/, "historia ma być drobna jak .roll-head");
  for (const body of [history, rule(".choice[data-taken]"), rule(".journal-entry[data-seen] > p")]) {
    assert.ok(!/animation|transition/.test(body), "oznaczenia pamięci nie animują się");
  }
});

// Nawrót (spec 2026-08-26-cheat-reroll-design.md). Cały efekt tego przycisku
// jest w CSS, więc test pilnuje tego, co go definiuje: że w spoczynku jest
// prawie niewidoczny, że po najechaniu dostaje czerwony outline i pełną
// widoczność, i że pod prefers-reduced-motion nic się nie rusza.
test("przycisk nawrotu jest w spoczynku ledwo widoczny i bez ramki", () => {
  const body = rule(".cheat");
  assert.ok(body, "brak reguły .cheat");
  const opacity = body.match(/opacity:\s*([\d.]+)\s*;/);
  assert.ok(opacity, ".cheat nie ustawia opacity");
  assert.ok(Number(opacity[1]) <= 0.1, `nawrót ma być ledwo widoczny, jest ${opacity[1]}`);
  assert.match(body, /border:\s*1px solid transparent\s*;/);
});

test("najechany nawrót zapala się czerwienią i pełną widocznością", () => {
  const body = rule(".cheat:hover,\n.cheat:focus-visible");
  assert.ok(body, "brak wspólnej reguły dla hover i focus-visible");
  assert.match(body, /border-color:\s*var\(--rec\)\s*;/);
  assert.match(body, /opacity:\s*1\s*;/);
  assert.match(body, /animation:\s*cheat-jitter/);
});

test("szum nawrotu ma obie warstwy i obie animacje", () => {
  for (const layer of ["cheat-scan", "cheat-drift", "cheat-jitter"]) {
    assert.ok(new RegExp(`@keyframes\\s+${layer}\\s*\\{`).test(css), `brak @keyframes ${layer}`);
  }
  assert.ok(rule(".cheat::before,\n.cheat::after"), "brak wspólnej reguły warstw szumu");
});

test("prefers-reduced-motion zdejmuje z nawrotu ruch, zostawiając kontrast", () => {
  const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/);
  assert.ok(block, "brak bloku prefers-reduced-motion");
  assert.match(block[1], /\.cheat:hover,\s*\n\s*\.cheat:focus-visible\s*\{\s*animation:\s*none;\s*\}/);
  assert.match(block[1], /\.cheat::before,\s*\n\s*\.cheat::after\s*\{\s*display:\s*none;\s*\}/);
});

test("werdykt sprzed poprawki jest przekreślony i wygaszony", () => {
  const body = rule(".roll-level.cheated-from");
  assert.ok(body, "brak reguły dla przekreślonego werdyktu");
  assert.match(body, /text-decoration:\s*line-through\s*;/);
});

// Warstwa klonu widmowego (spec 2026-08-27-pointer-static.md). Klon leży
// nad oryginalnym wpisem, zniekształcony filtrem SVG i przycięty maską
// dysku wokół wskaźnika (fabryka z Zadania 6 dopisuje maski i --ghost-split
// bezpośrednio w element.style). Testy pilnują tego, co da się zepsuć po
// cichu w CSS: że klon nie przechwytuje kliknięć, że układ klonu jest
// identyczny z oryginałem (visibility, nie display), i że reduced-motion
// go gasi.
test("klon widmowy leży nad wpisem, nie łapie zdarzeń i nie zmienia układu", () => {
  const ghost = rule(".static-ghost");
  assert.ok(ghost, "brak reguły .static-ghost");
  assert.match(ghost, /position:\s*absolute/);
  assert.match(ghost, /inset:\s*0/);
  // Klon nie może przechwytywać kliknięć — pod nim są wybory i bramka rzutu.
  assert.match(ghost, /pointer-events:\s*none/);
  assert.match(ghost, /filter:\s*url\(#pointer-static\)/);
});

test("wpis dziennika jest kontekstem pozycjonowania dla klonu", () => {
  const entry = rule(".journal-entry");
  assert.ok(entry, "brak reguły .journal-entry");
  assert.match(entry, /position:\s*relative/);
});

test("w klonie widać prozę i figurę kadru", () => {
  // Wszystko poza nimi jest ukryte przez visibility, nie display: układ musi
  // zostać identyczny z oryginałem, inaczej wiersze się rozjadą.
  const hidden = rule(".static-ghost .journal-entry > *:not(p):not(.entry-art)");
  assert.ok(hidden, "brak reguły ukrywającej elementy klonu spoza efektu");
  assert.match(hidden, /visibility:\s*hidden/);
});

test("rozszczepienie barwne na klonie jest sterowane zmienną", () => {
  const prose = rule(".static-ghost p");
  assert.ok(prose, "brak reguły .static-ghost p");
  assert.match(prose, /text-shadow:[\s\S]*var\(--ghost-split/);
});

test("reduced-motion gasi klon widmowy", () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*\.static-ghost\s*\{[^}]*display:\s*none/);
});

// Warstwa szaleństwa na grafice paragrafu (spec
// 2026-08-28-madness-overlay-design.md). Filtr działa na całej figurze
// .entry-art (nie na samym kadrze), żeby oczy i kadr rwały się razem;
// .entry-madness zlewa się z kadrem trybem screen, zanim złożenie trafi
// pod filtr. Testy pilnują tylko tego, co dałoby się zepsuć po cichu w CSS.
test(".entry-art trzyma zniekształcenie całej figury pod zmienną --madness-filter", () => {
  // rule() bierze pierwsze trafienie w pliku, a reduced-motion zeruje
  // filtr tym samym selektorem wyżej — łapiemy więc regułę główną po
  // position: relative, które ma tylko ona.
  const blocks = [...css.matchAll(/\.entry-art\s*\{([^}]+)\}/g)].map((match) => match[1]);
  const main = blocks.find((body) => /position:\s*relative/.test(body));
  assert.ok(main, "brak głównej reguły .entry-art");
  assert.match(main, /filter:\s*var\(--madness-filter/);
});

test(".entry-madness zlewa się z kadrem trybem screen pod sterowaniem --madness-blend", () => {
  const madness = rule(".entry-madness");
  assert.ok(madness, "brak reguły .entry-madness");
  assert.match(madness, /mix-blend-mode:\s*screen\s*;/);
  assert.match(madness, /opacity:\s*var\(--madness-blend/);
});

test("reduced-motion zeruje zniekształcenie figury, zostawiając krycie warstwy effects.js", () => {
  const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/);
  assert.ok(block, "brak bloku prefers-reduced-motion");
  assert.match(block[1], /\.entry-art\s*\{\s*filter:\s*none;\s*\}/);
});
