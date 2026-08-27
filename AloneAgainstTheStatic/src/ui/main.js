import { createState } from "../engine/state.js";
import { enter, resume } from "../engine/runner.js";
import { createAudio } from "./audio.js";
import { createI18n } from "./i18n.js";
import { clearJournal, renderArchive, renderCheat, renderEvents, renderRollDecision } from "./journal.js";
import { clearSave, isSaveCompatible, loadGame, saveGame } from "./save.js";
import { connectProgressReset, createSettings } from "./settings.js";
import { readProgress, markChoice, resetProgress } from "./progress.js";
import { frameMemory, recordFrame } from "./memory.js";
import { dreadLevel } from "./dread.js";
import { renderSheet } from "./sheet.js";
import { createEffects } from "./effects.js";
import { createPointerStatic } from "./pointer-static.js";
import { createReveal, normalizeConfig, stagger } from "./reveal.js";

const UI_COPY = {
  pl: {
    htmlLang: "pl",
    languageButton: "EN",
    languageLabel: "Switch language to English",
    sheet: "Karta",
    settings: "Ustawienia",
    settingsKicker: "OBRAZ / DŹWIĘK",
    settingsTitle: "Ustawienia odtwarzania",
    narration: "Lektor",
    narrationVolume: "Głośność lektora",
    musicVolume: "Głośność muzyki",
    scanlines: "Linie skanowania",
    proseSize: "Rozmiar tekstu",
    textEffects: "Efekty tekstu",
    pointerStatic: "Zakłócenia kursora",
    close: "Zamknij",
    choose: "NAGRANIE OSOBISTE / WYBIERZ PERSPEKTYWĘ",
    who: "Kim jesteś?",
    intro: "Dwie osoby jadą do odciętej od świata chaty. Wybór określi, którą wersję wydarzeń zapamiętasz.",
    end: "KONIEC NAGRANIA",
    endTitle: "Taśma urywa się tutaj.",
    restart: "Przewiń i zacznij ponownie",
    newGame: "Nowa gra",
    newGameConfirm: "Zacząć od nowa? Zapis tej rozgrywki zostanie usunięty.",
    clearProgress: "Wyczyść poznane paragrafy",
    clearProgressConfirm: "Wyczyścić pamięć poznanych paragrafów? Bieżąca rozgrywka toczy się dalej.",
    finalEntry: "Paragraf końcowy",
    flags: "Dziennik",
    log: "Dziennik",
    logKicker: "ARCHIWUM / ODCZYTANE PARAGRAFY",
    logTitle: "Dziennik",
    logEmpty: "Taśma jeszcze nic nie zapisała.",
    sanShort: "P",
    hpShort: "PW",
    noFlags: "—",
    loadError: "Nie udało się odczytać taśmy. Sprawdź, czy gra działa przez lokalny serwer HTTP.",
    skip: "Przejdź do dziennika",
    tools: "Narzędzia",
    journal: "Dziennik rozgrywki",
    sheetLabel: "Karta postaci",
  },
  en: {
    htmlLang: "en",
    languageButton: "PL",
    languageLabel: "Zmień język na polski",
    sheet: "Sheet",
    settings: "Settings",
    settingsKicker: "PICTURE / SOUND",
    settingsTitle: "Playback settings",
    narration: "Narration",
    narrationVolume: "Narration volume",
    musicVolume: "Music volume",
    scanlines: "Scanlines",
    proseSize: "Text size",
    textEffects: "Text effects",
    pointerStatic: "Cursor interference",
    close: "Close",
    choose: "PERSONAL RECORD / CHOOSE A PERSPECTIVE",
    who: "Who are you?",
    intro: "Two people are driving to a cabin cut off from the world. Your choice decides which version of events you will remember.",
    end: "END OF RECORDING",
    endTitle: "The tape cuts out here.",
    restart: "Rewind and begin again",
    newGame: "New game",
    newGameConfirm: "Start over? This playthrough's save will be deleted.",
    clearProgress: "Clear discovered entries",
    clearProgressConfirm: "Clear the memory of discovered entries? The current playthrough continues.",
    finalEntry: "Final entry",
    flags: "Log sheet",
    log: "Log",
    logKicker: "ARCHIVE / ENTRIES READ",
    logTitle: "Log",
    logEmpty: "The tape has not recorded anything yet.",
    sanShort: "SAN",
    hpShort: "HP",
    noFlags: "—",
    loadError: "The tape could not be read. Make sure the game is running through a local HTTP server.",
    skip: "Skip to the journal",
    tools: "Tools",
    journal: "Game journal",
    sheetLabel: "Character sheet",
  },
};

