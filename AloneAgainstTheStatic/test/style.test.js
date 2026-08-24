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
