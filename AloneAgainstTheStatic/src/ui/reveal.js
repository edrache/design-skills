import {
  createEntryBlock, entryLabels, eventNodes, rollGateLabel, rollHistoryNode, segmentEvents,
} from "./journal.js";

// Prędkość i rytm odsłaniania są danymi, nie kodem — patrz data/reveal.json.
// Tu zostają tylko wartości awaryjne, gdyby pliku nie dało się wczytać.
export const DEFAULTS = Object.freeze({
  charsPerSecond: 45,
  punctuationPauseMs: Object.freeze({
    ".": 240, "!": 240, "?": 240, "…": 340, ",": 100, ";": 140, ":": 140, "—": 160,
  }),
  choiceStaggerMs: 180,
  dieStaggerMs: 140,
});

const MAX_CPS = 1000;
const MAX_PAUSE_MS = 5000;

// JSON daje liczby albo nic — konwersja z tekstu czy null-a tylko ukrywałaby
// literówkę w pliku konfiguracyjnym.
function positiveNumber(value, fallback, max) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(value, max);
}

function nonNegativeNumber(value, fallback, max) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback;
  return Math.min(value, max);
}

// Każde pole waliduje się osobno: literówka w jednym nie może zabrać
// sensownych wartości pozostałym ani zatrzymać gry.
export function normalizeConfig(raw) {
  const source = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const pauses = source.punctuationPauseMs !== null
    && typeof source.punctuationPauseMs === "object"
    && !Array.isArray(source.punctuationPauseMs)
    ? source.punctuationPauseMs
    : {};

  const punctuationPauseMs = {};
  for (const [mark, value] of Object.entries(pauses)) {
    const pause = nonNegativeNumber(value, null, MAX_PAUSE_MS);
    if (pause !== null) punctuationPauseMs[mark] = pause;
  }

  return {
    charsPerSecond: positiveNumber(source.charsPerSecond, DEFAULTS.charsPerSecond, MAX_CPS),
    punctuationPauseMs: Object.keys(punctuationPauseMs).length
      ? punctuationPauseMs
      : { ...DEFAULTS.punctuationPauseMs },
    choiceStaggerMs: nonNegativeNumber(source.choiceStaggerMs, DEFAULTS.choiceStaggerMs, MAX_PAUSE_MS),
    dieStaggerMs: nonNegativeNumber(source.dieStaggerMs, DEFAULTS.dieStaggerMs, MAX_PAUSE_MS),
  };
}

// Moment pojawienia się każdego znaku. Pauzy interpunkcyjne robią z tego
// funkcję nieliniową, ale wciąż czystą: łatwo ją przetestować bez zegara.
export function charTimeline(text, config = DEFAULTS) {
  const perChar = 1000 / config.charsPerSecond;
  const times = [];
  let time = 0;
  for (const character of String(text)) {
    time += perChar;
    times.push(time);
    time += config.punctuationPauseMs?.[character] ?? 0;
  }
  return times;
}

// Ile znaków powinno być widoczne po `elapsed` ms. Timeline jest rosnący,
// więc wystarczy szukanie binarne.
export function visibleCount(timeline, elapsed) {
  let low = 0;
  let high = timeline.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (timeline[middle] <= elapsed) low = middle + 1;
    else high = middle;
  }
  return low;
}

function childNodesOf(node) {
  return node.childNodes ?? node.children ?? [];
}

function isTextNode(node) {
  return node?.nodeType === 3;
}

function readText(node) {
  return node.data ?? node.value ?? "";
}

function writeText(node, value) {
  if ("data" in node) node.data = value;
  else node.value = value;
}

function nextSiblingOf(parent, node) {
  if ("nextSibling" in node) return node.nextSibling;
  const kids = childNodesOf(parent);
  return kids[[...kids].indexOf(node) + 1] ?? null;
}

// Zbiera węzły tekstowe wraz z ich pozycją w akapicie oraz elementy, których
// pseudoelementy (kropka przed kwestią) muszą milczeć, dopóki maszyna nie
// dojdzie do ich tekstu.
//
// Za każdym węzłem tekstowym staje "kotara": span z jeszcze nieodsłoniętą
// resztą, ukryty przez `visibility: hidden`. Ukryty tekst nadal zajmuje
// miejsce, więc łamanie wierszy jest od pierwszej klatki takie, jak dla
// pełnego akapitu — słowa nie przeskakują w trakcie pisania.
export function scanParagraph(paragraph) {
  const doc = paragraph.ownerDocument ?? globalThis.document;
  const texts = [];
  const marks = [];
  let offset = 0;

  const walk = (node) => {
    for (const child of [...childNodesOf(node)]) {
      if (isTextNode(child)) {
        const full = readText(child);
        texts.push({ node: child, parent: node, full, start: offset });
        offset += full.length;
        continue;
      }
      marks.push({ element: child, start: offset });
      walk(child);
    }
  };

  walk(paragraph);

  for (const text of texts) {
    // Węzeł z samych białych znaków nie ma czego chować: spacja i tak jest
    // niewidoczna, a kotara na końcu akapitu psułaby miejsce kursora.
    if (text.full.trim() === "") continue;
    const veil = doc.createElement("span");
    veil.className = "veil";
    veil.append(doc.createTextNode(text.full));
    text.parent.insertBefore(veil, nextSiblingOf(text.parent, text.node));
    text.veil = veil;
    text.veilText = childNodesOf(veil)[0];
  }

  return { texts, marks, total: offset };
}

