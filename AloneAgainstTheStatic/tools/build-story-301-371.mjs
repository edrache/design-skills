// Jawna mechanika pionowego wycinka 301–371.  Ten moduł jest celowo
// niezależny od głównego generatora, aby można było go bezpiecznie scalić
// z pozostałymi zakresami ekstrakcji.
const choice = (label, goto, extra = {}) => ({ label, goto, ...extra });
const roll = (skill, onSuccess, onFail, extra = {}) => ({ roll: skill, onSuccess, onFail, ...extra });

export const CONFIG_301_371 = {
  301: { on: [{ hp: "1" }, { goto: 302 }] },
  302: { choices: [choice("To investigate the sound", 303), choice("To run like hell", 308)] },
  303: { on: [{ if: "running_on_empty", goto: 304 }, { goto: 307 }] },
  304: { choices: [choice("To do as the voice says", 314), choice("To flee", 305)] },
  305: { on: [roll("Luck", { goto: 306 }, { goto: 312 })] },
  306: { on: [{ if: "familiar_face", goto: 266 }, { if: "wrong_turn", goto: 266 }, { goto: 275 }] },
  307: { on: [{ if: "familiar_face", goto: 266 }, { if: "wrong_turn", goto: 266 }, { goto: 275 }] },
  308: { on: [{ if: "running_on_empty", goto: 309 }, { if: "fully_charged", goto: 323 }, { goto: 323 }] },
  309: { on: [roll("Luck", { goto: 310 }, { goto: 311 })] },
  310: { on: [{ if: "familiar_face", goto: 266 }, { if: "wrong_turn", goto: 266 }, { goto: 275 }] },
  311: { on: [roll("DEX", { goto: 313 }, { goto: 312 })] },
  312: { on: [{ hp: "1d4" }, { if: "familiar_face", goto: 266 }, { if: "wrong_turn", goto: 266 }, { goto: 275 }] },
  313: { on: [{ if: "familiar_face", goto: 266 }, { if: "wrong_turn", goto: 266 }, { goto: 275 }] },
  314: { choices: [choice("To give the voice your hand", 315), choice("To refuse", 305)] },
  315: { on: [{ sanCheck: "0/1d6" }], choices: [choice("To do as the voice says", 316), choice("To refuse", 317)] },
  316: { end: true },
  317: { on: [roll("POW", { goto: 319 }, { goto: 318 })] },
  318: { end: true },
  319: { on: [roll("DEX", { goto: 313 }, { goto: 312 })] },
  320: { on: [roll("Sanity", { goto: 321 }, { goto: 322 })] },
  321: { on: [{ if: "well_rested", goto: 300 }, { goto: 301 }] },
  322: { on: [{ san: "1d4" }, { if: "well_rested", goto: 300 }, { goto: 301 }] },
  323: { on: [{ if: "familiar_face", goto: 266 }, { if: "wrong_turn", goto: 266 }, { if: "broken_heart", goto: 366 }, { goto: 275 }] },
  324: { end: true },
  325: { on: [roll("CON", [{ goto: "@return" }], { goto: 324 })] },
  326: { choices: [choice("To fight back", 282), choice("To succumb", 278)] },
  327: { choices: [choice("To feel confident about the weekend", 124), choice("To doubt this vacation will fix your relationship", 126)] },
  328: { on: [{ goto: "@return" }] },
  329: { on: [{ bout: true }] },
  330: { on: [{ goto: "@return" }] },
  331: { on: [{ goto: "@return" }] },
  332: { on: [{ goto: "@return" }] },
  333: { on: [{ goto: "@return" }] },
  334: { end: true },
  335: { on: [{ if: "alex", goto: 336 }, { if: "charlie", goto: 285 }, { goto: 285 }] },
  336: {
    choices: [
      choice("To ask what the Child is", 337, { once: true }),
      choice("To ask more about what the Child wants", 338, { once: true }),
      choice("To ask how the stranger knows all this", 339, { once: true }),
      choice("To ask if he is the man you've seen around", 340, { once: true }),
      choice("To tell the man he is talking nonsense", 341),
      choice("To ask him how you can leave safely", 350),
    ],
  },
  337: { on: [{ if: "alex", goto: 336 }, { if: "charlie", goto: 285 }, { goto: 285 }] },
  338: { on: [{ if: "alex", goto: 336 }, { if: "charlie", goto: 285 }, { goto: 285 }] },
  339: { on: [{ if: "alex", goto: 336 }, { if: "charlie", goto: 285 }, { goto: 285 }] },
  340: { on: [{ if: "alex", goto: 336 }, { if: "charlie", goto: 285 }, { goto: 285 }] },
  341: { on: [{ if: "alex", goto: 342 }, { if: "charlie", goto: 280 }, { goto: 280 }] },
  342: { choices: [choice("To run to Charlie with open arms", 343), choice("To hesitate", 351)] },
  343: { on: [{ if: "broken_heart", goto: 344 }, { goto: 352 }] },
  344: { choices: [choice("To hesitate", 348), choice("To implore that yes, it is worth it", 345)] },
  345: { on: [roll("Persuade", { goto: 346 }, { goto: 349 }, { difficulty: "hard" })] },
  346: { on: [{ if: "arrival", goto: 347 }, { goto: 348 }] },
  347: { choices: [choice("To run", 358), choice("To fight", 355)] },
  348: { on: [{ sanCheck: "0/1d6" }], choices: [choice("To agree", 353), choice("To refuse", 357)] },
  349: { on: [{ if: "arrival", goto: 347 }, { goto: 348 }] },
  350: { on: [{ if: "alex", goto: 342 }, { if: "charlie", goto: 280 }, { goto: 280 }] },
  351: { on: [{ if: "broken_heart", goto: 10 }], choices: [choice("To run to Charlie", 343)] },
  352: { on: [{ if: "arrival", goto: 347 }, { goto: 348 }] },
  353: { on: [{ goto: 354 }] },
  354: { end: true },
  355: { on: [roll("Fighting (Brawl)", { goto: 9 }, { goto: 356 })] },
  356: { end: true },
  357: { choices: [choice("To run", 358), choice("To fight", 355)] },
  358: { on: [roll("DEX", { goto: 360 }, { goto: 359 })] },
  359: { end: true },
  360: { on: [{ goto: 354 }] },
  361: { on: [{ flag: "temporal_steel" }, { goto: 66 }] },
  362: { on: [{ goto: 66 }] },
  363: { choices: [choice("To attack", 364), choice("To accept", 27)] },
  364: { on: [{ san: "1d4" }, { goto: 365 }] },
  365: { end: true },
  366: { on: [{ goto: 367 }] },
  367: { end: true },
  368: { on: [roll("Mechanical Repair", { goto: 369 }, { goto: 371 }, { difficulty: "hard" })] },
  369: { on: [{ goto: 370 }] },
  370: { choices: [choice("To make some food", 94), choice("To search for flashlights and batteries so you have light for when it gets dark", 95)] },
  371: { on: [{ goto: 370 }] },
};

