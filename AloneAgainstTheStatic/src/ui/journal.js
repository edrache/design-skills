import { MADNESS_ENTRIES } from "./madness.js";
import { termName } from "./terms.js";
import { renderMarkup } from "./render-markup.js";

const COPY = {
  pl: {
    entry: "Paragraf",
    critical: "Sukces krytyczny",
    extreme: "Ekstremalny sukces",
    hard: "Trudny sukces",
    regular: "Normalny sukces",
    fail: "Porażka",
    fumble: "Pech",
    pushed: "rzut forsowany",
    spentLuck: (amount) => `Wydano ${amount} pkt. Szczęścia`,
    sanityLoss: (amount) => `Utrata Poczytalności: ${amount}`,
    damage: (amount) => `Obrażenia: ${amount}`,
    healing: (amount) => `Odzyskane PW: ${amount}`,
    luckRestored: (amount) => `Odzyskane Szczęście: ${amount}`,
    flag: (flag) => `Zapisano: ${flag.replaceAll("_", " ")}`,
    missing: (id) => `Paragraf ${id} nie został jeszcze przepisany. Dalszy zapis taśmy jest niedostępny.`,
    burnLuck: (amount) => `Wydaj ${amount} pkt. Szczęścia`,
    push: "Forsuj rzut",
    accept: "Przyjmij wynik",
    roll: "Rzuć",
    next: "Dalej",
    rollHistory: "Już było",
    cheatToSuccess: "A może jednak się udało?",
    cheatToFail: "A może jednak test się nie udał?",
    cheated: "zapis poprawiony",
    branch: { success: "Sukces", fail: "Porażka", pushedFail: "Porażka forsowana" },
  },
  en: {
    entry: "Entry",
    critical: "Critical",
    extreme: "Extreme success",
    hard: "Hard success",
    regular: "Success",
    fail: "Failure",
    fumble: "Fumble",
    pushed: "pushed",
    spentLuck: (amount) => `${amount} Luck spent`,
    sanityLoss: (amount) => `Sanity loss: ${amount}`,
    damage: (amount) => `Damage: ${amount}`,
    healing: (amount) => `Hit points restored: ${amount}`,
    luckRestored: (amount) => `Luck restored: ${amount}`,
    flag: (flag) => `Recorded: ${flag.replaceAll("_", " ")}`,
    missing: (id) => `Entry ${id} has not been transcribed yet. The rest of the tape is unavailable.`,
    burnLuck: (amount) => `Spend ${amount} Luck`,
    push: "Push the roll",
    accept: "Accept the result",
    roll: "Roll",
    next: "Continue",
    rollHistory: "Seen before",
    cheatToSuccess: "Or did it succeed after all?",
    cheatToFail: "Or did the roll fail after all?",
    cheated: "record amended",
    branch: { success: "Success", fail: "Failure", pushedFail: "Pushed failure" },
  },
};

function copy(i18n) {
  return COPY[i18n.locale] ?? COPY.en;
}

// Etykiety wpisu są potrzebne też odsłanianiu (reveal.js), które buduje wpis
// krok po kroku, a nie przez renderEvents.
export function entryLabels(i18n) {
  return copy(i18n);
}

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function entryIdFromTextKey(key) {
  const match = /^e(\d+)\.(?:p|c|r)\d+$/.exec(String(key));
  return match ? Number(match[1]) : null;
}

// Runner może w jednej ramce przejść przez kilka automatycznych paragrafów.
// Klucz tekstu zachowuje numer źródłowego paragrafu, więc dzielimy ramkę na
// osobne wpisy bez przenoszenia tej odpowiedzialności do silnika.
export function segmentEvents(events, context = {}) {
  let entryId = context.originEntryId ?? context.entryId ?? null;
  let current = [];
  const segments = [];

  for (const event of events) {
    // Te zdarzenia sterują interpreterem, ale nie mają własnej reprezentacji
    // wizualnej. Redirect przed pierwszym tekstem wskazuje właściwy paragraf
    // startowy (np. gdy zadziała guard).
    if (event.kind === "redirect") {
      if (current.length === 0 && event.to !== undefined) entryId = event.to;
      continue;
    }
    if (event.kind === "end") continue;

    const textEntryId = event.kind === "text" ? entryIdFromTextKey(event.key) : null;
    if (textEntryId !== null && textEntryId !== entryId) {
      if (current.length) segments.push({ entryId, events: current });
      entryId = textEntryId;
      current = [];
    }
    current.push(event);
  }

  if (current.length || segments.length === 0) segments.push({ entryId, events: current });
  return segments;
}