export function applyVisible(scan, count) {
  let cursorPlaced = false;
  for (const text of scan.texts) {
    const visible = Math.max(0, Math.min(text.full.length, count - text.start));
    writeText(text.node, text.full.slice(0, visible));
    if (!text.veil) continue;
    const rest = text.full.slice(visible);
    writeText(text.veilText, rest);
    // Kursor stoi na pierwszej kotarze, która jeszcze coś zasłania.
    if (!cursorPlaced && rest.trim() !== "") {
      text.veil.dataset.cursor = "";
      cursorPlaced = true;
    } else {
      delete text.veil.dataset.cursor;
    }
  }
  for (const mark of scan.marks) {
    if (count > mark.start) delete mark.element.dataset.pending;
    else mark.element.dataset.pending = "";
  }
}

// Po odsłonięciu całości kotary schodzą: w DOM zostaje dokładnie to, co
// renderuje rysowanie hurtem.
export function dropVeils(scan) {
  for (const text of scan.texts) {
    writeText(text.node, text.full);
    text.veil?.remove?.();
    text.veil = null;
    text.veilText = null;
  }
}

// Wejście na scenę: elementy dostają klasę animacji i opóźnienie zależne od
// pozycji, więc kolejność wynika z CSS, a nie z łańcucha timerów.
export function stagger(nodes, stepMs) {
  let index = 0;
  for (const node of nodes) {
    node.classList?.add("appearing");
    if (node.style) node.style.animationDelay = `${index * stepMs}ms`;
    index += 1;
  }
  return index * stepMs;
}

const NO_SCROLL = { preventScroll: true };