const base = new URL("../../data/", import.meta.url);

async function load(name) {
  const response = await fetch(new URL(name, base));
  if (!response.ok) throw new Error(`Nie udało się wczytać ${name}: HTTP ${response.status}`);
  return response.json();
}

function storedLocale() {
  try { return localStorage.getItem("aats-locale") ?? "pl"; }
  catch { return "pl"; }
}

function rememberLocale(locale) {
  try { localStorage.setItem("aats-locale", locale); }
  catch { /* The game remains usable when storage is unavailable. */ }
}

const dom = {
  screens: {
    loading: document.querySelector("#screen-loading"),
    character: document.querySelector("#screen-character"),
    game: document.querySelector("#screen-game"),
    end: document.querySelector("#screen-end"),
  },
  journal: document.querySelector("#journal"),
  sheet: document.querySelector("#sheet"),
  characterChoices: document.querySelector("#character-choices"),
  endSummary: document.querySelector("#end-summary"),
  systemStatus: document.querySelector("#system-status"),
  langToggle: document.querySelector("#lang-toggle"),
  sheetToggle: document.querySelector("#sheet-toggle"),
  settingsToggle: document.querySelector("#settings-toggle"),
  settingsDialog: document.querySelector("#settings-dialog"),
  settingsKicker: document.querySelector("#settings-kicker"),
  settingsTitle: document.querySelector("#settings-title"),
  settingsClose: document.querySelector("#settings-close"),
  clearProgress: document.querySelector("#clear-progress"),
  restart: document.querySelector("#restart"),
  newGame: document.querySelector("#new-game"),
  logToggle: document.querySelector("#log-toggle"),
  logDialog: document.querySelector("#log-dialog"),
  logEntries: document.querySelector("#log-entries"),
  logKicker: document.querySelector("#log-kicker"),
  logTitle: document.querySelector("#log-title"),
  logClose: document.querySelector("#log-close"),
  skipLink: document.querySelector(".skip-link"),
  tools: document.querySelector(".topbar-actions"),
  journalHeading: document.querySelector("#screen-game h1"),
};

let characters;
let story;
let media;
let i18n;
let settings;
let audio;
let effects = null;
let pointerStatic = null;
let reveal = null;
let revealConfig = normalizeConfig(null);
let ctx = null;
let frame = null;
const history = [];
const compactSheet = globalThis.matchMedia?.("(max-width: 61.999rem)") ?? null;

// A compact semantic view for the automated browser loop and accessibility tooling.
globalThis.render_game_to_text = () => JSON.stringify({
  screen: Object.entries(dom.screens).find(([, node]) => !node.hidden)?.[0] ?? "unknown",
  character: ctx?.character.id ?? null,
  entryId: frame?.entryId ?? null,
  pending: frame?.pending?.type ?? null,
  reveal: reveal?.phase() ?? null,
  choices: frame?.pending?.options?.filter((option) => !option.used && !option.blocked).map((option) => option.index) ?? [],
  stats: frame ? { hp: frame.state.hp, san: frame.state.san, luck: frame.state.luck } : null,
});

// This journal has no continuous simulation; advancing time is intentionally a no-op.
globalThis.advanceTime = () => {};

function labels() {
  return UI_COPY[i18n?.locale ?? storedLocale()] ?? UI_COPY.pl;
}

