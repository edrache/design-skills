import { parseMarkup } from "./markup.js";
import { tagInfo } from "./voices.js";

// Akapit będący w całości jedną kwestią czyta się jak scenariusz, mieszany
// jak proza. Ta funkcja rozstrzyga, który to przypadek.
function soleVoice(nodes) {
  const meaningful = nodes.filter((node) => node.type !== "text" || node.value.trim() !== "");
  if (meaningful.length !== 1) return null;
  const node = meaningful[0];
  if (node.type !== "tag") return null;
  return tagInfo(node.name)?.kind === "voice" ? node : null;
}

function appendNodes(doc, parent, nodes) {
  for (const node of nodes) {
    if (node.type === "text") {
      parent.append(doc.createTextNode(node.value));
      continue;
    }

    const info = tagInfo(node.name);
    // Nieznany znacznik nie może zjeść tekstu — renderujemy samą zawartość.
    if (!info) {
      appendNodes(doc, parent, node.children);
      continue;
    }

    const span = doc.createElement("span");
    span.className = info.className;
    if (info.effect) span.dataset.effect = info.effect;
    appendNodes(doc, span, node.children);
    parent.append(span);
  }
}

export function renderMarkup(doc, source) {
  const nodes = parseMarkup(source);
  const paragraph = doc.createElement("p");
  const block = soleVoice(nodes);

  if (block) {
    const info = tagInfo(block.name);
    paragraph.className = `speech ${info.className}`;
    // Etykieta idzie do atrybutu, a nie do DOM: CSS wypisuje ją przez
    // content: attr(data-who), więc nie wchodzi do textContent.
    if (info.label) paragraph.dataset.who = info.label;
    // Renderujemy WSZYSTKIE węzły akapitu, nie tylko dzieci znacznika —
    // białe znaki stojące poza samotnym znacznikiem głosu (spacja, nowa
    // linia) też są częścią treści źródłowej i muszą trafić do textContent.
    // Sama zawartość znacznika głosu idzie bez pośredniego <span>: klasa
    // i etykieta mówiącego już są na <p>.
    for (const node of nodes) {
      if (node === block) appendNodes(doc, paragraph, block.children);
      else appendNodes(doc, paragraph, [node]);
    }
    return paragraph;
  }

  appendNodes(doc, paragraph, nodes);
  return paragraph;
}