export function rollPresentation(event) {
  const adjustedResult = Number(event.result ?? 0);
  const spentLuck = Number(event.spentLuck ?? 0);
  const rawResult = spentLuck > 0 ? adjustedResult + spentLuck : adjustedResult;
  return {
    rawResult,
    adjustedResult,
    total: spentLuck > 0 ? `= ${rawResult} → ${adjustedResult}` : `= ${adjustedResult}`,
  };
}

// Nagłówek rzutu w jednym miejscu: używa go i gotowy wynik, i bramka, która
// każe graczowi rzucić samemu.
function rollHead(event, i18n) {
  const labels = copy(i18n);
  const target = Number(event.target ?? 0);
  const skill = termName(event.skill, i18n.locale);
  const head = `${skill} · ${target} / ${Math.floor(target / 2)} / ${Math.floor(target / 5)}`;
  return event.pushed ? `${head} · ${labels.pushed}` : head;
}

export function rollGateLabel(event, i18n) {
  return `${copy(i18n).roll}: ${rollHead(event, i18n)}`;
}

// Pamięć poznanych gałęzi trafia tu z zewnątrz (main.js przez `handlers`,
// dziennik przez rekord), więc journal.js nie wie nic o localStorage.
// Źródłem może być lista gałęzi, mapa `skill → lista` albo funkcja zdarzenia;
// brak źródła znaczy brak historii.
function listFrom(source, event) {
  if (!source) return [];
  if (typeof source === "function") return listFrom(source(event), event);
  if (Array.isArray(source)) return source;
  if (typeof source === "object") return listFrom(source[event?.skill] ?? null, event);
  return [];
}

function renderRollHistory(doc, event, labels, source) {
  const branches = listFrom(source, event).filter((branch) => labels.branch?.[branch]);
  if (branches.length === 0) return null;
  const names = branches.map((branch) => labels.branch[branch]).join(" · ");
  return el(doc, "div", "roll-history", `${labels.rollHistory}: ${names}`);
}

// Bramka rzutu (reveal.js) powstaje przed kośćmi, a historia jest najbardziej
// przydatna właśnie wtedy — zanim gracz zdecyduje, czy rzucać.
export function rollHistoryNode(doc, event, i18n, source) {
  return renderRollHistory(doc, event, copy(i18n), source);
}

function renderRoll(doc, event, i18n, rollHistory) {
  const labels = copy(i18n);
  const box = el(doc, "div", "rollbox");
  const target = Number(event.target ?? 0);
  const skill = termName(event.skill, i18n.locale);
  box.append(el(doc, "div", "roll-head", rollHead(event, i18n)));

  const presentation = rollPresentation(event);
  const dice = el(doc, "div", "roll-dice");
  dice.setAttribute("aria-label", `${skill}: ${presentation.total.slice(2)}`);
  for (const tens of event.tens ?? []) {
    const candidate = tens === 0 && event.units === 0 ? 100 : tens + event.units;
    const kept = candidate === presentation.rawResult;
    const die = el(doc, "span", kept ? "die" : "die discarded", String(tens).padStart(2, "0"));
    if (!kept) die.setAttribute("aria-label", `${tens}, odrzucona`);
    dice.append(die);
  }
  dice.append(el(doc, "span", "die", String(event.units ?? 0)));
  dice.append(el(doc, "span", "roll-total", presentation.total));
  // Odwrócony werdykt nie ukrywa oryginału: przekreślony wynik stoi obok
  // nowego, żeby dziennik nie kłamał nawet wtedy, gdy gracz skłamał.
  if (event.cheated && event.cheatedFrom) {
    const original = labels[event.cheatedFrom.level] ?? event.cheatedFrom.level;
    dice.append(el(doc, "span", "roll-level cheated-from", original));
  }
  dice.append(el(doc, "span", `roll-level ${event.success ? "ok" : "bad"}`, labels[event.level] ?? event.level));
  box.append(dice);

  if (event.cheated) box.append(el(doc, "div", "roll-head cheat-note", labels.cheated));

  if (event.spentLuck) box.append(el(doc, "div", "roll-head", labels.spentLuck(event.spentLuck)));

  const history = renderRollHistory(doc, event, labels, rollHistory);
  if (history) box.append(history);
  return box;
}

