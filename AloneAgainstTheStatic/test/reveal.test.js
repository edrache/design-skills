import test from "node:test";
import assert from "node:assert/strict";
import { createI18n } from "../src/ui/i18n.js";
import {
  DEFAULTS, charTimeline, createReveal, normalizeConfig, stagger, visibleCount,
} from "../src/ui/reveal.js";
import { createFakeClock, createFakeDocument } from "./helpers/fake-dom.js";

const CONFIG = normalizeConfig({
  charsPerSecond: 100,
  punctuationPauseMs: { ".": 500 },
  choiceStaggerMs: 100,
  dieStaggerMs: 50,
});

function setup(texts, { reducedMotion = false } = {}) {
  const doc = createFakeDocument();
  const root = doc.createElement("div");
  const clock = createFakeClock();
  const i18n = createI18n({ pl: texts, en: {} }, "pl");
  const reveal = createReveal({
    root,
    config: CONFIG,
    now: clock.now,
    raf: clock.raf,
    cancelRaf: clock.cancelRaf,
    delay: clock.delay,
    reducedMotion: () => reducedMotion,
  });
  return { doc, root, clock, i18n, reveal };
}

function textOf(root) {
  return root.children.map((node) => node.textContent).join("");
}

// Tekst faktycznie widoczny: pomija kotary (nieodsłonięta reszta akapitu
// siedzi w DOM przez cały czas, żeby trzymać finalne łamanie wierszy).
function visibleText(node) {
  if (typeof node === "string") return node;
  if (node.nodeType === 3) return node.textContent;
  if (node.classList?.contains("veil")) return "";
  return (node.children ?? []).map(visibleText).join("");
}

test("konfiguracja odsłaniania odrzuca śmieci pole po polu", () => {
  const config = normalizeConfig({
    charsPerSecond: "szybko",
    punctuationPauseMs: { ".": 200, ",": -5, "?": "dużo" },
    choiceStaggerMs: 0,
    dieStaggerMs: null,
  });

  assert.equal(config.charsPerSecond, DEFAULTS.charsPerSecond);
  // Poprawne pauzy zostają, niepoprawne wypadają — bez zabierania reszty.
  assert.deepEqual(config.punctuationPauseMs, { ".": 200 });
  assert.equal(config.choiceStaggerMs, 0);
  assert.equal(config.dieStaggerMs, DEFAULTS.dieStaggerMs);
  assert.deepEqual(normalizeConfig(null), normalizeConfig(undefined));
});

test("oś czasu znaków dolicza pauzę po interpunkcji", () => {
  const timeline = charTimeline("ab.c", CONFIG);
  assert.deepEqual(timeline, [10, 20, 30, 540]);
  assert.equal(visibleCount(timeline, 0), 0);
  assert.equal(visibleCount(timeline, 25), 2);
  assert.equal(visibleCount(timeline, 539), 3);
  assert.equal(visibleCount(timeline, 540), 4);
});

test("akapit wypisuje się litera po literze i kończy na pełnym tekście", () => {
  const { root, clock, i18n, reveal } = setup({ "e1.p1": "Dwanaście liter" });
  reveal.start({ entryId: 1, originEntryId: null, events: [{ kind: "text", key: "e1.p1" }] }, { i18n });

  assert.equal(reveal.phase(), "typing");
  clock.tick(30);
  assert.ok(visibleText(root).endsWith("Dwa"), `oczekiwano prefiksu, jest: ${visibleText(root)}`);
  // Cały tekst jest w DOM od pierwszej klatki — to on trzyma łamanie wierszy.
  assert.ok(textOf(root).endsWith("Dwanaście liter"));
  assert.equal(reveal.phase(), "typing");

  clock.tick(1000);
  assert.ok(visibleText(root).endsWith("Dwanaście liter"));
  assert.equal(reveal.phase(), "waiting");
  // Po odsłonięciu kotary schodzą: DOM wygląda jak po rysowaniu hurtem.
  assert.equal(root.querySelectorAll(".veil").length, 0);
});

