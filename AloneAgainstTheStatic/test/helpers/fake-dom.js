// Minimalny dokument na potrzeby testów renderera. Odwzorowuje tylko to,
// czego używa render-markup.js: tworzenie węzłów, append, className, dataset.

class FakeText {
  constructor(value) {
    this.nodeType = 3;
    this.value = value;
  }
  get textContent() { return this.value; }
}

class FakeElement {
  constructor(tag, doc = null) {
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.children = [];
    // Potrzebne przez journal.js (renderEvents czyta root.ownerDocument).
    this.ownerDocument = doc;
  }
  append(...nodes) { this.children.push(...nodes); }
  get textContent() { return this.children.map((node) => node.textContent).join(""); }
  // el() w journal.js przypisuje tekst przez ustawienie textContent.
  set textContent(value) { this.children = [new FakeText(value)]; }
  // Minimum, którego potrzebuje createEntry() w journal.js (aria-label, data-*).
  setAttribute(name, value) {
    this.attrs ??= {};
    this.attrs[name] = String(value);
  }
  getAttribute(name) { return this.attrs?.[name] ?? null; }
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
