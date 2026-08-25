import { createEffects } from "../src/ui/effects.js";
import { inspectMarkup, stripMarkup, tagCounts } from "../src/ui/markup.js";
import { renderMarkup } from "../src/ui/render-markup.js";
import { TAGS } from "../src/ui/voices.js";

const TAG_COPY = Object.freeze({
  charlie: ["Charlie", "Nazwana kwestia Charliego; cały akapit dostaje układ scenariuszowy."],
  alex: ["Alex", "Nazwana kwestia Alex; cały akapit dostaje układ scenariuszowy."],
  mark: ["Mark", "Nazwana kwestia Marka; cały akapit dostaje układ scenariuszowy."],
  julie: ["Julie", "Nazwana kwestia Julie; cały akapit dostaje układ scenariuszowy."],
  tom: ["Tom", "Nazwana kwestia Toma; cały akapit dostaje układ scenariuszowy."],
  you: ["Ty", "Głos bohatera pozostaje neutralny i nie wyświetla imienia."],
  voice: ["Nieznany głos", "Mówca bez imienia; przygaszona kwestia bez etykiety."],
  horror: ["Coś porusza się w szumie.", "Groza: czerwień, szerszy rytm liter i zakłócenie statyczne."],
  whisper: ["Nie odwracaj się.", "Szept: mniejszy, przygaszony tekst o szerokim świetle liter."],
  shout: ["UCIEKAJ!", "Krzyk: zwarty krój konsolowy, kapitaliki i duży ciężar."],
  thought: ["To nie może być prawda.", "Myśl: fosforyzujący kolor i kursywa."],
  radio: ["…sygnał zanika…", "Radio: konsolowy zapis z efektem uszkodzonego sygnału."],
  sign: ["BRAK PRZEJŚCIA", "Napis: obramowana tabliczka zapisana kapitalikami."],
  wrong: ["Wszystko jest w porządku.", "Fałsz: subtelne rozmycie rosnące wraz z grozą."],
});

const TAG_COLORS = Object.freeze({
  charlie: "var(--voice-charlie)",
  alex: "var(--voice-alex)",
  mark: "var(--voice-mark)",
  julie: "var(--voice-julie)",
  tom: "var(--voice-tom)",
  you: "var(--paper)",
  voice: "var(--paper-dim)",
  horror: "var(--rec-soft)",
  whisper: "var(--paper-dim)",
  shout: "var(--editor-yellow)",
  thought: "var(--phosphor)",
  radio: "var(--paper-dim)",
  sign: "var(--editor-yellow)",
  wrong: "var(--rec-soft)",
});

const $ = (selector, root = document) => root.querySelector(selector);
const elements = {
  previous: $("#previous-entry"),
  next: $("#next-entry"),
  number: $("#entry-number"),
  total: $("#entry-total"),
  locale: $("#locale"),
  save: $("#save"),
  saveLabel: $("#save-label"),
  filter: $("#entry-filter"),
  list: $("#entry-list"),
  kicker: $("#entry-kicker"),
  title: $("#current-title"),
  meta: $("#entry-meta"),
  voiceTags: $("#voice-tags"),
  toneTags: $("#tone-tags"),
  removeTag: $("#remove-tag"),
  selectionHint: $("#selection-hint"),
  blocks: $("#text-blocks"),
  template: $("#text-block-template"),
  samples: $("#tag-samples"),
  dread: $("#dread-level"),
  toast: $("#toast"),
};

const state = {
  data: null,
  ids: [],
  currentId: null,
  locale: "pl",
  activeTextarea: null,
  baselines: { en: new Map(), pl: new Map() },
  dirty: new Set(),
  saving: false,
};

const effects = createEffects({ root: document.body });
let toastTimer = 0;

function entryKeys(entry) {
  return [...(entry.text ?? []), ...(entry.choices ?? []).map((choice) => choice.text)];
}

function token(locale, key) {
  return `${locale}:${key}`;
}

function showToast(message, error = false) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("is-error", error);
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 3600);
}

function renderMarkupInto(container, value) {
  container.replaceChildren(renderMarkup(document, value || " "));
}

function refreshEffects() {
  effects.unobserveAll();
  effects.observe(document.body);
}