test("kotara trzyma pełny tekst w układzie, zanim zostanie odsłonięty", () => {
  const source = "Zdanie z [charlie]kwestią[/charlie] w środku.";
  const { root, clock, i18n, reveal } = setup({ "e1.p1": source });
  reveal.start({ entryId: 1, originEntryId: null, events: [{ kind: "text", key: "e1.p1" }] }, { i18n });

  const paragraph = root.querySelectorAll("p")[0];
  const plain = "Zdanie z kwestią w środku.";

  clock.tick(20);
  assert.equal(paragraph.textContent, plain, "pełna treść jest w DOM od początku");
  assert.equal(visibleText(paragraph), plain.slice(0, 2));
  // Znacznik kwestii jeszcze milczy, ale nie znika z układu (CSS: visibility).
  const voice = paragraph.querySelector(".v-charlie");
  assert.equal("pending" in voice.dataset, true);

  clock.tick(5000);
  assert.equal(paragraph.textContent, plain);
  assert.equal(visibleText(paragraph), plain);
  assert.equal("pending" in voice.dataset, false);
});

test("po domknięciu akapitu miga wskaźnik, który gaśnie przy kolejnym kroku", () => {
  const { root, clock, i18n, reveal } = setup({ "e1.p1": "Cisza.", "e1.p2": "Potem trzask." });
  reveal.start({
    entryId: 1,
    originEntryId: null,
    events: [
      { kind: "text", key: "e1.p1" },
      { kind: "flag", flag: "tape_played" },
      { kind: "text", key: "e1.p2" },
    ],
  }, { i18n });

  const first = root.querySelectorAll("p")[0];
  assert.equal("awaiting" in first.dataset, false, "w trakcie pisania zachęty nie ma");
  clock.tick(2000);
  assert.equal("awaiting" in first.dataset, true);

  // Notatka mechaniczna przejmuje wskaźnik, akapit go oddaje.
  reveal.tap();
  const note = root.querySelector(".event-note");
  assert.equal("awaiting" in first.dataset, false);
  assert.equal("awaiting" in note.dataset, true);

  reveal.tap();
  assert.equal("awaiting" in note.dataset, false, "zachęta znika, gdy tekst znów się pisze");
  assert.equal(root.querySelectorAll("[data-awaiting]").length, 0);
});

test("klik w trakcie pisania domyka akapit, kolejny odsłania następny", () => {
  const { root, clock, i18n, reveal } = setup({ "e1.p1": "Pierwszy akapit", "e1.p2": "Drugi" });
  reveal.start({
    entryId: 1,
    originEntryId: null,
    events: [{ kind: "text", key: "e1.p1" }, { kind: "text", key: "e1.p2" }],
  }, { i18n });

  clock.tick(20);
  assert.equal(reveal.tap(), true);
  assert.ok(visibleText(root).includes("Pierwszy akapit"), "pierwszy klik domyka akapit");
  assert.equal(reveal.phase(), "waiting");
  assert.ok(!textOf(root).includes("Drugi"), "drugi akapit nie może wyprzedzić kliknięcia");

  reveal.tap();
  clock.tick(1000);
  assert.ok(visibleText(root).includes("Drugi"));
});

test("tryb ręczny pozwala kliknięciem przerwać VO i przejść do następnego akapitu", () => {
  const { root, clock, i18n, reveal } = setup({ "e1.p1": "Pierwszy.", "e1.p2": "Drugi." });
  const started = [];
  const finish = new Map();
  const skipped = [];
  reveal.start({
    entryId: 1,
    originEntryId: null,
    events: [
      { kind: "text", key: "e1.p1" },
      { kind: "text", key: "e1.p2" },
    ],
  }, {
    i18n,
    onTextStart(event, paragraph, done) {
      started.push(event.key);
      finish.set(event.key, done);
    },
    onTextSkip(paragraph) {
      skipped.push(paragraph.textContent);
    },
  });

  clock.tick(5000);
  assert.equal(reveal.phase(), "narrating");
  assert.deepEqual(started, ["e1.p1"]);

  reveal.tap();
  assert.deepEqual(started, ["e1.p1", "e1.p2"]);
  assert.deepEqual(skipped, ["Pierwszy."]);
  assert.equal(reveal.phase(), "typing");

  finish.get("e1.p1")();
  assert.equal(reveal.phase(), "typing", "spóźnione zakończenie starego VO nie rusza nowego akapitu");
});

