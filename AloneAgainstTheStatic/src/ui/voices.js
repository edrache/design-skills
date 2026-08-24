// Rejestr znaczników stylu. To jedyne miejsce, które edytujesz, dodając efekt:
// wpis tutaj plus reguła w style.css. Pole `effect` jest w praktyce flagą:
// effects.js szuka elementów przez querySelectorAll("[data-effect]") i nigdy
// nie czyta wartości atrybutu, więc sama obecność pola włącza filtr statyki
// (przez zmienną `--vhs-filter`, składaną w CSS z resztą filtrów elementu) —
// wartość "static" nie jest dziś w żaden sposób rozróżniana od innej.

export const TAGS = Object.freeze({
  charlie: { kind: "voice", className: "v-charlie", label: "Charlie" },
  alex: { kind: "voice", className: "v-alex", label: "Alex" },
  mark: { kind: "voice", className: "v-mark", label: "Mark" },
  julie: { kind: "voice", className: "v-julie", label: "Julie" },
  tom: { kind: "voice", className: "v-tom", label: "Tom" },
  // Bohater i mówca nienazwany zostają bez etykiety: ich kwestie mają
  // brzmieć jak część prozy, nie jak scenariusz.
  you: { kind: "voice", className: "v-you" },
  voice: { kind: "voice", className: "v-unknown" },

  horror: { kind: "tone", className: "t-horror", effect: "static" },
  whisper: { kind: "tone", className: "t-whisper" },
  shout: { kind: "tone", className: "t-shout" },
  thought: { kind: "tone", className: "t-thought" },
  radio: { kind: "tone", className: "t-radio", effect: "static" },
  sign: { kind: "tone", className: "t-sign" },
  // `[wrong]` składa własny blur z przemieszczeniem szumu. Wcześniej efekt był
  // tu wyłączony, bo JS pisał po `style.filter` i nadpisywał regułę blur;
  // teraz JS ustawia `--vhs-filter`, a CSS składa oba w jednym `filter`.
  wrong: { kind: "tone", className: "t-wrong", effect: "static" },
});

export function tagInfo(name) {
  return Object.hasOwn(TAGS, name) ? TAGS[name] : null;
}

export function isKnownTag(name) {
  return tagInfo(name) !== null;
}

export const VOICE_NAMES = Object.freeze(
  Object.keys(TAGS).filter((name) => TAGS[name].kind === "voice"),
);
