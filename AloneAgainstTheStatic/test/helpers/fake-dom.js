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
  constructor(tag) {
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.children = [];
  }
  append(...nodes) { this.children.push(...nodes); }
  get textContent() { return this.children.map((node) => node.textContent).join(""); }
}

export function createFakeDocument() {
  return {
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (value) => new FakeText(value),
  };
}

// Zbiera klasy wszystkich elementów w poddrzewie, w kolejności wystąpienia.
export function classesOf(node) {
  if (node.nodeType !== 1) return [];
  const own = node.className ? [node.className] : [];
  return [...own, ...node.children.flatMap(classesOf)];
}