test("Autoplay ignoruje przewijające kliki i zatrzymuje się na granicy paragrafu", () => {
  const { root, clock, i18n, reveal } = setup({
    "e1.p1": "Pierwszy akapit.",
    "e1.p2": "Drugi akapit.",
    "e2.p1": "Następny paragraf.",
  });
  const started = [];
  const finish = new Map();
  reveal.setAutoplay(true);
  reveal.start({
    entryId: 2,
    originEntryId: 1,
    events: [
      { kind: "text", key: "e1.p1" },
      { kind: "text", key: "e1.p2" },
      { kind: "text", key: "e2.p1" },
    ],
  }, {
    i18n,
    onTextStart(event, paragraph, done) {
      started.push(event.key);
      finish.set(event.key, done);
    },
  });

  clock.tick(20);
  const prefix = visibleText(root);
  assert.equal(reveal.tap(), true);
  assert.equal(visibleText(root), prefix, "klik nie domyka tekstu w Autoplay");

  clock.tick(5000);
  assert.equal(reveal.phase(), "narrating");
  reveal.tap();
  assert.deepEqual(started, ["e1.p1"], "klik nie przerywa VO w Autoplay");

  finish.get("e1.p1")();
  clock.tick(1);
  assert.deepEqual(started, ["e1.p1", "e1.p2"]);

  clock.tick(5000);
  finish.get("e1.p2")();
  clock.tick(1);
  assert.equal(reveal.phase(), "continue");
  assert.ok(root.querySelector(".continue"), "granica numerowanego paragrafu zostaje bramką");
  assert.deepEqual(started, ["e1.p1", "e1.p2"], "Autoplay nie otwiera kolejnego paragrafu");
});

test("granica paragrafów daje przycisk dalej, który czyści ekran", () => {
  const { root, clock, i18n, reveal } = setup({ "e1.p1": "Tu", "e2.p1": "Tam" });
  reveal.start({
    entryId: 2,
    originEntryId: 1,
    events: [{ kind: "text", key: "e1.p1" }, { kind: "text", key: "e2.p1" }],
  }, { i18n });

  clock.tick(1000);
  reveal.tap();
  assert.equal(reveal.phase(), "continue");
  const next = root.querySelector(".continue");
  assert.equal(next.textContent, "→");
  assert.equal(next.getAttribute("aria-label"), "Dalej");

  next.click();
  // Poprzedni paragraf znika z ekranu: zostaje wyłącznie bieżący.
  assert.equal(root.children.length, 1);
  assert.equal(root.children[0].dataset.entryId, "2");
  assert.ok(!textOf(root).includes("Tu"));
});

test("rzut czeka na kliknięcie gracza, a potem odsłania kości po kolei", () => {
  const { root, clock, i18n, reveal } = setup({ "e1.p1": "Nasłuchujesz." });
  let completed = false;
  reveal.start({
    entryId: 1,
    originEntryId: null,
    events: [
      { kind: "text", key: "e1.p1" },
      { kind: "roll", skill: "Spot Hidden", target: 60, tens: [40], units: 3, result: 43, level: "hard", success: true },
    ],
  }, { i18n, onComplete: () => { completed = true; } });

  clock.tick(2000);
  reveal.tap();

  const gate = root.querySelector(".roll-gate");
  assert.equal(reveal.phase(), "gate");
  assert.match(gate.textContent, /^Rzuć: Spostrzegawczość · 60 \/ 30 \/ 12$/);
  assert.equal(root.querySelector(".rollbox"), null, "wynik nie może pojawić się przed kliknięciem");

  gate.click();
  const box = root.querySelector(".rollbox");
  assert.ok(box, "po kliknięciu pojawia się wynik");
  assert.equal(root.querySelector(".roll-gate"), null, "bramka znika po rzucie");
  const dice = box.querySelectorAll(".die, .roll-total, .roll-level");
  assert.deepEqual(dice.map((die) => die.style.animationDelay), ["0ms", "50ms", "100ms", "150ms"]);

  // Rzut kończący ramkę sam oddaje głos decyzjom, bez dodatkowego kliknięcia.
  assert.equal(completed, false);
  clock.tick(1000);
  assert.equal(completed, true);
  assert.equal(reveal.phase(), "done");
});

test("wybory wjeżdżają po kolei i zamykają ramkę", () => {
  const { root, clock, i18n, reveal } = setup({ "e1.p1": "I co teraz?", "e1.c1": "Wyjść", "e1.c2": "Zostać" });
  const chosen = [];
  let completed = false;
  reveal.start({
    entryId: 1,
    originEntryId: null,
    events: [
      { kind: "text", key: "e1.p1" },
      {
        kind: "choices",
        options: [
          { index: 0, key: "e1.c1", used: false, blocked: false },
          { index: 1, key: "e1.c2", used: false, blocked: false },
        ],
      },
    ],
  }, { i18n, handlers: { onChoose: (index) => chosen.push(index) }, onComplete: () => { completed = true; } });

  clock.tick(2000);
  reveal.tap();

  const choices = root.querySelectorAll(".choice");
  assert.deepEqual(choices.map((button) => button.textContent), ["Wyjść", "Zostać"]);
  assert.deepEqual(choices.map((button) => button.style.animationDelay), ["0ms", "100ms"]);
  assert.ok(choices.every((button) => button.classList.contains("appearing")));
  assert.equal(completed, true);
  assert.equal(reveal.phase(), "done");

  choices[1].click();
  assert.deepEqual(chosen, [1]);
  // Po decyzji klik w tło nie może już nic odsłaniać.
  assert.equal(reveal.tap(), false);
});

