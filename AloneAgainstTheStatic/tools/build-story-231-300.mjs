// Jawna mechanika dla pionowego plastra 231-300. Ten moduł nie zapisuje
// wspólnych danych: generator główny może go zaimportować podczas scalania.

const choice = (label, goto, extra = {}) => ({ label, goto, ...extra });
const roll = (skill, onSuccess, onFail, extra = {}) => ({ roll: skill, onSuccess, onFail, ...extra });

export const CONFIG_231_300 = {
  231: { on: [{ hp: "1" }, roll("Luck", { goto: 326 }, { goto: 232 })] },
  232: { choices: [choice("To fight back", 282), choice("To succumb", 278)] },
  233: { on: [roll("DEX", { goto: 227 }, { goto: 230 }, { dice: -1, push: true, onPushedFail: { goto: 231 } })] },
  234: { on: [roll("Spot Hidden", { goto: 131 }, { goto: 133 })] },
  235: { choices: [choice("To try and secure the door", 237), choice("To find something to defend yourself with", 241), choice("To try and hide", 239)] },
  236: { choices: [choice("To find something to defend yourself with", 241), choice("To try and hide", 239)] },
  237: { on: [roll("STR", { goto: 238 }, { goto: 246 })] },
  238: { on: [{ nextRollDice: 1 }], choices: [choice("To find something to defend yourself with", 241), choice("To try and hide", 239)] },
  239: { guards: [{ if: "lockdown", goto: 240 }], on: [{ goto: 254 }] },
  240: { choices: [choice("To head back into the main room of the cabin", 294), choice("To stay hidden in the bathroom", 297)] },
  241: {
    choices: [
      choice("To remember a heavy weapon you found", 244, { if: "in_case_of_emergency" }),
      choice("To remember a sharp weapon you found", 243, { if: "razor_sharp" }),
      choice("To turn towards the axe you remembered to bring inside", 269, { if: "close_to_hand" }),
      choice("To improvise and grab the closest thing to hand", 245),
    ],
  },
  242: { on: [{ if: "arrival", goto: 250 }, { goto: 248 }] },
  243: { choices: [choice("To wield the dagger", 253), choice("To change your mind", 241)] },
  244: { choices: [choice("To wield the hammer", 249), choice("To change your mind", 241)] },
  245: { on: [roll("Spot Hidden", { goto: 247 }, { goto: 251 })] },
  246: { choices: [choice("To find something to defend yourself with", 241), choice("To try and hide", 239)] },
  247: { on: [{ flag: "last_resort" }, { goto: 259 }] },
  248: {
    on: [{ sanCheck: "0/1d6" }],
    choices: [choice("To agree", 353), choice("To refuse", 357)],
  },
  249: { on: [{ flag: "blunt_force_trauma" }, { goto: 259 }] },
  250: { choices: [choice("To run", 358), choice("To fight", 355)] },
  251: { on: [{ goto: 252 }] },
  252: { choices: [choice("To fight back", 282), choice("To succumb", 278)] },
  253: { on: [{ flag: "knife_to_a_gun_fight" }, { goto: 259 }] },
  254: { choices: [choice("To attack him while he is part-way through the window", 287), choice("To run back to the main room", 293)] },
  255: { guards: [{ if: "lockdown", goto: 256 }], choices: [choice("To sleep", 258)] },
  256: { choices: [choice("To call out to him", 257), choice("To hide", 239), choice("To find something to defend yourself with", 241), choice("To brace the door so it stays shut", 237)] },
  257: { choices: [choice("To hide", 239), choice("To find something to defend yourself with", 241), choice("To brace the door so it stays shut", 237)] },
  258: { on: [{ goto: 259 }] },
  259: { choices: [choice("To try and get out of the way", 262), choice("To attack him as he approaches", 260)] },
  260: { on: [roll("Fighting (Brawl)", { goto: 261 }, { goto: 274 }, { diceIf: [{ if: "red_handed", dice: -1 }] })] },
  261: {
    on: [
      { if: "last_resort", goto: 267 },
      { if: "blunt_force_trauma", goto: 268 },
      { if: "knife_to_a_gun_fight", goto: 271 },
      { if: "overkill", goto: 273 },
      { goto: 270 },
    ],
  },
  262: { on: [roll("Dodge", { goto: 263 }, { goto: 272 })] },
  263: { choices: [choice("To make a run for it", 298), choice("To attack him from behind", 264)] },
  264: { on: [roll("Fighting (Brawl)", { goto: 265 }, { goto: 274 }, { dice: 1, diceIf: [{ if: "red_handed", dice: -1 }] })] },
  265: {
    on: [
      { if: "last_resort", goto: 267 },
      { if: "blunt_force_trauma", goto: 268 },
      { if: "knife_to_a_gun_fight", goto: 271 },
      { if: "overkill", goto: 273 },
      { goto: 270 },
    ],
  },
  266: { choices: [choice("To respond to the man politely", 335), choice("To respond to the man aggressively", 286)] },
  267: { on: [{ goto: 298 }] },
  268: { on: [{ goto: 298 }] },
  269: { on: [{ flag: "overkill" }, { goto: 259 }] },
  270: { choices: [choice("To fight back", 282), choice("To succumb", 278)] },
  271: { on: [{ flag: "arrival" }, { sanCheck: "0/1d6" }, { goto: 298 }] },
  272: { on: [{ hp: "1d4" }, { goto: 298 }] },
  273: { on: [{ sanCheck: "0/1d4" }, { goto: 298 }] },
  274: { on: [{ hp: "1d4" }, { goto: 298 }] },
  275: { choices: [choice("To respond to the man politely", 335), choice("To respond to the man aggressively", 286)] },
  276: { on: [{ if: "arrival", goto: 250 }, { goto: 248 }] },
  277: { on: [roll("Persuade", { goto: 276 }, { goto: 229 }, { difficulty: "hard" })] },
  278: { end: true },
  279: { guards: [{ if: "broken_heart", goto: 281 }], on: [{ goto: 242 }] },
  280: { choices: [choice("To run to Alex with open arms", 279), choice("To hesitate", 10)] },
  281: { choices: [choice("To hesitate", 248), choice("To implore that yes, it is worth it", 277)] },
  282: { on: [roll("Fighting (Brawl)", { goto: 283 }, { goto: 284 })] },
  283: { on: [{ hp: "1d4" }, { goto: 298 }] },
  284: { end: true },
  285: {
    choices: [
      choice("To ask what the Child is", 337, { once: true }),
      choice("To ask more about what the Child wants", 338, { once: true }),
      choice("To ask how the stranger knows all this", 339, { once: true }),
      choice("To ask if he is the man you've seen around", 340, { once: true }),
      choice("To tell the man he is talking nonsense", 341),
      choice("To ask him how you can leave safely", 350),
    ],
  },
  286: { on: [{ if: "alex", goto: 336 }, { goto: 285 }] },
  287: { on: [roll("Fighting (Brawl)", { goto: 288 }, { goto: 291 })] },
  288: { on: [{ goto: 298 }] },
  289: { on: [roll("POW", { goto: 292 }, { goto: 290 })] },
  290: { on: [{ goto: 298 }] },
  291: { choices: [choice("To fight back", 282), choice("To succumb", 278)] },
  292: { on: [roll("Listen", { goto: 225 }, { goto: 228 })] },
  293: { choices: [choice("To make a run for it", 298), choice("To look around for a weapon to fight the stranger with", 245)] },
  294: { on: [roll("Stealth", { goto: 296 }, { goto: 295 })] },
  295: { choices: [choice("To dodge", 262), choice("To attack", 260)] },
  296: { on: [{ goto: 298 }] },
  297: { choices: [choice("To attack him while he is part-way through the window", 287), choice("To run back to the main room", 293)] },
  298: { on: [roll("Navigate", { goto: 299 }, { goto: 320 })] },
  299: { on: [{ if: "well_rested", goto: 300 }, { goto: 301 }] },
  300: { on: [{ goto: 302 }] },
};

const CLEARING = new Set([233, 242, 248, 250, 275, 276, 277, 279, 280, 281, 285, 286, 292]);
const FOREST = new Set([290, 298, 299, 300]);

export function sceneFor231To300(id) {
  if (CLEARING.has(id)) return "clearing";
  if (FOREST.has(id)) return "forest";
  return "cabin";
}

// Usuwa instrukcje mechaniczne i wybory z surowych akapitów OCR. W kilku
// wpisach instrukcja zajmuje osobny akapit, dlatego nie wystarcza reguła -1.
export function proseOf231To300(id, paragraphs) {
  if (id === 233) return paragraphs.slice(0, -3);
  if ([238, 239, 242, 254, 255, 260, 264, 276, 279, 286, 297, 299].includes(id)) return paragraphs.slice(0, -2);
  if (id === 241 || id === 261 || id === 265) return [paragraphs[0]];
  if (id === 285) return paragraphs.slice(0, -3);
  return paragraphs.slice(0, -1);
}
