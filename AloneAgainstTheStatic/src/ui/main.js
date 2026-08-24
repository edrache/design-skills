import { createState } from "../engine/state.js";
import { enter, resume } from "../engine/runner.js";
import { createAudio } from "./audio.js";
import { createI18n } from "./i18n.js";
import { clearJournal, renderEvents, renderRollDecision } from "./journal.js";
import { clearSave, isSaveCompatible, loadGame, saveGame } from "./save.js";
import { createSettings } from "./settings.js";
import { dreadLevel } from "./dread.js";
import { renderSheet } from "./sheet.js";
import { createEffects } from "./effects.js";

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
    close: "Zamknij",
    choose: "NAGRANIE OSOBISTE / WYBIERZ PERSPEKTYWĘ",
    who: "Kim jesteś?",
    intro: "Dwie osoby jadą do odciętej od świata chaty. Wybór określi, którą wersję wydarzeń zapamiętasz.",
    end: "KONIEC NAGRANIA",
    endTitle: "Taśma urywa się tutaj.",
    restart: "Przewiń i zacznij ponownie",
    newGame: "Nowa gra",
    newGameConfirm: "Zacząć od nowa? Zapis tej rozgrywki zostanie usunięty.",
    finalEntry: "Paragraf końcowy",
    flags: "Dziennik",
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
    close: "Close",
    choose: "PERSONAL RECORD / CHOOSE A PERSPECTIVE",
    who: "Who are you?",
    intro: "Two people are driving to a cabin cut off from the world. Your choice decides which version of events you will remember.",
    end: "END OF RECORDING",
    endTitle: "The tape cuts out here.",
    restart: "Rewind and begin again",
    newGame: "New game",
    newGameConfirm: "Start over? This playthrough's save will be deleted.",
    finalEntry: "Final entry",
    flags: "Log sheet",
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
  restart: document.querySelector("#restart"),
  newGame: document.querySelector("#new-game"),
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
  dom.sheet.hidden = name !== "game";
  if (name !== "game") {
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

function draw(record, isLast) {
  const block = renderEvents(dom.journal, record.events, i18n, { onChoose: choose }, {
    entryId: record.entryId,
    originEntryId: record.originEntryId,
    media,
  });
  if (isLast && frame.pending?.type === "rollDecision") {
    renderRollDecision(block, frame.pending, i18n, {
      onLuck: () => decide("luck"),
      onPush: () => decide("push"),
      onAccept: () => decide("accept"),
    });
  }
  return block;
}

// Cienka warstwa zapisująca poziom rozpadu (patrz src/ui/dread.js) do
// zmiennej CSS odczytywanej przez style tekstu.
function setDread(state) {
  document.documentElement.style.setProperty("--dread", String(dreadLevel(state)));
}

function advance(next, originEntryId = null) {
  frame = next;
  history.push({ entryId: frame.entryId, originEntryId, events: frame.events });
  const block = draw(history.at(-1), true);
  renderCharacterSheet();
  setDread(frame.state);
  effects?.observe(block);
  effects?.flash(block);
  saveGame({ characterId: ctx.character.id, frame, originEntryId });
  audio?.playNarration(frame.entryId, i18n.locale);
  audio?.playScene(story.entries[String(frame.entryId)]?.scene);
  if (frame.pending?.type === "end") showEnd();
  else block.focus({ preventScroll: true });
}

function redraw() {
  clearJournal(dom.journal);
  history.forEach((record, index) => draw(record, index === history.length - 1));
  renderCharacterSheet();
  for (const block of dom.journal.children) effects?.observe(block);
  if (frame.pending?.type === "end") renderEndSummary();
}

function choose(index) {
  const originEntryId = frame.entryId;
  advance(resume(ctx, frame, { type: "choose", index }), originEntryId);
}

function decide(type) {
  const originEntryId = frame.entryId;
  advance(resume(ctx, frame, { type }), originEntryId);
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
  dom.settingsClose.textContent = text.close;
}

const settingControls = {
  narration: [document.querySelector("#set-narration"), "checked"],
  narrationVolume: [document.querySelector("#set-narration-volume"), "value"],
  musicVolume: [document.querySelector("#set-music-volume"), "value"],
  scanlines: [document.querySelector("#set-scanlines"), "value"],
  proseSize: [document.querySelector("#set-prose"), "value"],
  textEffects: [document.querySelector("#set-text-effects"), "value"],
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
  clearJournal(dom.journal);
  renderCharacterChoice({ focus: true });
}

dom.restart.addEventListener("click", startOver);
dom.newGame.addEventListener("click", () => {
  // W trakcie rozgrywki restart kasuje zapis, więc pytamy raz o potwierdzenie.
  if (!window.confirm(labels().newGameConfirm)) return;
  startOver();
});

async function bootstrap() {
  const [loadedCharacters, loadedStory, en, pl, loadedMedia] = await Promise.all([
    load("characters.json"),
    load("story.json"),
    load("text.en.json"),
    load("text.pl.json"),
    load("media.json"),
  ]);

  characters = loadedCharacters;
  story = loadedStory;
  media = loadedMedia;
  i18n = createI18n({ en, pl }, storedLocale());
  settings = createSettings();
  audio = createAudio(media, settings);
  effects = createEffects({ root: dom.journal });
  connectSettingsControls();
  updateChrome();
  const saved = loadGame();
  const savedCharacter = saved ? characters[saved.characterId] : null;
  if (saved && savedCharacter && isSaveCompatible(saved, story, savedCharacter)) {
    ctx = { story, character: savedCharacter, rng: Math.random };
    history.length = 0;
    clearJournal(dom.journal);
    showScreen("game");
    advance(saved.frame, saved.originEntryId);
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