test("prefers-reduced-motion wyłącza wypisywanie, ale nie bramki", () => {
  const { root, i18n, reveal } = setup({ "e1.p1": "Bez animacji." }, { reducedMotion: true });
  reveal.start({ entryId: 1, originEntryId: null, events: [{ kind: "text", key: "e1.p1" }] }, { i18n });

  assert.ok(visibleText(root).includes("Bez animacji."));
  assert.equal(root.querySelectorAll(".veil").length, 0);
  assert.equal(reveal.phase(), "waiting");
});

test("stagger zwraca łączny czas wejścia i oznacza elementy", () => {
  const doc = createFakeDocument();
  const nodes = [doc.createElement("button"), doc.createElement("button")];
  assert.equal(stagger(nodes, 120), 240);
  assert.deepEqual(nodes.map((node) => node.style.animationDelay), ["0ms", "120ms"]);
  assert.ok(nodes.every((node) => node.classList.contains("appearing")));
});

// Pamięć poznanych paragrafów dociera do żywego renderu tą samą drogą co do
// dziennika: predykatem, bo ramka może przejść przez kilka paragrafów.
test("odsłanianie oznacza paragraf widziany wcześniej", () => {
  const { i18n, reveal } = setup({ "e1.p1": "Tekst." });
  const block = reveal.start(
    { entryId: 1, originEntryId: null, events: [{ kind: "text", key: "e1.p1" }] },
    { i18n, seenBefore: (entryId) => entryId === 1 },
  );
  assert.equal(block.dataset.seen, "true");
});

test("odsłanianie bez pamięci nie oznacza paragrafu", () => {
  const { i18n, reveal } = setup({ "e1.p1": "Tekst." });
  const block = reveal.start(
    { entryId: 1, originEntryId: null, events: [{ kind: "text", key: "e1.p1" }] },
    { i18n },
  );
  assert.equal(block.dataset.seen, undefined);
});

// Historia gałęzi jest decyzją, więc stoi przy bramce, a nie dopiero przy
// kościach. Po rzucie znika, żeby rollbox nie powtarzał jej dwa razy.
test("bramka rzutu pokazuje wcześniej uzyskane gałęzie i gubi je po rzucie", () => {
  const { root, i18n, reveal, clock } = setup({ "e3.p1": "A." });
  reveal.start({
    entryId: 3,
    originEntryId: null,
    events: [
      { kind: "text", key: "e3.p1" },
      { kind: "roll", skill: "Psychology", target: 45, result: 30, level: "regular", success: true, tens: [30], units: 0 },
    ],
  }, { i18n, handlers: { rollHistory: { Psychology: ["success", "fail"] } } });

  clock.tick(5000);
  reveal.tap();
  reveal.tap();

  const history = root.querySelector(".roll-history");
  assert.ok(history, "historia ma być widoczna przy bramce");
  assert.match(history.textContent, /Sukces · Porażka/);

  reveal.tap();
  clock.tick(5000);
  assert.equal(root.querySelectorAll(".roll-history").length, 1, "po rzucie zostaje tylko wersja z rollboxa");
});

test("domknięcie akapitu zgłasza się przez onParagraphDone dokładnie raz", () => {
  const { clock, i18n, reveal } = setup({ "e1.p1": "Krótko.", "e1.p2": "I jeszcze raz." });
  const done = [];

  reveal.start(
    {
      entryId: 1,
      originEntryId: null,
      events: [{ kind: "text", key: "e1.p1" }, { kind: "text", key: "e1.p2" }],
    },
    { i18n, onParagraphDone: (paragraph) => done.push(paragraph) },
  );

  clock.tick(2000);
  assert.equal(done.length, 1, "pierwszy akapit domknięty raz");
  assert.equal(done[0].tagName, "P");

  // Kliknięcie domyka bieżący akapit i odsłania następny.
  reveal.tap();
  clock.tick(2000);
  assert.equal(done.length, 2, "drugi akapit też się zgłasza");
  assert.notEqual(done[0], done[1], "to dwa różne akapity");
});