const FOREST = new Set([...Array(24)].map((_, offset) => 301 + offset));
const CLEARING = new Set([...Array(19)].map((_, offset) => 335 + offset).concat([355, 356, 357, 358, 359, 363, 364, 365]));
const SHED = new Set([361, 362]);
const CABIN = new Set([325, 326, 327, 328, 329, 330, 331, 332, 333, 368, 369, 370, 371]);

export function sceneFor301To371(id) {
  if (FOREST.has(id)) return "forest";
  if (CLEARING.has(id)) return "clearing";
  if (SHED.has(id)) return "shed";
  if (CABIN.has(id)) return "cabin";
  return "forest";
}

// Z książkowych akapitów odcinamy instrukcje, rzuty i wybory. Wpisy systemowe
// są wykonywane przez silnik i pokazują tylko ich fabularne ostrzeżenie.
export function proseOf301To371(id, paragraphs) {
  if (!Number.isInteger(id) || id < 301 || id > 371) throw new RangeError(`Poza zakresem 301–371: ${id}`);
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) throw new TypeError(`Brak akapitów dla ${id}`);

  if (id === 327) return [...paragraphs.slice(0, 2), `${paragraphs[2]} ${paragraphs[3]}`];
  if ([325, 328, 329, 330, 331, 332, 333].includes(id)) return [paragraphs[0]];
  if (id === 323) return paragraphs.slice(0, -3);
  if (id === 364) return paragraphs.slice(0, -2);
  if ([303, 306, 307, 308, 310, 312, 313, 321, 322, 323, 335, 341, 343, 346, 349, 350, 351, 352].includes(id)) {
    return paragraphs.slice(0, -2);
  }
  if (id === 336) return paragraphs.slice(0, 3);
  if (id === 361) return paragraphs.slice(0, -2);
  if ([315, 348].includes(id)) return paragraphs.slice(0, -1);
  return paragraphs.slice(0, -1);
}