function validationFor(value) {
  const inspected = inspectMarkup(value);
  const errors = [
    ...inspected.unclosed.map((name) => `Niedomknięty [${name}]`),
    ...inspected.stray.map((name) => `Brak otwarcia dla [/${name}]`),
  ];
  const warnings = Object.keys(tagCounts(value))
    .filter((name) => !Object.hasOwn(TAGS, name))
    .map((name) => `Nieznany [${name}]`);
  return { errors, warnings };
}

function compareTags(key, value) {
  if (state.locale !== "pl" || !value.trim()) return [];
  const reference = tagCounts(state.data.texts.en[key] ?? "");
  const current = tagCounts(value);
  const names = new Set([...Object.keys(reference), ...Object.keys(current)]);
  return [...names]
    .filter((name) => (reference[name] ?? 0) !== (current[name] ?? 0))
    .map((name) => `[${name}]: PL ${current[name] ?? 0}, EN ${reference[name] ?? 0}`);
}

function updateBlock(block, key, value) {
  const result = validationFor(value);
  const differences = compareTags(key, value);
  const dirty = state.dirty.has(token(state.locale, key));
  block.classList.toggle("is-dirty", dirty);
  block.classList.toggle("has-error", result.errors.length > 0);
  $(".text-block__state", block).textContent = result.errors.length ? "sprawdź tagi" : dirty ? "zmieniono" : "bez zmian";
  const messages = [...result.errors, ...result.warnings, ...differences];
  $(".markup-message", block).textContent = messages.join(" · ");
  renderMarkupInto($(".journal-entry", block), value);
}

function setDirty(locale, key, value) {
  const entryToken = token(locale, key);
  if (value === state.baselines[locale].get(key)) state.dirty.delete(entryToken);
  else state.dirty.add(entryToken);
  updateSaveButton();
}

function updateSaveButton() {
  const count = state.dirty.size;
  elements.save.disabled = count === 0 || state.saving;
  elements.saveLabel.textContent = state.saving ? "Zapisuję…" : count ? `Zapisz (${count})` : "Zapisano";
}

function selectionChanged(textarea) {
  state.activeTextarea = textarea;
  const length = Math.max(0, textarea.selectionEnd - textarea.selectionStart);
  elements.selectionHint.classList.toggle("has-selection", length > 0);
  elements.selectionHint.textContent = length
    ? `Zaznaczono ${length} ${length === 1 ? "znak" : "znaków"}. Wybierz tag.`
    : "Zaznacz fragment tekstu, a potem wybierz tag.";
}

function roleFor(entry, key) {
  const paragraph = (entry.text ?? []).indexOf(key);
  if (paragraph >= 0) return `Akapit ${paragraph + 1}`;
  const choice = (entry.choices ?? []).findIndex((item) => item.text === key);
  return `Wybór ${choice + 1}`;
}

function referenceFor(key) {
  const referenceLocale = state.locale === "pl" ? "en" : "pl";
  return state.data.texts[referenceLocale][key] ?? "Brak tekstu odniesienia.";
}

function renderEntry() {
  const entry = state.data.story.entries[state.currentId];
  const index = state.ids.indexOf(state.currentId);
  const keys = entryKeys(entry);
  state.activeTextarea = null;
  elements.number.value = String(state.currentId);
  elements.previous.disabled = index <= 0;
  elements.next.disabled = index >= state.ids.length - 1;
  elements.kicker.textContent = `PARAGRAF / ${String(state.currentId).padStart(3, "0")}`;
  elements.title.textContent = `Scena: ${entry.scene ?? "bez nazwy"}`;
  elements.meta.textContent = `${keys.length} ${keys.length === 1 ? "fragment" : "fragmentów"} · ${entry.choices?.length ?? 0} wyborów`;
  elements.blocks.replaceChildren();

  for (const key of keys) {
    const fragment = elements.template.content.cloneNode(true);
    const block = $(".text-block", fragment);
    const textarea = $("textarea", fragment);
    const value = state.data.texts[state.locale][key] ?? "";
    $(".text-block__type", fragment).textContent = roleFor(entry, key);
    $(".text-block__key", fragment).textContent = key;
    $(".reference p", fragment).textContent = referenceFor(key);
    textarea.value = value;
    textarea.dataset.key = key;
    textarea.addEventListener("focus", () => selectionChanged(textarea));
    for (const name of ["select", "keyup", "mouseup"]) textarea.addEventListener(name, () => selectionChanged(textarea));
    textarea.addEventListener("input", () => {
      state.data.texts[state.locale][key] = textarea.value;
      setDirty(state.locale, key, textarea.value);
      updateBlock(block, key, textarea.value);
      renderRail();
      refreshEffects();
    });
    updateBlock(block, key, value);
    elements.blocks.append(fragment);
  }

  elements.selectionHint.classList.remove("has-selection");
  elements.selectionHint.textContent = "Zaznacz fragment tekstu, a potem wybierz tag.";
  renderRail();
  refreshEffects();
}

