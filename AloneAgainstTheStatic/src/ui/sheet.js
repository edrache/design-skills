import { penaltyFor } from "../engine/state.js";
import { termName } from "./terms.js";

const COPY = {
  en: {
    hp: "HP",
    san: "SAN",
    luck: "Luck",
    majorWound: "Major wound",
    indefinitelyInsane: "Indefinite insanity",
    log: "Log sheet",
    noFlags: "—",
    skills: "Skills",
    penalty: (value) => `penalty ${value}`,
    characteristics: "Characteristics",
    profile: "Profile",
    mp: "MP",
    move: "Move",
    build: "Build",
    damageBonus: "Damage bonus",
    story: "My story",
    background: "Background",
  },
  pl: {
    hp: "PW",
    san: "Poczytalność",
    luck: "Szczęście",
    majorWound: "Ciężka rana",
    indefinitelyInsane: "Długotrwała niepoczytalność",
    log: "Dziennik",
    noFlags: "—",
    skills: "Umiejętności",
    penalty: (value) => `kara ${value}`,
    characteristics: "Cechy",
    profile: "Parametry",
    mp: "PM",
    move: "Ruch",
    build: "Krzepa",
    damageBonus: "Modyfikator Obrażeń",
    story: "Moja historia",
    background: "Historia Badacza",
  },
};

const BACKSTORY_LABELS_PL = {
  "Personal Description": "Opis postaci",
  Traits: "Przymioty",
  "Ideology & Beliefs": "Ideologia i przekonania",
  "Significant People": "Ważne osoby",
  "Meaningful Locations": "Znaczące miejsca",
  "Treasured Possessions": "Rzeczy osobiste",
};

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function localized(field, locale) {
  if (typeof field === "string") return field;
  if (!field || typeof field !== "object") return "";

  const preferred = field[locale];
  if (typeof preferred === "string" && preferred.trim()) return preferred;
  return typeof field.en === "string" ? field.en : "";
}

function localizedLabel(label, locale) {
  return locale === "pl" ? (BACKSTORY_LABELS_PL[label] ?? label) : label;
}

function meter(doc, label, value, max, kind) {
  const current = Number.isFinite(value) ? value : 0;
  const maximum = Number.isFinite(max) && max > 0 ? max : 0;
  const percent = maximum === 0 ? 0 : Math.max(0, Math.min(100, (current / maximum) * 100));
  const item = el(doc, "div", "sheet-summary-item");

  item.append(el(doc, "div", null, `${label} ${current}/${maximum}`));

  const bar = el(doc, "div", `meter ${kind}`);
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", label);
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", String(maximum));
  bar.setAttribute("aria-valuenow", String(Math.max(0, Math.min(maximum, current))));
  bar.setAttribute("aria-valuetext", `${label}: ${current}/${maximum}`);

  const fill = el(doc, "span");
  fill.style.width = `${percent}%`;
  fill.setAttribute("aria-hidden", "true");
  bar.append(fill);
  item.append(bar);
  return item;
}

function heading(doc, text) {
  return el(doc, "h2", null, text);
}

function list(doc) {
  return el(doc, "ul");
}

function statRow(doc, label, value, suffix = "") {
  const row = el(doc, "li", "sheet-stat-row");
  const leader = el(doc, "span", "sheet-stat-leader");
  leader.setAttribute("aria-hidden", "true");
  row.append(
    el(doc, "span", "sheet-stat-label", label),
    leader,
    el(doc, "span", "sheet-stat-value", String(value)),
  );
  if (suffix) row.append(el(doc, "span", "sheet-stat-note", suffix));
  return row;
}