function showScreen(name, { focus = false } = {}) {
  for (const [key, node] of Object.entries(dom.screens)) node.hidden = key !== name;
  dom.newGame.hidden = name !== "game";
  // Dziennik zostaje dostępny także po końcu taśmy — tam jest jedyne miejsce,
  // w którym można jeszcze przeczytać przebieg rozgrywki.
  dom.logToggle.hidden = name !== "game" && name !== "end";
  dom.sheet.hidden = name !== "game";
  if (name !== "game") {
    if (dom.logDialog.open && name !== "end") dom.logDialog.close();
    dom.sheet.classList.remove("open");
    dom.sheetToggle.setAttribute("aria-expanded", "false");
  }
  if (focus) {
    const heading = dom.screens[name].querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
}

function syncSheetDisclosure() {
  const details = dom.sheet.querySelector(".sheet-details");
  if (!details) return;
  const collapsed = Boolean(compactSheet?.matches) && !dom.sheet.classList.contains("open");
  details.inert = collapsed;
  details.setAttribute("aria-hidden", String(collapsed));
}

function renderCharacterSheet() {
  renderSheet(dom.sheet, frame.state, ctx.character, i18n.locale);
  syncSheetDisclosure();
}

// Pudełko rzutu, którego dotyczy punkt cofnięcia. Przy odtworzeniu ramki
// z zapisu nie ma zdarzeń do porównania po tożsamości, więc szukamy po
// wyniku; ostatnie pudełko jest ostatecznością.
function rollBoxOf(block, rewind) {
  const boxes = [...block.querySelectorAll(".rollbox")];
  const wanted = `= ${rewind.event?.result}`;
  return boxes.findLast((box) => box.querySelector(".roll-total")?.textContent === wanted)
    ?? boxes.at(-1)
    ?? block;
}

function draw(record, isLast) {
  const block = renderEvents(dom.journal, record.events, i18n, {
    onChoose: choose,
    takenChoices: record.takenChoices,
    rollHistory: record.rollHistory,
  }, {
    entryId: record.entryId,
    originEntryId: record.originEntryId,
    media,
    seenBefore: (entryId) => Boolean(record.seenEntries?.[entryId]),
  });
  if (isLast && frame.pending?.type === "rollDecision") {
    renderRollDecision(block, frame.pending, i18n, {
      onLuck: () => decide("luck"),
      onPush: () => decide("push"),
      onAccept: () => decide("accept"),
    });
  }
  if (isLast && frame.rewind) renderCheat(rollBoxOf(block, frame.rewind), frame.rewind, i18n, cheat);
  return block;
}

// Cienka warstwa zapisująca poziom rozpadu (patrz src/ui/dread.js) do
// zmiennej CSS odczytywanej przez style tekstu.
function setDread(state) {
  document.documentElement.style.setProperty("--dread", String(dreadLevel(state)));
}

// Na ekranie zostaje tylko bieżąca ramka; wcześniejsze paragrafy są dostępne
// wyłącznie w dzienniku (#log-dialog), żeby nie dało się przewinąć wzrokiem
// do treści, której gracz nie powinien już czytać.
function showCurrentInstantly() {
  reveal?.stop();
  effects?.unobserveAll();
  // Klony widmowe wiszą na wpisach, które clearJournal właśnie wyrzuci —
  // bez tego mapa modułu trzymałaby je do końca sesji.
  pointerStatic?.dropAll();
  clearJournal(dom.journal);
  const block = draw(history.at(-1), true);
  for (const node of dom.journal.children) {
    effects?.observe(node);
    // Rysowanie hurtem daje wpis od razu w całości — klon może powstać teraz.
    pointerStatic?.syncEntry(node);
  }
  return block;
}

function onParagraphShown(block) {
  effects?.observe(block);
  effects?.flash(block);
  block.focus?.({ preventScroll: true });
}

// Domknięcie ramki: to, co czeka po ostatnim kroku, a nie wynika ze zdarzeń.
// Wybory renderuje samo odsłanianie (są zdarzeniem), decyzja po rzucie i
// ekran końcowy — nie.
function finishFrame() {
  if (frame.pending?.type === "rollDecision") {
    const actions = renderRollDecision(reveal.block(), frame.pending, i18n, {
      onLuck: () => decide("luck"),
      onPush: () => decide("push"),
      onAccept: () => decide("accept"),
    });
    stagger(actions.children, revealConfig.choiceStaggerMs);
    // Przyciski decyzji zmieniły DOM wpisu, więc klon jest już nieaktualny —
    // odświeżenie musi być w tej gałęzi, nie po niej, bo ta wychodzi wcześniej.
    pointerStatic?.syncEntry(reveal.block());
    return;
  }
  // Druga gałąź domknięcia: wybory dokłada samo odsłanianie, zaraz przed tym
  // wywołaniem, więc klon musi się odświeżyć także tutaj.
  pointerStatic?.syncEntry(reveal.block());
  if (frame.pending?.type === "end") showEnd();
}

function presentCurrent() {
  effects?.unobserveAll();
  // Odsłanianie zaczyna od czystego dziennika, więc klony poprzedniej ramki
  // nie mają już do czego przylegać.
  pointerStatic?.dropAll();
  const record = history.at(-1);
  reveal.start(record, {
    i18n,
    media,
    seenBefore: (entryId) => Boolean(record.seenEntries?.[entryId]),
    handlers: {
      onChoose: choose,
      takenChoices: record.takenChoices,
      rollHistory: record.rollHistory,
    },
    onParagraph: onParagraphShown,
    // Klon widmowy powstaje dopiero po domknięciu akapitu: do tej chwili
    // reveal.js przepisuje jego węzły tekstowe co klatkę.
    onParagraphDone: (paragraph) => pointerStatic?.syncEntry(paragraph.parentElement),
    // Nawrót staje przy tych kościach, których dotyczy — a nie na końcu
    // ramki, która potrafi ciągnąć się przez kilka paragrafów dalej.
    onRoll: (event, box) => {
      if (frame.rewind?.event === event) renderCheat(box, frame.rewind, i18n, cheat);
      // Kości i przycisk nawrotu wchodzą do wpisu długo po domknięciu akapitu,
      // więc klon zbudowany wtedy pokazywałby wpis bez nich.
      pointerStatic?.syncEntry(box.parentElement);
    },
    onComplete: finishFrame,
  });
}

// `animate: false` służy wznowieniu zapisu: gracz tę ramkę już przeczytał,
// a stan odsłonięcia nie jest zapisywany.
function advance(next, originEntryId = null, { animate = true, replace = false } = {}) {
  frame = next;
  // Pamięć poznanych paragrafów idzie do rekordu, żeby dziennik pokazywał stan
  // z chwili wejścia w paragraf, a nie bieżący. Wznowiony zapis jest już
  // policzony w magazynie, więc nie liczymy tej wizyty drugi raz.
  const record = { entryId: frame.entryId, originEntryId, events: frame.events };
  Object.assign(record, frameMemory(record, readProgress(), { revisit: !animate }));
  if (replace) history.pop();
  history.push(record);
  if (animate) recordFrame(record);
  renderCharacterSheet();
  setDread(frame.state);
  refreshLog();
  saveGame({ characterId: ctx.character.id, frame, originEntryId, log: history.slice(0, -1) });
  audio?.playNarration(frame.entryId, i18n.locale);

  if (animate) {
    presentCurrent();
    return;
  }

  const block = showCurrentInstantly();
  if (frame.pending?.type === "end") showEnd();
  else block.focus?.({ preventScroll: true });
}

function redraw() {
  showCurrentInstantly();
  renderCharacterSheet();
  refreshLog();
  if (frame.pending?.type === "end") renderEndSummary();
}

// Dziennik przechowuje wszystkie ramki poza bieżącą, w kolejności czytania.
function renderLog() {
  // Po zakończeniu taśmy bieżąca ramka nie jest już nigdzie widoczna,
  // więc trafia do dziennika razem z pozostałymi.
  const past = frame?.pending?.type === "end" ? history : history.slice(0, -1);
  if (past.length === 0) {
    const empty = document.createElement("p");
    empty.className = "log-empty";
    empty.textContent = labels().logEmpty;
    dom.logEntries.replaceChildren(empty);
    return;
  }
  renderArchive(dom.logEntries, past, i18n, { media });
}

function refreshLog() {
  if (dom.logDialog.open) renderLog();
}

function choose(index) {
  const originEntryId = frame.entryId;
  markChoice(originEntryId, index);
  advance(resume(ctx, frame, { type: "choose", index }), originEntryId);
}

function decide(type) {
  const originEntryId = frame.entryId;
  advance(resume(ctx, frame, { type }), originEntryId);
}

// Nawrót przelicza ten sam paragraf od nowa, więc zastępuje ostatni rekord
// zamiast dopisywać kolejny — w dzienniku ma zostać jedna wersja zdarzeń,
// ta z przekreślonym oryginalnym werdyktem.
function cheat() {
  const record = history.at(-1);
  advance(resume(ctx, frame, { type: "cheat" }), record?.originEntryId ?? null, { replace: true });
}

function detailRow(term, value) {
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = term;
  dd.textContent = value;
  return [dt, dd];
}

function renderEndSummary() {
  const text = labels();
  const summary = document.createElement("dl");
  summary.append(
    ...detailRow(text.finalEntry, String(frame.entryId ?? "—")),
    ...detailRow("Hit Points", `${frame.state.hp} / ${frame.state.maxHp}`),
    ...detailRow("Sanity", `${frame.state.san} / ${frame.state.startingSan}`),
    ...detailRow("Luck", String(frame.state.luck)),
    ...detailRow(text.flags, frame.state.flags.join(", ") || text.noFlags),
  );
  dom.endSummary.replaceChildren(summary);
}

function showEnd() {
  renderEndSummary();
  showScreen("end", { focus: true });
}

function startGame(characterId) {
  const character = characters[characterId];
  if (!character) return;

  clearSave();
  ctx = { story, character, rng: Math.random };
  frame = null;
  history.length = 0;
  reveal?.stop();
  effects?.unobserveAll();
  pointerStatic?.dropAll();
  clearJournal(dom.journal);
  showScreen("game");
  const start = story.starts?.[character.id] ?? story.start;
  advance(enter(ctx, createState(character, { rng: Math.random }), start));
}

// Zawód w karcie postaci jest wpisem {en, pl}; starsze dane mogą być stringiem.
function occupationOf(character, locale) {
  const field = character.occupation;
  if (typeof field === "string") return field;
  const preferred = field?.[locale];
  if (typeof preferred === "string" && preferred.trim()) return preferred;
  return typeof field?.en === "string" ? field.en : "";
}

function renderCharacterChoice({ focus = false } = {}) {
  const text = labels();
  const locale = i18n?.locale ?? storedLocale();
  dom.characterChoices.replaceChildren();

  for (const character of Object.values(characters)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "character-choice";
    const occupation = occupationOf(character, locale);
    button.setAttribute("aria-label", `${character.name}, ${occupation}`);

    const portrait = document.createElement("img");
    portrait.className = "character-portrait";
    portrait.src = `media/img/${character.id}.png`;
    portrait.alt = "";
    portrait.width = 456;
    portrait.height = 596;
    portrait.decoding = "async";

    const name = document.createElement("span");
    name.className = "character-name";
    name.textContent = character.name;
    const role = document.createElement("span");
    role.className = "character-role";
    role.textContent = occupation;
    const vitals = document.createElement("span");
    vitals.className = "character-vitals";
    vitals.textContent = `${text.sanShort} ${character.san} · ${text.hpShort} ${character.hp}`;

    button.append(portrait, name, role, vitals);
    button.addEventListener("click", () => startGame(character.id));
    dom.characterChoices.append(button);
  }

  document.querySelector("#screen-character .eyebrow").textContent = text.choose;
  document.querySelector("#screen-character .screen-title").textContent = text.who;
  document.querySelector("#screen-character .screen-intro").textContent = text.intro;
  showScreen("character", { focus });
}

function updateChrome() {
  const text = labels();
  document.documentElement.lang = text.htmlLang;
  dom.langToggle.textContent = text.languageButton;
  dom.langToggle.setAttribute("aria-label", text.languageLabel);
  dom.sheetToggle.textContent = text.sheet;
  dom.settingsToggle.textContent = text.settings;
  document.querySelector("#screen-end .eyebrow").textContent = text.end;
  document.querySelector("#screen-end .screen-title").textContent = text.endTitle;
  dom.restart.textContent = text.restart;
  dom.newGame.textContent = text.newGame;
  dom.logToggle.textContent = text.log;
  dom.logKicker.textContent = text.logKicker;
  dom.logTitle.textContent = text.logTitle;
  dom.logClose.textContent = text.close;
  dom.skipLink.textContent = text.skip;
  dom.tools.setAttribute("aria-label", text.tools);
  dom.journalHeading.textContent = text.journal;
  dom.sheet.setAttribute("aria-label", text.sheetLabel);
  dom.settingsKicker.textContent = text.settingsKicker;
  dom.settingsTitle.textContent = text.settingsTitle;
  document.querySelector("#label-narration").textContent = text.narration;
  document.querySelector("#label-narration-volume").textContent = text.narrationVolume;
  document.querySelector("#label-music-volume").textContent = text.musicVolume;
  document.querySelector("#label-scanlines").textContent = text.scanlines;
  document.querySelector("#label-prose").textContent = text.proseSize;
  document.querySelector("#label-text-effects").textContent = text.textEffects;
  document.querySelector("#label-pointer-static").textContent = text.pointerStatic;
  dom.settingsClose.textContent = text.close;
  dom.clearProgress.textContent = text.clearProgress;
}

const settingControls = {
  narration: [document.querySelector("#set-narration"), "checked"],
  narrationVolume: [document.querySelector("#set-narration-volume"), "value"],
  musicVolume: [document.querySelector("#set-music-volume"), "value"],
  scanlines: [document.querySelector("#set-scanlines"), "value"],
  proseSize: [document.querySelector("#set-prose"), "value"],
  textEffects: [document.querySelector("#set-text-effects"), "value"],
  pointerStatic: [document.querySelector("#set-pointer-static"), "value"],
};

function connectSettingsControls() {
  for (const [key, [input, property]] of Object.entries(settingControls)) {
    input[property] = settings.values[key];
    input.addEventListener("input", () => {
      settings.set(key, property === "checked" ? input.checked : Number(input.value));
    });
  }
}

dom.langToggle.addEventListener("click", () => {
  const next = (i18n?.locale ?? storedLocale()) === "pl" ? "en" : "pl";
  if (i18n) i18n.setLocale(next);
  rememberLocale(next);
  updateChrome();

  if (!i18n) {
    const title = dom.screens.loading.querySelector(".screen-title");
    if (title.classList.contains("error-state")) title.textContent = labels().loadError;
  } else if (frame) {
    redraw();
    audio?.playNarration(frame.entryId, next);
  }
  else if (characters) renderCharacterChoice();
});

dom.sheetToggle.addEventListener("click", () => {
  const open = dom.sheet.classList.toggle("open");
  dom.sheetToggle.setAttribute("aria-expanded", String(open));
  syncSheetDisclosure();
});

compactSheet?.addEventListener?.("change", syncSheetDisclosure);

// Klik w tło paragrafu i Enter/Spacja odsłaniają dalej. Przyciski obsługują
// się same, więc klik w wybór, bramkę rzutu czy „→" nie może liczyć się
// podwójnie.
dom.screens.game.addEventListener("click", (event) => {
  if (event.target.closest?.("button, a, input, label, select, textarea")) return;
  reveal?.tap();
});

const TAP_KEYS = new Set(["Enter", " ", "Spacebar"]);
const TYPING_TAGS = new Set(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"]);

document.addEventListener("keydown", (event) => {
  if (!TAP_KEYS.has(event.key) || event.repeat) return;
  if (dom.screens.game.hidden) return;
  if (dom.logDialog.open || dom.settingsDialog.open) return;
  if (TYPING_TAGS.has(document.activeElement?.tagName)) return;
  if (reveal?.tap()) event.preventDefault();
});

dom.logToggle.addEventListener("click", () => {
  if (!i18n || typeof dom.logDialog.showModal !== "function") return;
  renderLog();
  dom.logDialog.showModal();
  dom.logEntries.scrollTop = dom.logEntries.scrollHeight;
});
dom.logClose.addEventListener("click", () => dom.logDialog.close());
// Zdarzenie close trafia do kolejki zadań, więc może dojść po ponownym
// otwarciu dziennika — czyścimy archiwum tylko wtedy, gdy okno faktycznie
// jest zamknięte.
dom.logDialog.addEventListener("close", () => {
  if (!dom.logDialog.open) dom.logEntries.replaceChildren();
});

dom.settingsToggle.addEventListener("click", () => {
  if (!settings || typeof dom.settingsDialog.showModal !== "function") return;
  dom.settingsDialog.showModal();
  dom.settingsToggle.setAttribute("aria-expanded", "true");
});
dom.settingsDialog.addEventListener("close", () => dom.settingsToggle.setAttribute("aria-expanded", "false"));
function startOver() {
  audio?.stopAll();
  clearSave();
  frame = null;
  ctx = null;
  history.length = 0;
  document.documentElement.style.setProperty("--dread", "0");
  reveal?.stop();
  effects?.unobserveAll();
  pointerStatic?.dropAll();
  clearJournal(dom.journal);
  dom.logEntries.replaceChildren();
  renderCharacterChoice({ focus: true });
}

dom.restart.addEventListener("click", startOver);
dom.newGame.addEventListener("click", () => {
  // W trakcie rozgrywki restart kasuje zapis, więc pytamy raz o potwierdzenie.
  if (!window.confirm(labels().newGameConfirm)) return;
  startOver();
});

async function bootstrap() {
  const [loadedCharacters, loadedStory, en, pl, loadedMedia, loadedReveal, loadedMusic] = await Promise.all([
    load("characters.json"),
    load("story.json"),
    load("text.en.json"),
    load("text.pl.json"),
    load("media.json"),
    // Brak pliku z rytmem odsłaniania nie może zatrzymać gry — zostają
    // wartości domyślne z reveal.js.
    load("reveal.json").catch(() => null),
    // Spis utworów powstaje skryptem `npm run music`; jego brak oznacza ciszę,
    // a nie zatrzymanie gry.
    load("music.json").catch(() => null),
  ]);

  characters = loadedCharacters;
  story = loadedStory;
  media = loadedMedia;
  i18n = createI18n({ en, pl }, storedLocale());
  settings = createSettings();
  audio = createAudio(media, settings);
  audio.startMusic(loadedMusic?.tracks);
  effects = createEffects({ root: dom.journal });
  pointerStatic = createPointerStatic({ root: dom.journal });
  revealConfig = normalizeConfig(loadedReveal);
  reveal = createReveal({ root: dom.journal, config: revealConfig });
  // Suwak "Efekty tekstu" ustawia --text-effects, ale nic samo z siebie nie
  // budzi pętli rAF w effects.js — bez tego zjazd na zero zostawiałby
  // filtry na elementach aż do najbliższego ruchu wskaźnika po dzienniku.
  settings.subscribe(() => {
    effects?.recompute();
    pointerStatic?.recompute();
    // Zjazd suwaka zakłóceń do zera zdejmuje wszystkie klony, więc podniesienie
    // go z powrotem nie ma już czego pokazać — sama pętla nie odtworzy tego, co
    // usunęła. Wpisy leżące w dzienniku trzeba zsynchronizować ponownie;
    // przy sile 0 syncEntry sprawdza wygaszenie i wychodzi, więc suwak
    // stojący na zerze nic nie kosztuje.
    for (const node of [...dom.journal.children]) pointerStatic?.syncEntry(node);
  });
  connectSettingsControls();
  connectProgressReset({
    button: dom.clearProgress,
    confirm: (message) => window.confirm(message),
    message: () => labels().clearProgressConfirm,
    reset: resetProgress,
  });
  updateChrome();
  const saved = loadGame();
  const savedCharacter = saved ? characters[saved.characterId] : null;
  if (saved && savedCharacter && isSaveCompatible(saved, story, savedCharacter)) {
    ctx = { story, character: savedCharacter, rng: Math.random };
    history.length = 0;
    // Odtworzone archiwum wraca do dziennika, żeby po odświeżeniu strony
    // przeczytane paragrafy nie zniknęły.
    history.push(...(saved.log ?? []));
    clearJournal(dom.journal);
    showScreen("game");
    advance(saved.frame, saved.originEntryId, { animate: false });
  } else {
    if (saved) clearSave();
    renderCharacterChoice({ focus: true });
  }
}

bootstrap().catch((error) => {
  console.error(error);
  const locale = storedLocale();
  const text = UI_COPY[locale] ?? UI_COPY.pl;
  const title = dom.screens.loading.querySelector(".screen-title");
  title.classList.add("error-state");
  title.textContent = text.loadError;
});