function tagCountForEntry(id) {
  const entry = state.data.story.entries[id];
  const names = new Set(entryKeys(entry).flatMap((key) => Object.keys(tagCounts(state.data.texts[state.locale][key] ?? ""))));
  return names.size;
}

function entryIsDirty(id) {
  return entryKeys(state.data.story.entries[id]).some((key) => state.dirty.has(token(state.locale, key)));
}

function renderRail() {
  const query = elements.filter.value.trim().toLocaleLowerCase("pl");
  const fragment = document.createDocumentFragment();
  for (const id of state.ids) {
    const entry = state.data.story.entries[id];
    if (query && !String(id).includes(query) && !(entry.scene ?? "").toLocaleLowerCase("pl").includes(query)) continue;
    const item = document.createElement("li");
    const button = document.createElement("button");
    const number = document.createElement("span");
    const scene = document.createElement("span");
    const tags = document.createElement("span");
    number.className = "entry-list__number";
    scene.className = "entry-list__scene";
    tags.className = "entry-list__tags";
    number.textContent = String(id).padStart(3, "0");
    scene.textContent = entry.scene ?? "—";
    tags.textContent = `${tagCountForEntry(id)}T`;
    button.type = "button";
    button.dataset.id = id;
    button.ariaCurrent = id === state.currentId ? "true" : "false";
    button.classList.toggle("is-dirty", entryIsDirty(id));
    button.append(number, scene, tags);
    button.addEventListener("click", () => goTo(id));
    item.append(button);
    fragment.append(item);
  }
  elements.list.replaceChildren(fragment);
}

function goTo(id) {
  const numeric = Number(id);
  if (!state.ids.includes(numeric)) {
    showToast(`Paragraf ${id} nie istnieje w story.json.`, true);
    elements.number.value = String(state.currentId);
    return;
  }
  state.currentId = numeric;
  renderEntry();
  $(".workbench").scrollTo({ top: 0, behavior: "smooth" });
}

function stepEntry(direction) {
  const index = state.ids.indexOf(state.currentId);
  const target = state.ids[index + direction];
  if (target !== undefined) goTo(target);
}

