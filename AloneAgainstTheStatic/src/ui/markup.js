// Parser znaczników stylu. Czysty — bez DOM i bez wiedzy o rejestrze znaczników,
// dzięki czemu działa tak samo w przeglądarce, w testach i w walidatorze.

const TAG = /^\[(\/?)([a-z][a-z0-9_-]*)\]/;

function mergeText(nodes) {
  const out = [];
  for (const node of nodes) {
    if (node.type === "tag") {
      out.push({ type: "tag", name: node.name, children: mergeText(node.children) });
      continue;
    }
    const previous = out.at(-1);
    if (previous?.type === "text") previous.value += node.value;
    else out.push({ type: "text", value: node.value });
  }
  return out.filter((node) => node.type !== "text" || node.value !== "");
}

export function inspectMarkup(source) {
  const text = String(source ?? "");
  const root = { type: "root", children: [] };
  const stack = [root];
  const stray = [];
  let buffer = "";
  let index = 0;

  const flush = () => {
    if (buffer === "") return;
    stack.at(-1).children.push({ type: "text", value: buffer });
    buffer = "";
  };

  while (index < text.length) {
    if (text.startsWith("[[", index)) {
      buffer += "[";
      index += 2;
      continue;
    }

    if (text.startsWith("]]", index)) {
      buffer += "]";
      index += 2;
      continue;
    }

    const match = TAG.exec(text.slice(index));
    if (!match) {
      buffer += text[index];
      index += 1;
      continue;
    }

    const [raw, slash, name] = match;
    if (!slash) {
      flush();
      const node = { type: "tag", name, raw, children: [] };
      stack.at(-1).children.push(node);
      stack.push(node);
    } else if (stack.length > 1 && stack.at(-1).name === name) {
      flush();
      stack.pop();
    } else {
      // Zamknięcie bez pasującego otwarcia jest zwykłym tekstem, ale autor
      // ma się o nim dowiedzieć z walidatora.
      stray.push(name);
      buffer += raw;
    }
    index += raw.length;
  }
  flush();

  // Niedomknięte znaczniki rozwijamy z powrotem na tekst literalny, od środka.
  const unclosed = [];
  while (stack.length > 1) {
    const node = stack.pop();
    unclosed.unshift(node.name);
    const parent = stack.at(-1);
    parent.children.pop();
    parent.children.push({ type: "text", value: node.raw }, ...node.children);
  }

  return { nodes: mergeText(root.children), unclosed, stray };
}

export function parseMarkup(source) {
  return inspectMarkup(source).nodes;
}

export function stripMarkup(source) {
  const walk = (nodes) => nodes.map((node) => (node.type === "text" ? node.value : walk(node.children))).join("");
  return walk(parseMarkup(source));
}

export function tagCounts(source) {
  const counts = {};
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type !== "tag") continue;
      counts[node.name] = (counts[node.name] ?? 0) + 1;
      walk(node.children);
    }
  };
  walk(parseMarkup(source));
  return counts;
}
