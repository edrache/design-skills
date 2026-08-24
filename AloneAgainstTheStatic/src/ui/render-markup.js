import { parseMarkup } from "./markup.js";
import { tagInfo } from "./voices.js";

// Węzeł "znaczący" to taki, który nie jest samym białym znakiem — białe
// znaki otaczające znacznik nie liczą się przy rozstrzyganiu, co otwiera
// albo wypełnia akapit.
function meaningfulNodes(nodes) {
  return nodes.filter((node) => node.type !== "text" || node.value.trim() !== "");
}

// Akapit będący w całości jedną kwestią czyta się jak scenariusz, mieszany
// jak proza. Ta funkcja rozstrzyga, który to przypadek.
function soleVoice(nodes) {
  const meaningful = meaningfulNodes(nodes);
  if (meaningful.length !== 1) return null;
  const node = meaningful[0];
  if (node.type !== "tag") return null;
  return tagInfo(node.name)?.kind === "voice" ? node : null;
}

// Czy akapit zaczyna się kwestią (blokową lub wtopioną)? Potrzebne renderowi,
// bo CSS nie umie odróżnić "span jako pierwszy znaczący węzeł" od "span jako
// pierwszy element, ale poprzedzony tekstem" — :first-child liczy tylko
// elementy i ignoruje węzły tekstowe.
function opensWithVoice(nodes) {
  const meaningful = meaningfulNodes(nodes);
  if (meaningful.length === 0) return false;
  const first = meaningful[0];
  return first.type === "tag" && tagInfo(first.name)?.kind === "voice";
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

  // Inicjał (::first-letter) ma zniknąć, gdy akapit otwiera kwestia — czy to
  // blokowa, czy wtopiona w prozę. Sama treść trafia do textContent bez
  // zmian, więc atrybut nie narusza inwariantu niezmienności treści.
  if (opensWithVoice(nodes)) paragraph.dataset.opens = "voice";

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