function applyTag(name) {
  const textarea = state.activeTextarea;
  if (!textarea || textarea.selectionStart === textarea.selectionEnd) {
    showToast("Najpierw zaznacz fragment tekstu.", true);
    textarea?.focus();
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const opening = `[${name}]`;
  const closing = `[/${name}]`;
  textarea.setRangeText(`${opening}${selected}${closing}`, start, end, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
  textarea.setSelectionRange(start + opening.length, start + opening.length + selected.length);
  selectionChanged(textarea);
}

function removeTag() {
  const textarea = state.activeTextarea;
  if (!textarea) return showToast("Najpierw wybierz fragment w polu tekstowym.", true);
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end);

  for (const name of Object.keys(TAGS)) {
    const opening = `[${name}]`;
    const closing = `[/${name}]`;
    if (value.slice(0, start).endsWith(opening) && value.slice(end).startsWith(closing)) {
      const openAt = start - opening.length;
      textarea.setRangeText(selected, openAt, end + closing.length, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
      textarea.setSelectionRange(openAt, openAt + selected.length);
      selectionChanged(textarea);
      return;
    }
  }

  const plain = stripMarkup(selected);
  if (selected && plain !== selected) {
    textarea.setRangeText(plain, start, end, "end");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
    textarea.setSelectionRange(start, start + plain.length);
    selectionChanged(textarea);
    return;
  }
  showToast("Zaznaczenie nie jest otoczone tagiem.", true);
}

function makeTagButton(name, info) {
  const button = document.createElement("button");
  button.className = "tag-button";
  button.type = "button";
  button.textContent = name;
  button.title = TAG_COPY[name]?.[1] ?? `Dodaj [${name}]`;
  button.style.setProperty("--tag-color", TAG_COLORS[name]);
  button.addEventListener("pointerdown", (event) => event.preventDefault());
  button.addEventListener("click", () => applyTag(name));
  return button;
}

function renderTagTools() {
  for (const [name, info] of Object.entries(TAGS)) {
    const button = makeTagButton(name, info);
    (info.kind === "voice" ? elements.voiceTags : elements.toneTags).append(button);

    const sample = document.createElement("article");
    sample.className = "tag-sample";
    sample.style.setProperty("--tag-color", TAG_COLORS[name]);
    const tagName = document.createElement("span");
    const copy = document.createElement("div");
    const preview = document.createElement("div");
    const journal = document.createElement("div");
    const description = document.createElement("p");
    tagName.className = "tag-sample__name";
    copy.className = "tag-sample__copy";
    preview.className = "tag-sample__preview";
    journal.className = "journal-entry";
    description.className = "tag-sample__description";
    tagName.textContent = name;
    description.textContent = TAG_COPY[name]?.[1] ?? "Znacznik stylu tekstu.";
    renderMarkupInto(journal, `[${name}]${TAG_COPY[name]?.[0] ?? "Przykład"}[/${name}]`);
    preview.append(journal);
    copy.append(preview, description);
    sample.append(tagName, copy);
    elements.samples.append(sample);
  }
}

async function saveChanges() {
  if (!state.dirty.size || state.saving) return;
  state.saving = true;
  updateSaveButton();
  const pending = [...state.dirty];
  let saved = 0;
  try {
    for (const entryToken of pending) {
      const separator = entryToken.indexOf(":");
      const locale = entryToken.slice(0, separator);
      const key = entryToken.slice(separator + 1);
      const response = await fetch(`/api/text/${locale}/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          value: state.data.texts[locale][key],
          expected: state.baselines[locale].get(key),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Object.assign(new Error(result.error ?? "Nie udało się zapisać."), { result });
      state.baselines[locale].set(key, result.value);
      state.dirty.delete(entryToken);
      saved += 1;
    }
    showToast(`Zapisano ${saved} ${saved === 1 ? "fragment" : "fragmentów"}.`);
  } catch (error) {
    const conflict = error.result?.current;
    showToast(conflict !== undefined
      ? "Plik został zmieniony poza edytorem. Odśwież stronę, aby nie nadpisać cudzej pracy."
      : error.message, true);
  } finally {
    state.saving = false;
    updateSaveButton();
    renderRail();
    if (state.currentId !== null) renderEntry();
  }
}

function bindControls() {
  elements.previous.addEventListener("click", () => stepEntry(-1));
  elements.next.addEventListener("click", () => stepEntry(1));
  elements.number.addEventListener("change", () => goTo(elements.number.value));
  elements.filter.addEventListener("input", renderRail);
  elements.locale.addEventListener("change", () => {
    state.locale = elements.locale.value;
    renderEntry();
  });
  elements.save.addEventListener("click", saveChanges);
  elements.removeTag.addEventListener("pointerdown", (event) => event.preventDefault());
  elements.removeTag.addEventListener("click", removeTag);
  elements.dread.addEventListener("input", () => {
    document.documentElement.style.setProperty("--dread", elements.dread.value);
    refreshEffects();
  });
  window.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "s") {
      event.preventDefault();
      saveChanges();
    }
    if (event.ctrlKey && event.key === "PageUp") stepEntry(-1);
    if (event.ctrlKey && event.key === "PageDown") stepEntry(1);
  });
  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty.size) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function init() {
  try {
    const response = await fetch("/api/editor-data", { cache: "no-store" });
    if (!response.ok) throw new Error("Nie udało się wczytać danych edytora.");
    state.data = await response.json();
    state.ids = Object.keys(state.data.story.entries).map(Number).sort((a, b) => a - b);
    state.currentId = state.ids[0];
    for (const locale of ["en", "pl"]) state.baselines[locale] = new Map(Object.entries(state.data.texts[locale]));
    elements.total.textContent = `/ ${state.ids.length}`;
    elements.number.min = String(state.ids[0]);
    elements.number.max = String(state.ids.at(-1));
    renderTagTools();
    bindControls();
    renderEntry();
  } catch (error) {
    elements.title.textContent = "Nie udało się uruchomić edytora";
    elements.meta.textContent = error.message;
    showToast(`${error.message} Uruchom stronę przez npm run tag:editor.`, true);
  }
}

init();