export function createReveal({
  root,
  config = DEFAULTS,
  now = () => performance.now(),
  raf = (callback) => globalThis.requestAnimationFrame(callback),
  cancelRaf = (handle) => globalThis.cancelAnimationFrame(handle),
  delay = (callback, ms) => globalThis.setTimeout(callback, ms),
  reducedMotion = () => Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
}) {
  const doc = root.ownerDocument ?? globalThis.document;
  let session = null;

  function clearTimers() {
    if (session?.rafHandle !== undefined) {
      cancelRaf(session.rafHandle);
      session.rafHandle = undefined;
    }
  }

  function el(tag, className, text) {
    const node = doc.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  // Znak zachęty siedzi na ostatnim odsłoniętym węźle, a nie na wpisie:
  // dzięki temu miga dokładnie tam, gdzie gracz skończył czytać.
  function clearWaiting() {
    if (!session?.awaiting) return;
    delete session.awaiting.dataset.awaiting;
    session.awaiting = null;
  }

  function waitFor(node) {
    clearWaiting();
    if (node) {
      node.dataset.awaiting = "";
      session.awaiting = node;
    }
    session.phase = "waiting";
  }

  function finishTyping() {
    clearTimers();
    if (!session?.typing) return;
    const { paragraph, scan } = session.typing;
    applyVisible(scan, scan.total);
    dropVeils(scan);
    delete paragraph.dataset.typing;
    paragraph.removeAttribute?.("aria-hidden");
    session.typing = null;
    waitFor(paragraph);
  }

  function typeParagraph(paragraph) {
    const scan = scanParagraph(paragraph);
    const text = scan.texts.map((entry) => entry.full).join("");
    session.typing = { paragraph, scan };

    if (reducedMotion() || scan.total === 0) {
      finishTyping();
      return;
    }

    // Czytnik ekranu dostaje akapit dopiero w całości: #journal jest regionem
    // aria-live, więc odsłanianie znak po znaku literowałoby tekst.
    paragraph.setAttribute?.("aria-hidden", "true");
    paragraph.dataset.typing = "";
    applyVisible(scan, 0);

    const timeline = charTimeline(text, config);
    const started = now();
    session.phase = "typing";

    const step = () => {
      if (!session?.typing) return;
      const count = visibleCount(timeline, now() - started);
      applyVisible(scan, count);
      if (count >= scan.total) {
        finishTyping();
        return;
      }
      session.rafHandle = raf(step);
    };
    session.rafHandle = raf(step);
  }

  function nodesFor(event) {
    return eventNodes(doc, event, session.labels, session.i18n, session.handlers);
  }

  function revealRoll(event) {
    const [box] = nodesFor(event);
    session.block.append(box);
    const dice = box.querySelectorAll?.(".die, .roll-total, .roll-level") ?? [];
    const total = stagger(dice, config.dieStaggerMs);
    // Cokolwiek ma stanąć przy samych kościach (dziś: nawrót) dostaje ten
    // rzut i jego pudełko od razu, razem z pudełkiem. Ramka bywa dłuższa niż
    // jeden paragraf, więc doklejanie na jej końcu trafiłoby w próżnię, a
    // odkładanie na timer ginęłoby przy szybkim klikaniu (clearTimers).
    session.onRoll?.(event, box);

    // Ostatni krok ramki nie każe klikać jeszcze raz: przyciski decyzji po
    // rzucie są jego naturalnym ciągiem dalszym, więc pojawiają się same,
    // gdy kości skończą się odsłaniać.
    if (session.stepIndex >= session.steps.length) {
      session.phase = "rolling";
      delay(() => {
        if (session?.phase === "rolling") endOfParagraph();
      }, total + config.dieStaggerMs);
      return;
    }
    waitFor(box);
  }

  function revealChoices(event) {
    const buttons = nodesFor(event);
    for (const button of buttons) session.block.append(button);
    stagger(buttons, config.choiceStaggerMs);
    session.phase = "done";
    session.onComplete?.();
  }

  function gateRoll(event) {
    const gate = el("button", "roll-gate", rollGateLabel(event, session.i18n));
    gate.type = "button";
    // Gałęzie znane z wcześniejszych rozgrywek stoją przy bramce, bo dopiero
    // wtedy są decyzją. Po rzucie znika razem z bramką — powtarza je rollbox.
    const history = rollHistoryNode(doc, event, session.i18n, session.handlers.rollHistory);
    gate.addEventListener("click", () => {
      if (session?.phase !== "gate") return;
      gate.remove();
      history?.remove();
      revealRoll(event);
    });
    if (history) session.block.append(history);
    session.block.append(gate);
    session.gate = gate;
    session.phase = "gate";
    gate.focus?.(NO_SCROLL);
  }

  function nextStep() {
    if (!session) return;
    clearWaiting();
    if (session.stepIndex >= session.steps.length) {
      endOfParagraph();
      return;
    }

    const event = session.steps[session.stepIndex];
    session.stepIndex += 1;

    if (event.kind === "text") {
      const [paragraph] = nodesFor(event);
      session.block.append(paragraph);
      typeParagraph(paragraph);
      return;
    }
    if (event.kind === "roll") {
      gateRoll(event);
      return;
    }
    if (event.kind === "choices") {
      revealChoices(event);
      return;
    }

    let last = null;
    for (const node of nodesFor(event)) {
      session.block.append(node);
      last = node;
    }
    waitFor(last);
  }

  function endOfParagraph() {
    if (session.paragraphIndex + 1 < session.paragraphs.length) {
      const next = el("button", "continue", "→");
      next.type = "button";
      next.setAttribute("aria-label", session.labels.next);
      next.addEventListener("click", () => {
        if (session?.phase !== "continue") return;
        openParagraph(session.paragraphIndex + 1);
      });
      session.block.append(next);
      session.phase = "continue";
      next.focus?.(NO_SCROLL);
      return;
    }
    session.phase = "done";
    session.onComplete?.();
  }

  function openParagraph(index) {
    clearTimers();
    clearWaiting();
    const paragraph = session.paragraphs[index];
    root.replaceChildren();
    session.paragraphIndex = index;
    session.steps = paragraph.events;
    session.stepIndex = 0;
    session.typing = null;
    session.block = createEntryBlock(doc, paragraph.entryId, session.labels, session.media, {
      seenBefore: session.seenBefore?.(paragraph.entryId),
    });
    root.append(session.block);
    session.onParagraph?.(session.block);
    nextStep();
  }

  return {
    // Odsłania ramkę od początku: paragraf po paragrafie, akapit po akapicie.
    start(record, { i18n, media, handlers, seenBefore, onParagraph, onRoll, onComplete } = {}) {
      clearTimers();
      session = {
        i18n,
        media,
        handlers: handlers ?? {},
        labels: entryLabels(i18n),
        paragraphs: segmentEvents(record.events, {
          entryId: record.entryId,
          originEntryId: record.originEntryId,
        }),
        // Pamięć poznanych paragrafów przychodzi z main.js jako predykat, bo
        // jedna ramka może przejść przez kilka paragrafów o różnej historii.
        seenBefore,
        onParagraph,
        onRoll,
        onComplete,
        phase: "idle",
        paragraphIndex: -1,
        typing: null,
      };
      openParagraph(0);
      return session.block;
    },

    // Klik w tło albo Enter/Spacja. Pierwszy klik domyka pisany akapit,
    // kolejny odsłania następny krok.
    tap() {
      if (!session) return false;
      if (session.phase === "typing") {
        finishTyping();
        return true;
      }
      if (session.phase === "waiting") {
        nextStep();
        return true;
      }
      if (session.phase === "gate") {
        session.gate?.click?.();
        return true;
      }
      if (session.phase === "continue") {
        openParagraph(session.paragraphIndex + 1);
        return true;
      }
      return false;
    },

    stop() {
      clearTimers();
      clearWaiting();
      session = null;
    },

    block() {
      return session?.block ?? null;
    },

    phase() {
      return session?.phase ?? "idle";
    },
  };
}