export function portraitSourceFor(character, state) {
  const id = typeof character?.id === "string" ? character.id : "";
  if (!id) return "";

  const base = `media/img/${id}.png`;
  if (id !== "charlie") return base;

  const maximum = Number.isFinite(state?.startingSan) && state.startingSan > 0
    ? state.startingSan
    : character.san;
  if (!Number.isFinite(maximum) || maximum <= 0 || !Number.isFinite(state?.san)) return base;

  const percent = Math.max(0, Math.min(100, (state.san / maximum) * 100));
  if (percent <= 20) return `media/img/${id}_0.png`;
  if (percent <= 40) return `media/img/${id}_25.png`;
  if (percent <= 60) return `media/img/${id}_50.png`;
  if (percent < 70) return `media/img/${id}_75.png`;
  return base;
}

// The panel mirrors the engine state; it never changes state or applies rules.
export function renderSheet(root, state, character, locale = "en") {
  const doc = root.ownerDocument ?? document;
  const text = COPY[locale] ?? COPY.en;
  const flags = Array.isArray(state.flags) ? state.flags : [];

  const summary = el(doc, "section", "sheet-summary");
  summary.setAttribute("aria-label", `${character.name}: ${text.hp}, ${text.san}, ${text.luck}`);

  const portrait = el(doc, "img", "sheet-portrait");
  portrait.src = portraitSourceFor(character, state);
  portrait.alt = "";
  portrait.width = 456;
  portrait.height = 596;
  portrait.decoding = "async";

  const stats = el(doc, "div", "sheet-summary-stats");
  stats.append(
    meter(doc, text.hp, state.hp, state.maxHp, "hp"),
    meter(doc, text.san, state.san, state.startingSan, "san"),
    meter(doc, text.luck, state.luck, 100, "luck"),
  );
  summary.append(portrait, stats);

  const content = el(doc, "div", "sheet-details");
  content.append(heading(doc, `${character.name} · ${localized(character.occupation, locale)}`));

  if (state.majorWound || state.indefinitelyInsane) {
    const warnings = list(doc);
    if (state.majorWound) warnings.append(el(doc, "li", null, `⚠ ${text.majorWound}`));
    if (state.indefinitelyInsane) warnings.append(el(doc, "li", null, `⚠ ${text.indefinitelyInsane}`));
    content.append(warnings);
  }

  const profile = [
    [text.mp, state.mp],
    [text.move, character.move],
    [text.build, character.build],
    [text.damageBonus, character.damageBonus],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (profile.length) {
    const profileList = list(doc);
    for (const [label, value] of profile) profileList.append(statRow(doc, `${label}:`, value));
    content.append(heading(doc, text.profile), profileList);
  }

  content.append(heading(doc, text.log));
  const flagList = list(doc);
  if (flags.length === 0) flagList.append(el(doc, "li", null, text.noFlags));
  for (const flag of flags) flagList.append(el(doc, "li", null, `☑ ${String(flag).replaceAll("_", " ")}`));
  content.append(flagList);

  content.append(heading(doc, text.skills));
  const skills = list(doc);
  for (const [name, value] of Object.entries(character.skills ?? {})) {
    const penalty = penaltyFor(state, name);
    const suffix = penalty ? ` (${text.penalty(penalty)})` : "";
    skills.append(statRow(doc, termName(name, locale), value, suffix));
  }
  content.append(skills);

  content.append(heading(doc, text.characteristics));
  const characteristics = list(doc);
  for (const [name, value] of Object.entries(character.characteristics ?? {})) {
    characteristics.append(statRow(doc, termName(name, locale), value));
  }
  content.append(characteristics);

  const story = localized(character.story, locale);
  if (story) content.append(heading(doc, text.story), el(doc, "p", null, story));

  const backstory = Array.isArray(character.backstory) ? character.backstory : [];
  if (backstory.length) {
    const background = list(doc);
    for (const field of backstory) {
      const value = localized(field, locale);
      if (value) background.append(el(doc, "li", null, `${localizedLabel(field.label, locale)}: ${value}`));
    }
    if (background.childElementCount) content.append(heading(doc, text.background), background);
  }

  root.replaceChildren(summary, content);
}