// `options.seenBefore` znaczy: ten paragraf gracz widział w którejś
// wcześniejszej rozgrywce. Argument jest opcjonalny, więc starsze wywołania
// (reveal.js) zostają bez zmian i nic nie oznaczają.
export function createEntryBlock(doc, entryId, labels, media, options = {}) {
  const block = el(doc, "article", "journal-entry");
  block.tabIndex = -1;
  if (options?.seenBefore) block.dataset.seen = "true";

  if (entryId !== undefined && entryId !== null) {
    block.dataset.entryId = String(entryId);
    block.setAttribute("aria-label", `${labels.entry} ${entryId}`);
    const number = el(doc, "div", "entry-number");
    number.append(`${labels.entry} `, el(doc, "b", null, String(entryId)));
    block.append(number);
  }

  const image = resolveEntryImage(media, entryId, options?.scene, options?.previousImage);
  if (image) {
    const figure = el(doc, "figure", "entry-art");
    const artwork = el(doc, "img", "entry-image");
    const madness = el(doc, "img", "entry-madness");
    try {
      artwork.src = new URL(image, new URL("../../", import.meta.url));
      madness.src = new URL("media/img/madness.webp", new URL("../../", import.meta.url));
    } catch {
      return block;
    }
    artwork.alt = "";
    artwork.loading = "lazy";
    artwork.decoding = "async";
    // Bez kadru sama warstwa szaleństwa nie ma czego zniekształcać, więc
    // błąd ładowania zdejmuje całą figurę, nie sam obraz.
    artwork.addEventListener("error", () => figure.remove());

    madness.alt = "";
    madness.setAttribute("aria-hidden", "true");
    madness.loading = "lazy";
    madness.decoding = "async";
    madness.addEventListener("error", () => madness.remove());

    // Warstwa powstaje przy każdym kadrze, bo poziom szaleństwa zmienia się
    // w trakcie gry, a wyrenderowane bloki zostają w dzienniku. Jeden URL na
    // całą grę, więc przeglądarka pobiera go raz.
    figure.dataset.madness = MADNESS_ENTRIES.includes(Number(entryId)) ? "entry" : "drift";
    figure.append(artwork, madness);

    // Ścieżka zostaje na bloku, żeby kolejny paragraf mógł ją odziedziczyć
    // bez przeliczania URL-a z powrotem na zapis z media.json.
    block.dataset.image = image;
    block.append(figure);
  }
  return block;
}

// Obraz konkretnego paragrafu ma pierwszeństwo przed ilustracją sceny. Dzięki
// temu wspólne lokacje nie wymagają powtarzania tej samej ścieżki w media.json,
// ale nadal można nadać wybranemu paragrafowi osobny kadr.
//
// Wpis oznaczony jako `inherit` nie ma własnego kadru — powtarza grafikę
// poprzedniego paragrafu. Tak działają wstawki szaleństwa (328–333): opisują
// stan umysłu, a nie miejsce, więc zostają tam, gdzie zastały gracza. Gdy nie
// ma czego dziedziczyć (ramka zaczyna się od takiego paragrafu), zostaje
// ilustracja sceny.
export function resolveEntryImage(media, entryId, scene, previousImage) {
  const own = media?.entries?.[String(entryId)];
  const inherited = own?.inherit && typeof previousImage === "string" && previousImage
    ? previousImage
    : null;
  const image = inherited ?? (own?.inherit ? null : own?.image) ?? media?.scenes?.[scene]?.image;
  return typeof image === "string" && image ? image : null;
}

// Ostatnia grafika w kontenerze — punkt odniesienia dla paragrafu, który
// dziedziczy kadr po poprzedniku z wcześniejszej ramki.
export function lastEntryImage(root) {
  const blocks = root?.querySelectorAll?.(".journal-entry") ?? [];
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const image = blocks[index]?.dataset?.image;
    if (image) return image;
  }
  return null;
}

export function sealEntry(block) {
  if (!block?.classList?.contains("journal-entry")) return;
  block.classList.add("past");
  for (const button of block.querySelectorAll("button")) button.disabled = true;
}

