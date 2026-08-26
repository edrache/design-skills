import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

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

test("historia rzutu jest cicha i nieruchoma", () => {
  const history = rule(".roll-history");
  assert.ok(history, "brak reguły .roll-history");
  assert.match(history, /font-size:\s*0?\.\d+rem/, "historia ma być drobna jak .roll-head");
  for (const body of [history, rule(".choice[data-taken]"), rule(".journal-entry[data-seen] > p")]) {
    assert.ok(!/animation|transition/.test(body), "oznaczenia pamięci nie animują się");
  }
});
