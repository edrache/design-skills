// Minimalny dokument na potrzeby testów renderera. Odwzorowuje tylko to,
// czego używa render-markup.js: tworzenie węzłów, append, className, dataset.
// Odsłanianie (src/ui/reveal.js) dokłada do tego klasy, zdarzenia i proste
// zapytania selektorowe — nadal bez pretensji do zgodności z DOM.

class FakeText {
  constructor(value) {
    this.nodeType = 3;
    this.value = value;
  }
  get textContent() { return this.value; }
}

function matchesSelector(node, selector) {
  const trimmed = selector.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith(".")) return node.classList.contains(trimmed.slice(1));
  return node.tagName === trimmed.toUpperCase();
}

class FakeElement {
  constructor(tag, doc = null) {
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.listeners = {};
    this.parent = null;
    // Potrzebne przez journal.js (renderEvents czyta root.ownerDocument).
    this.ownerDocument = doc;
  }
  append(...nodes) {
    for (const node of nodes) {
      if (node instanceof FakeElement) node.parent = this;
      this.children.push(node);
    }
  }
  // renderArchive i reveal.js czyszczą kontener przed przerysowaniem.
  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }
  get textContent() { return this.children.map((node) => node.textContent).join(""); }
  // el() w journal.js przypisuje tekst przez ustawienie textContent.
  set textContent(value) { this.children = [new FakeText(value)]; }
  get classList() {
    const owner = this;
    const list = () => (owner.className ? owner.className.split(/\s+/).filter(Boolean) : []);
    return {
      contains: (name) => list().includes(name),
      add(name) {
        if (!list().includes(name)) owner.className = [...list(), name].join(" ");
      },
      remove(name) {
        owner.className = list().filter((entry) => entry !== name).join(" ");
      },
    };
  }
  // Minimum, którego potrzebuje createEntryBlock() w journal.js (aria-label, data-*).
  setAttribute(name, value) {
    this.attrs ??= {};
    this.attrs[name] = String(value);
  }
  getAttribute(name) { return this.attrs?.[name] ?? null; }
  removeAttribute(name) { delete this.attrs?.[name]; }
  addEventListener(type, handler) {
    (this.listeners[type] ??= []).push(handler);
  }
  click() {
    for (const handler of this.listeners.click ?? []) handler({ target: this });
  }
  focus() {}
  querySelectorAll(selector) {
    const parts = String(selector).split(",");
    const found = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.nodeType !== 1) continue;
        if (parts.some((part) => matchesSelector(child, part))) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  // Minimum, którego potrzebuje renderEvents() do zapieczętowania poprzedniego wpisu.
  get lastElementChild() {
    for (let i = this.children.length - 1; i >= 0; i -= 1) {
      if (this.children[i]?.nodeType === 1) return this.children[i];
    }
    return null;
  }
}

export function createFakeDocument() {
  const doc = {
    createElement: (tag) => new FakeElement(tag, doc),
    createTextNode: (value) => new FakeText(value),
  };
  return doc;
}

// Zbiera klasy wszystkich elementów w poddrzewie, w kolejności wystąpienia.
export function classesOf(node) {
  if (node.nodeType !== 1) return [];
  const own = node.className ? [node.className] : [];
  return [...own, ...node.children.flatMap(classesOf)];
}

// Sterowany zegar dla testów odsłaniania: rAF i setTimeout stają się kolejką,
// którą test przesuwa ręcznie, więc nic nie zależy od realnego czasu.
export function createFakeClock() {
  let time = 0;
  let frames = [];
  const timers = [];

  return {
    now: () => time,
    raf(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelRaf() { frames = []; },
    delay(callback, ms) {
      timers.push({ callback, at: time + ms });
      return timers.length;
    },
    // Przesuwa czas i uruchamia wszystko, co się w tym czasie należało.
    tick(ms) {
      time += ms;
      const due = timers.filter((timer) => timer.at <= time);
      for (const timer of due) timers.splice(timers.indexOf(timer), 1);
      const pending = frames;
      frames = [];
      for (const frame of pending) frame(time);
      for (const timer of due) timer.callback();
    },
  };
}