// Zwraca węzły jednego zdarzenia, bez wstawiania ich do wpisu. Dzięki temu
// ten sam kod obsługuje rysowanie hurtem (renderEvents, renderArchive) i
// odsłanianie krok po kroku (reveal.js).
export function eventNodes(doc, event, labels, i18n, handlers = {}) {
  if (event.kind === "text") return [renderMarkup(doc, i18n.t(event.key))];
  if (event.kind === "roll") return [renderRoll(doc, event, i18n, handlers.rollHistory)];
  if (event.kind === "san") return [el(doc, "div", "event-note", labels.sanityLoss(event.amount))];
  if (event.kind === "hp") return [el(doc, "div", "event-note damage", labels.damage(event.amount))];
  if (event.kind === "heal") return [el(doc, "div", "event-note", labels.healing(event.amount))];
  if (event.kind === "luck") return [el(doc, "div", "event-note", labels.luckRestored(event.amount))];
  if (event.kind === "flag") return [el(doc, "div", "event-note", labels.flag(event.flag))];
  if (event.kind === "missing") return [el(doc, "div", "missing", labels.missing(event.entryId))];

  if (event.kind === "choices") {
    // Lista indeksów wybranych kiedykolwiek wcześniej. Stan niezależny od
    // `used`/`blocked`: opcja zostaje klikalna, tylko przygaszona.
    const taken = listFrom(handlers.takenChoices, event);
    return event.options.map((option) => {
      const button = el(doc, "button", "choice", i18n.t(option.key));
      button.type = "button";
      button.disabled = option.used || option.blocked;
      if (option.used) button.dataset.reason = "used";
      if (option.blocked) button.dataset.reason = "blocked";
      if (taken.includes(option.index)) button.dataset.taken = "true";
      button.addEventListener("click", () => handlers.onChoose?.(option.index));
      return button;
    });
  }

  return [];
}

function appendEvent(block, event, doc, labels, i18n, handlers) {
  for (const node of eventNodes(doc, event, labels, i18n, handlers)) block.append(node);
}

// Render only what the engine reports. Rules and state transitions stay in runner.js.
export function renderEvents(root, events, i18n, handlers, context = {}) {
  const doc = root.ownerDocument ?? document;
  const labels = copy(i18n);
  sealEntry(root.lastElementChild);

  // `context.seenBefore`: flaga dla całej ramki albo predykat numeru
  // paragrafu, gdy ramka przeszła przez kilka paragrafów naraz.
  const seenBefore = typeof context.seenBefore === "function"
    ? context.seenBefore
    : () => Boolean(context.seenBefore);

  let block = null;
  let previousImage = lastEntryImage(root);
  for (const segment of segmentEvents(events, context)) {
    if (block) sealEntry(block);
    block = createEntryBlock(doc, segment.entryId, labels, context.media, {
      seenBefore: seenBefore(segment.entryId),
      scene: context.sceneForEntry?.(segment.entryId),
      previousImage,
    });
    previousImage = block.dataset.image ?? previousImage;
    for (const event of segment.events) appendEvent(block, event, doc, labels, i18n, handlers);
    root.append(block);
  }

  if (typeof block.scrollIntoView === "function") {
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    block.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }
  return block;
}

// Klon widmowy (pointer-static.js) wisi WEWNĄTRZ wpisu i niesie pełną kopię
// jego węzłów, razem z pudełkiem rzutu. Naiwne „ostatnie .rollbox" trafiałoby
// więc w warstwę aria-hidden/inert, którą każda synchronizacja klonu buduje od
// nowa — dopięty tam panel decyzji nigdy nie dotarłby do gracza. Kopie
// odsiewamy przez porównanie z poddrzewami klonów, a nie przez `closest`,
// bo ten sam kod ma działać na uproszczonym dokumencie z testów.
export function lastRollBox(block) {
  if (typeof block?.querySelectorAll !== "function") return null;
  const ghosted = new Set(
    [...block.querySelectorAll(".static-ghost")]
      .flatMap((ghost) => [...(ghost.querySelectorAll?.(".rollbox") ?? [])]),
  );
  return [...block.querySelectorAll(".rollbox")].filter((box) => !ghosted.has(box)).at(-1) ?? null;
}

// Jeden panel na wszystkie decyzje po rzucie: przyjęcie wyniku jest zawsze,
// forsowanie i Szczęście zależą od zasad, a cheat stoi obok nich — zamiast, jak
// dawniej, dopiero po tym, jak skutki rzutu już się wykonały.
export function renderRollDecision(block, pending, i18n, handlers) {
  const doc = block.ownerDocument ?? document;
  const labels = copy(i18n);
  const actions = el(doc, "div", "roll-actions");

  const accept = el(doc, "button", "action", labels.accept);
  accept.type = "button";
  accept.addEventListener("click", handlers.onAccept);
  actions.append(accept);

  if (pending.canPush) {
    const push = el(doc, "button", "action action-danger", labels.push);
    push.type = "button";
    push.addEventListener("click", handlers.onPush);
    actions.append(push);
  }
  if (pending.canLuck) {
    const luck = el(doc, "button", "action", labels.burnLuck(pending.luckCost));
    luck.type = "button";
    luck.addEventListener("click", handlers.onLuck);
    actions.append(luck);
  }

  const target = lastRollBox(block) ?? block;
  target.append(actions);

  // Przycisk jest celowo ledwo widoczny — trzeba go poszukać, a wtedy zapala
  // się na czerwono. Stoi po pozostałych, bo dotyczy tego samego wyniku.
  if (pending.canCheat) {
    const cheat = el(
      doc, "button", "cheat",
      pending.roll?.success ? labels.cheatToFail : labels.cheatToSuccess,
    );
    cheat.type = "button";
    cheat.addEventListener("click", handlers.onCheat);
    target.append(cheat);
  }

  return actions;
}

// Rozwiązanie rzutu w tym samym paragrafie to wciąż ta sama wizyta, więc
// scalony wpis dziedziczy pamięć wpisu, który jest na ekranie. Przeliczenie jej
// od nowa dałoby podpowiedź „Już było" o rzucie wykonanym sekundę wcześniej:
// magazyn zdążył już zapisać jego gałąź. Z tego samego powodu dziedziczy się
// lista podjętych wyborów — snapshot pochodzi z chwili wejścia w paragraf.
export function inheritedMemory(record) {
  return {
    seenBefore: record?.seenBefore ?? false,
    seenEntries: { ...(record?.seenEntries ?? {}) },
    takenChoices: [...(record?.takenChoices ?? [])],
    rollHistory: { ...(record?.rollHistory ?? {}) },
  };
}

// Ramka po decyzji o rzucie niesie tylko przyrost zdarzeń. Jeśli nie ma w nim
// tekstu, gra została w tym samym paragrafie — przyrost trzeba dopisać do wpisu,
// który jest na ekranie, zamiast zastępować go samym skutkiem.
export function opensNewParagraph(events) {
  return (events ?? []).some((event) => event.kind === "text");
}

// Archiwum: te same wpisy, tylko do czytania. Nie przewija ekranu i nie
// podłącza akcji — przyciski wyborów zostają widoczne (są częścią tekstu
// paragrafu), ale zapieczętowane jak wpisy przeszłe.
export function renderArchive(root, records, i18n, context = {}) {
  const doc = root.ownerDocument ?? document;
  const labels = copy(i18n);
  root.replaceChildren();

  // Archiwum jest liniowe, więc dziedziczenie kadru liczy się tak samo jak
  // w trakcie gry — po prostu od pierwszego rekordu.
  let previousImage = null;
  for (const record of records) {
    const segments = segmentEvents(record.events, {
      entryId: record.entryId,
      originEntryId: record.originEntryId,
    });
    // Oznaczenia archiwum biorą się z rekordu, nie z bieżącej pamięci: wpis
    // był „widziany wcześniej" w chwili wejścia w paragraf, nie teraz.
    // Brak pól w rekordzie = brak oznaczeń (stare zapisy).
    const handlers = { rollHistory: record.rollHistory };
    for (const segment of segments) {
      const block = createEntryBlock(doc, segment.entryId, labels, context.media, {
        seenBefore: record.seenBefore,
        scene: context.sceneForEntry?.(segment.entryId),
        previousImage,
      });
      previousImage = block.dataset.image ?? previousImage;
      for (const event of segment.events) appendEvent(block, event, doc, labels, i18n, handlers);
      sealEntry(block);
      root.append(block);
    }
  }
  return root;
}

export function clearJournal(root) {
  root.replaceChildren();
}
