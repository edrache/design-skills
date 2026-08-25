// Buduje deterministyczny komplet paragrafów 1-371.
// Mechanika jest jawna: ponowne uruchomienie generatora nie nadpisuje ręcznych
// poprawek, bo wszystkie wyjątki pozostają w tym pliku.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { CONFIG_231_300, proseOf231To300, sceneFor231To300 } from "./build-story-231-300.mjs";
import { CONFIG_301_371, proseOf301To371, sceneFor301To371 } from "./build-story-301-371.mjs";

const RANGE = [1, 371];

const choice = (label, goto, extra = {}) => ({ label, goto, ...extra });
const roll = (skill, onSuccess, onFail) => ({ roll: skill, onSuccess, onFail });

const CONFIG = {
  1: { on: [{ flag: "alex" }], choices: [choice("To keep offering help", 7), choice("To change the radio station instead", 3)] },
  2: { on: [{ flag: "charlie" }], choices: [choice("To ask Alex to stop", 83), choice("To just ignore the sound", 96)] },
  3: { on: [roll("Psychology", { goto: 4 }, { goto: 8 })] },
  4: { on: [{ goto: 5 }] },
  5: { on: [{ roll: "CON", onFail: [{ flag: "touched_by_cold" }] }], choices: [choice("To say you are hungry", 6), choice("To say you aren't hungry", 12)] },
  6: { on: [{ goto: 11 }] },
  7: { on: [roll("Psychology", { goto: 4 }, { goto: 8 })] },
  8: { on: [{ goto: 5 }] },
  9: { guards: [{ if: ["temporal_steel", { not: "knife_to_a_gun_fight" }], goto: 363 }], choices: [choice("To accept", 27), choice("To refuse", 134)] },
  10: { on: [roll("DEX", { goto: 360 }, { goto: 359 })] },
  11: { choices: [choice("To get started on dinner", 13), choice("To wait for Charlie", 16)] },
  12: { on: [{ goto: 11 }] },
  13: { choices: [choice("To respond lovingly", 14), choice("To change the subject", 17)] },
  14: { choices: [choice("To talk about plans for tomorrow", 18), choice("To reassure Charlie", 15)] },
  15: { choices: [choice("To agree", 19), choice("To complain", 25)] },
  16: { choices: [choice("To respond lovingly", 14), choice("To change the subject", 17)] },
  17: { on: [{ flag: "broken_heart" }], choices: [choice("To talk about plans for tomorrow", 18), choice("To reassure Charlie", 15)] },
  18: { choices: [choice("To agree", 19), choice("To complain", 25)] },
  19: { on: [roll("Spot Hidden", { goto: 26 }, { goto: 20 })] },
  20: { choices: [choice("To watch the movie right away", 28), choice("To get ready for bed first", 21)] },
  21: { on: [{ flag: "occupied" }, { goto: 22 }] },
  22: { on: [{ roll: "Sanity", onFail: [{ flag: "unsettled" }, { san: "1" }] }], choices: [choice("To cover your ears", 29), choice("To scramble for the dial and turn it down", 23)] },
  23: { guards: [{ if: "broken_heart", goto: 24 }], choices: [choice("To get frustrated with Charlie", 24), choice("To stay calm", 30)] },
  24: { on: [{ flag: "blame_game" }, { goto: 31 }] },
  25: { on: [roll("Spot Hidden", { goto: 26 }, { goto: 20 })] },
  26: { on: [{ flag: "the_flowers_in_the_stream" }], choices: [choice("To get changed before the movie", 21), choice("To lay on the bed and watch it now", 28)] },
  27: { on: [{ goto: 354 }] },
  28: { on: [{ goto: 22 }] },
  29: { guards: [{ if: "broken_heart", goto: 24 }], choices: [choice("To get frustrated with Charlie", 24), choice("To stay calm", 30)] },
  30: { on: [{ goto: 31 }] },
  31: {
    guards: [{ if: "broken_heart", goto: 33 }, { if: "blame_game", goto: 33 }],
    choices: [choice("To lean on Charlie for support", 32), choice("To give up and go to sleep", 33)],
  },
  32: { on: [{ goto: 34 }] },
  33: { on: [{ flag: "nyctophobe" }, { goto: 34 }] },
  34: { on: [{ newDay: true }], choices: [choice("To eat some breakfast", 35), choice("To go for a brisk walk", 37)] },
  35: { choices: [choice("To leave right away", 36), choice("To wait a few minutes in case your partner returns", 41)] },
  36: { choices: [choice("To slowly get excited about this vacation", 39), choice("To grow even more anxious", 40)] },
  37: { choices: [choice("To stop and collect berries", 38), choice("To continue your walk", 39)] },
  38: { on: [roll("Natural World", { goto: 77 }, { goto: 104 })] },
  39: { choices: [choice("To investigate the sound", 44), choice("To stick to the trail", 49)] },
  40: { choices: [choice("To investigate the sound", 44), choice("To stick to the trail", 49)] },
  41: { on: [roll("Spot Hidden", { goto: 42 }, { goto: 43 })] },
  42: { on: [{ flag: "lumberjack" }], choices: [choice("To stop and collect berries", 38), choice("To continue your walk", 39)] },
  43: { choices: [choice("To investigate the sound", 44), choice("To stick to the trail", 49)] },
  44: {
    guards: [{ if: "the_flowers_in_the_stream", goto: 48 }],
    choices: [choice("To take a drink from the stream", 45), choice("To sit for a moment and enjoy the serenity", 50)],
  },
  45: { on: [roll("Listen", { goto: 46 }, { goto: 51 })] },
  46: {
    on: [{
      roll: "Natural World",
      push: true,
      onSuccess: { goto: 47 },
      onFail: { goto: 53 },
      onPushedFail: { goto: 54 },
    }],
  },
  47: { on: [{ flag: "veterinarian" }, { goto: 55 }] },
  48: { on: [{ goto: 49 }] },
  49: { choices: [choice("To investigate the shed", 56), choice("To ignore the shed", 79)] },
  50: { on: [roll("Listen", { goto: 46 }, { goto: 51 })] },
  51: { choices: [choice("To call out", 52), choice("To leave the serene stream", 49)] },
  52: { on: [{ goto: 55 }] },
  53: { on: [{ goto: 55 }] },
  54: { on: [{ hp: "1d4" }, { goto: 55 }] },
  55: { choices: [choice("To investigate the shed", 56), choice("To ignore the shed", 79)] },
  56: {
    guards: [{ if: "nyctophobe", goto: 80 }],
    choices: [choice("To leave the shed behind", 79), choice("To step inside", 57)],
  },
  57: {
    choices: [
      choice("To search the cupboard", 58, { once: true }),
      choice("To look over the bench", 62, { once: true }),
      choice("To rifle through the boxes", 65, { once: true }),
      choice("To leave the shed", 78),
    ],
  },
  58: {
    on: [{
      roll: "Spot Hidden",
      push: true,
      onSuccess: { goto: 59 },
      onFail: { goto: 60 },
      onPushedFail: { goto: 61 },
    }],
  },
  59: { on: [{ flag: "the_quiet_in_the_evening" }, { goto: 57 }] },
  60: { on: [{ goto: 57 }] },
  61: { on: [{ goto: 85 }] },
  62: {
    choices: [
      choice("To take the hammer", 63),
      choice("To examine the screwdriver set", 64),
      choice("Otherwise", 57),
    ],
  },
  63: { on: [{ flag: "in_case_of_emergency" }, { goto: 57 }] },
  64: {
    on: [
      { flag: "toolkit" },
      { if: "tech_support", goto: 76 },
      { goto: 57 },
    ],
  },
  65: { choices: [choice("To keep searching through boxes", 66), choice("Otherwise", 57)] },
  66: {
    guards: [{ if: ["unsettled", { visits: 1 }], goto: 67 }],
    choices: [
      choice("To look at the jars", 68, { once: true }),
      choice("To pick up the dagger", 69, { once: true }),
      choice("To examine the camcorder", 70, { once: true }),
      choice("To leave the boxes alone", 57),
    ],
  },
  67: {
    on: [{
      roll: "POW",
      onSuccess: { goto: 66 },
      onFail: [{ san: "1" }, { goto: 57 }],
    }],
  },
  68: { on: [{ goto: 66 }] },
  69: {
    choices: [
      choice("To take the dagger", 69, {
        flag: "razor_sharp",
        roll: "Occult",
        onSuccess: { goto: 361 },
        onFail: { goto: 362 },
      }),
      choice("Otherwise", 66),
    ],
  },
  70: { choices: [choice("To press the buttons and see if the camcorder works", 71), choice("To put the camcorder away", 66)] },
  71: {
    on: [
      { flag: "tech_support" },
      { if: "toolkit", goto: 72 },
      { goto: 66 },
    ],
  },
  72: {
    on: [{
      roll: "Mechanical Repair",
      push: true,
      onSuccess: { goto: 73 },
      onFail: { goto: 74 },
      onPushedFail: { goto: 75 },
    }],
  },
  73: { on: [{ flag: "the_couple_who_came_to_the_cabin" }, { goto: 66 }] },
  74: { on: [{ goto: 57 }] },
  75: { on: [{ hp: "1" }, { flag: "red_handed" }, { goto: 66 }] },
  76: {
    on: [{
      roll: "Mechanical Repair",
      push: true,
      onSuccess: { goto: 73 },
      onFail: { goto: 74 },
      onPushedFail: { goto: 75 },
    }],
  },
  77: { choices: [choice("To investigate the sound", 44), choice("To stick to the trail", 49)] },
  78: { on: [{ goto: 84 }] },
  79: { on: [{ goto: 84 }] },
  80: { on: [roll("Sanity", { goto: 82 }, { goto: 81 })] },
  81: { on: [{ san: "1" }, { goto: 84 }] },
  82: { choices: [choice("To enter the shed", 57), choice("To go back to your hike", 79)] },
  83: { on: [{ goto: 103 }] },
  84: { guards: [{ if: "occupied", goto: 86 }], on: [{ goto: 87 }] },
  85: { guards: [{ if: "occupied", goto: 86 }], on: [{ san: "1" }, { goto: 87 }] },
  86: { choices: [choice("To stay for a while and enjoy the soak", 90), choice("To shower quickly", 92)] },
  87: { on: [roll("Sanity", { goto: 88 }, { goto: 89 })] },
  88: { on: [{ goto: 91 }] },
  89: { on: [{ san: "1" }, { goto: 91 }] },
  90: { on: [{ heal: "1" }, { luck: "1d4" }, { goto: 92 }] },
  91: {
    choices: [
      choice("To put on jeans and a tee-shirt", 93, { flag: "practical" }),
      choice("To put on warm, soft track pants and a sweater", 93, { flag: "comfortable" }),
    ],
  },
  92: {
    choices: [
      choice("To put on jeans and a tee-shirt", 93, { flag: "practical" }),
      choice("To put on warm, soft track pants and a sweater", 93, { flag: "comfortable" }),
    ],
  },
  93: {
    choices: [
      choice("To make some food", 94),
      choice("To search for flashlights and batteries", 95),
      choice("To try and restore the power yourself", 368),
    ],
  },
  94: {
    on: [{ flag: "well_fed" }, { if: "survivalist", goto: 102 }],
    choices: [choice("To eat and enjoy the food", 106), choice("To pick at the plate unenthusiastically and worry about your situation", 107)],
  },
  95: {
    on: [{
      roll: "Spot Hidden",
      push: true,
      onSuccess: { goto: 97 },
      onFail: { goto: 98 },
      onPushedFail: { goto: 99 },
    }],
  },
  96: { on: [{ goto: 103 }] },
  97: {
    on: [{ flag: "fully_charged" }, { if: "well_fed", goto: 108 }, { goto: 94 }],
  },
  98: {
    on: [{ flag: "running_on_empty" }, { if: "well_fed", goto: 108 }, { goto: 94 }],
  },
  99: {
    on: [{ flag: "running_on_empty" }, roll("Dodge", { goto: 109 }, { goto: 100 })],
  },
  100: { on: [{ hp: "1d4" }, { goto: 101 }] },
  101: {
    on: [
      { roll: "First Aid", onSuccess: { heal: "1" } },
      { if: "well_fed", goto: 108 },
      { goto: 94 },
    ],
  },
  102: {
    guards: [{ if: "fully_charged", goto: 108 }, { if: "running_on_empty", goto: 108 }],
    on: [{ goto: 95 }],
  },
  103: {
    on: [{ roll: "CON", onFail: { flag: "touched_by_cold" } }],
    choices: [choice("To say you are hungry", 105), choice("To say you aren't", 111)],
  },
  104: {
    on: [{ flag: "survivalist" }],
    choices: [choice("To investigate the sound", 44), choice("To stick to the trail", 49)],
  },
  105: { on: [{ goto: 327 }] },
  106: {
    guards: [{ if: "fully_charged", goto: 108 }, { if: "running_on_empty", goto: 108 }],
    on: [{ goto: 95 }],
  },
  107: {
    on: [
      { roll: "Sanity", onFail: { san: "1" } },
      { if: "fully_charged", goto: 108 },
      { if: "running_on_empty", goto: 108 },
      { goto: 95 },
    ],
  },
  108: {
    on: [{
      roll: "Listen",
      push: true,
      onSuccess: { goto: 110 },
      onFail: { goto: 113 },
      onPushedFail: { goto: 112 },
    }],
  },
  109: { guards: [{ if: "well_fed", goto: 108 }], on: [{ goto: 94 }] },
  110: { choices: [choice("To pretend nobody's home and wait for the stranger to leave", 140), choice("To answer the door", 121)] },
  111: { on: [{ goto: 327 }] },
  112: { on: [{ goto: 139 }] },
  113: { choices: [choice("To ask who the strange man is", 114), choice("To tell him Julie isn't here", 122)] },
  114: { on: [roll("Spot Hidden", { goto: 115 }, { goto: 118 })] },
  115: { on: [{ goto: 118 }] },
  116: { choices: [choice("To ask how this guy knows Mark and Julie", 132), choice("To tell him to leave", 117)] },
  117: {
    choices: [
      choice("To scare off the stranger", 117, {
        roll: "Intimidate",
        onSuccess: { goto: 119 },
        onFail: { goto: 130 },
      }),
      choice("To reason with the stranger", 117, {
        roll: "Persuade",
        onSuccess: { goto: 125 },
        onFail: { goto: 136 },
      }),
      choice("To shut the door in his face", 128),
    ],
  },
  118: {
    choices: [
      choice("To keep talking", 116),
      choice("To ask the stranger to leave", 117),
      choice("To close the door on the stranger", 128),
    ],
  },
  119: { choices: [choice("To follow the stranger", 138), choice("To close the door and make sure it's locked", 120)] },
  120: { on: [{ flag: "lockdown" }, { goto: 142 }] },
  121: { choices: [choice("To ask who the strange man is", 114), choice("To tell him Julie isn't here", 122)] },
  122: {
    choices: [
      choice("To ask about the stranger", 116),
      choice("To tell him that Mark isn't here", 123),
      choice("To tell this guy to leave", 117),
    ],
  },
  123: { choices: [choice("To ask the stranger to leave", 117), choice("To shut the door in his face", 128)] },
  124: { on: [roll("Psychology", { goto: 127 }, { goto: 129 })] },
  125: { choices: [choice("To follow the stranger", 138), choice("To close the door and make sure it's locked", 120)] },
  126: { on: [{ flag: "occupied" }, roll("Psychology", { goto: 127 }, { goto: 129 })] },
  127: { on: [{ goto: 234 }] },
  128: { choices: [choice("To go back to reading", 139), choice("To loiter by the door and see if he leaves", 140)] },
  129: { on: [{ goto: 234 }] },
  130: {
    on: [{ roll: "Sanity", onFail: { san: "1" } }],
    choices: [choice("To follow the stranger", 138), choice("To close the door and make sure it's locked", 120)],
  },
  131: {
    on: [{ flag: "the_flowers_in_the_stream" }],
    choices: [choice("To respond lovingly", 135), choice("To change the subject", 137)],
  },
  132: { choices: [choice("To ask the stranger to leave", 117), choice("To close the door on him", 128)] },
  133: { choices: [choice("To respond lovingly", 135), choice("To change the subject", 137)] },
  134: { end: true },
  135: { on: [{ goto: 145 }] },
  136: {
    on: [{ roll: "Sanity", onFail: { san: "1" } }],
    choices: [choice("To follow the stranger", 138), choice("To close the door and make sure it's locked", 120)],
  },
  137: { on: [{ flag: "broken_heart" }, { goto: 145 }] },
  138: { choices: [choice("To go back to the cabin and lock the doors", 120), choice("To pursue him deeper into the forest", 141)] },
  139: { on: [{ heal: "1" }, { flag: "well_rested" }, { goto: 142 }] },
  140: { choices: [choice("To follow the stranger", 138), choice("To close the door and make sure it's locked", 120)] },
  141: {
    on: [{
      roll: "Stealth",
      push: true,
      diceIf: [{ if: "comfortable", dice: 1 }],
      onSuccess: { goto: 144 },
      onFail: { goto: 146 },
      onPushedFail: { goto: 147 },
    }],
    choices: [choice("To openly follow the stranger", 143)],
  },
  142: { choices: [choice("To ignore the knock", 183), choice("To answer the door", 176)] },
  143: { on: [{ goto: 152 }] },
  144: { choices: [choice("To continue following him", 155), choice("To turn back", 163)] },
  145: {
    on: [{ roll: "Sanity", onFail: [{ san: "1" }, { flag: "unsettled" }] }],
    choices: [choice("To cover your ears", 154), choice("To scramble for the dial and turn it down", 158)],
  },
  146: { on: [{ goto: 152 }] },
  147: { on: [{ roll: "DEX", difficulty: "hard", onSuccess: { goto: 148 }, onFail: { goto: 149 } }] },
  148: { on: [{ goto: 170 }] },
  149: { on: [{ hp: "1d4" }, roll("Fighting (Brawl)", { goto: 151 }, { goto: 150 })] },
  150: { end: true },
  151: { on: [{ goto: 170 }] },
  152: { choices: [choice("To back down and return to the cabin", 163), choice("To hold your ground", 153)] },
  153: { on: [{ roll: "DEX", difficulty: "hard", onSuccess: { goto: 148 }, onFail: { goto: 149 } }] },
  154: {
    guards: [{ if: "broken_heart", goto: 160 }],
    choices: [choice("To get frustrated with Alex", 160), choice("To stay calm", 174)],
  },
  155: { choices: [choice("To continue following", 164), choice("To head back to the cabin", 156)] },
  156: {
    on: [{
      roll: "Navigate",
      push: true,
      onSuccess: { goto: 157 },
      onFail: { goto: 159 },
      onPushedFail: { goto: 162 },
    }],
  },
  157: { on: [{ goto: 142 }] },
  158: {
    guards: [{ if: "broken_heart", goto: 160 }],
    choices: [choice("To get frustrated with Alex", 160), choice("To stay calm", 174)],
  },
  159: {
    on: [{
      roll: "CON",
      diceIf: [{ if: "touched_by_cold", dice: -1 }, { if: "practical", dice: 1 }],
      onFail: { hp: "1d4" },
    }, { goto: 170 }],
  },
  160: { on: [{ flag: "blame_game" }, { goto: 193 }] },
  161: { on: [{ goto: 170 }] },
  162: {
    on: [{
      roll: "CON",
      diceIf: [{ if: "touched_by_cold", dice: -1 }, { if: "practical", dice: 1 }],
      onFail: { hp: "1d6" },
    }, { goto: 161 }],
  },
  163: { on: [{ goto: 142 }] },
  164: { choices: [choice("To ask him what he means", 172), choice("To tell him you're sorry and you'll leave", 165)] },
  165: {
    on: [{ flag: "wrong_turn" }, roll("Sanity", { goto: 173 }, { goto: 166 })],
  },
  166: {
    on: [{ san: "1d4" }, { hp: "1d4" }],
    choices: [choice("To run", 167), choice("To succumb", 171)],
  },
  167: { on: [roll("Navigate", { goto: 168 }, { goto: 169 })] },
  168: { on: [{ goto: 170 }] },
  169: {
    on: [{
      roll: "CON",
      diceIf: [{ if: "touched_by_cold", dice: -1 }, { if: "practical", dice: 1 }],
      onFail: { hp: "1d4" },
    }, { goto: 170 }],
  },
  170: { choices: [choice("To start turning on lights", 184), choice("To inspect the television", 185)] },
  171: { end: true },
  172: { on: [roll("Sanity", { goto: 173 }, { goto: 166 })] },
  173: { on: [{ hp: "1" }], choices: [choice("To try and run", 167), choice("To remove your hands from your ears", 175)] },
  174: { on: [{ goto: 193 }] },
  175: { on: [{ san: "1d4" }, { hp: "1d4" }], choices: [choice("To try to run", 167), choice("To succumb", 171)] },
  176: {
    on: [{ roll: "Sanity", onFail: { san: "1" } }, { if: "lumberjack", goto: 177 }],
    choices: [choice("To dismiss the noise as an accident of the wind", 181), choice("To wait a moment longer", 178)],
  },
  177: { on: [{ flag: "close_to_hand" }, { goto: 182 }] },
  178: { on: [roll("Sanity", { goto: 180 }, { goto: 179 })] },
  179: { on: [{ san: "1" }, { goto: 181 }] },
  180: { on: [{ goto: 181 }] },
  181: { choices: [choice("To start turning on lights", 184), choice("To inspect the television", 185)] },
  182: {
    on: [{ flag: "lockdown" }],
    choices: [choice("To start turning on lights", 184), choice("To turn off that awful TV", 185)],
  },
  183: { choices: [choice("To turn on a light", 184), choice("To turn off that awful TV", 185)] },
  184: { on: [{ goto: 186 }] },
  185: { on: [{ goto: 186 }] },
  186: {
    choices: [
      choice("To play The Quiet in the Evening", 187, { if: "the_quiet_in_the_evening", once: true }),
      choice("To play The Couple Who Came to the Cabin", 196, { if: "the_couple_who_came_to_the_cabin", once: true }),
      choice("To play the tape from last night", 208, { once: true }),
      choice("To leave the TV alone", 223),
    ],
  },
  187: { choices: [choice("To play the tape", 188), choice("To change your mind and put the tape away", 186)] },
  188: { choices: [choice("To rewind the tape and raise the volume", 189), choice("To eject the tape", 186)] },
  189: {
    on: [{
      roll: "Listen",
      push: true,
      onSuccess: { goto: 190 },
      onFail: { goto: 192 },
      onPushedFail: { goto: 195 },
    }],
  },
  190: { on: [roll("Sanity", { goto: 191 }, { goto: 194 })] },
  191: { on: [{ san: "1" }, { goto: 186 }] },
  192: { on: [{ goto: 186 }] },
  193: {
    guards: [{ if: "broken_heart", goto: 207 }, { if: "blame_game", goto: 207 }],
    choices: [choice("To lean on Alex for support", 205), choice("To give up and go to sleep", 207)],
  },
  194: { on: [{ san: "1d4" }, { goto: 186 }] },
  195: { on: [{ flag: "tinnitus" }, { goto: 186 }] },
  196: { choices: [choice("To press play", 197), choice("To put the tape away", 186)] },
  197: { on: [roll("Sanity", { goto: 198 }, { goto: 199 })] },
  198: {
    on: [{ san: "1" }],
    choices: [choice("To rewatch the tape and look for more clues", 200), choice("To eject the tape and put it away", 186)],
  },
  199: {
    on: [{ san: "1d4" }],
    choices: [choice("To rewatch the tape and look for more clues", 200), choice("To eject the tape and put it away", 186)],
  },
  200: {
    on: [{
      roll: "Spot Hidden",
      push: true,
      onSuccess: { goto: 202 },
      onFail: { goto: 201 },
      onPushedFail: { goto: 203 },
    }],
  },
  201: { on: [{ goto: 186 }] },
  202: { on: [roll("Sanity", { goto: 204 }, { goto: 206 })] },
  203: { on: [{ san: "1d4" }, { goto: 289 }] },
  204: { on: [{ goto: 186 }] },
  205: { on: [{ goto: 34 }] },
  206: { on: [{ san: "1d4" }, { goto: 186 }] },
  207: { on: [{ flag: "nyctophobe" }, { goto: 34 }] },
  208: {
    on: [{ flag: "familiar_face" }],
    choices: [choice("To adjust the tracking using the VCR controls", 222), choice("To let the tape play on", 209)],
  },
  209: { choices: [choice("To adjust the volume", 210), choice("To continue watching the tape muted", 217)] },
  210: { choices: [choice("To rewind the tape and turn the volume up", 213), choice("To leave the tape running", 211)] },
  211: { on: [{ if: "veterinarian", goto: 212 }, { goto: 215 }] },
  212: { on: [{ goto: 215 }] },
  213: { on: [{ if: "veterinarian", goto: 212 }, { goto: 215 }] },
  214: { on: [{ goto: 186 }] },
  215: { on: [roll("Sanity", { goto: 214 }, { goto: 216 })] },
  216: { on: [{ san: "1d4" }, { goto: 186 }] },
  217: {
    on: [{ if: "veterinarian", goto: 218 }],
    choices: [choice("To continue watching the tape", 219), choice("To rewind the tape and turn the volume up", 215)],
  },
  218: { choices: [choice("To continue watching with the tape muted", 219), choice("To turn the volume up", 215)] },
  219: { on: [roll("Sanity", { goto: 220 }, { goto: 221 })] },
  220: { on: [{ san: "1" }, { goto: 186 }] },
  221: { on: [{ san: "1d4" }, { goto: 186 }] },
  222: { choices: [choice("To adjust the volume", 210), choice("To continue watching the tape muted", 217)] },
  223: { choices: [choice("To head to sleep", 255), choice("To step out onto the porch and look for your partner", 224)] },
  224: { on: [roll("Listen", { goto: 225 }, { goto: 228 })] },
  225: { choices: [choice("To yell at him to stop", 233), choice("To dart inside and close the door", 226)] },
  226: {
    on: [{
      roll: "DEX",
      push: true,
      onSuccess: { goto: 227 },
      onFail: { goto: 230 },
      onPushedFail: { goto: 231 },
    }],
  },
  227: {
    choices: [
      choice("To try to secure the door", 237),
      choice("To find something to defend yourself with", 241),
      choice("To try and hide", 239),
    ],
  },
  228: {
    choices: [
      choice("To try and secure the door", 237),
      choice("To grab something to defend yourself with", 241),
      choice("To try and hide", 239),
    ],
  },
  229: { on: [{ if: "arrival", goto: 250 }, { goto: 248 }] },
  230: { choices: [choice("To try and slam the door against his arm", 235), choice("To let go of the door and try something else", 236)] },
  ...CONFIG_231_300,
  ...CONFIG_301_371,
};

const DRIVE = new Set([1, 2, 3, 4, 7, 8, 83, 96]);
const CLEARING = new Set([9, 10, 27, 224, 225, 226]);
const ARRIVAL = new Set([5, 6, 12, 103, 105, 111]);
const STREAM = new Set([44, 45, 46, 47, 48, 50, 51, 52, 53, 54]);
const SHED = new Set([56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 80, 82]);
const FOREST = new Set([
  36, 37, 38, 39, 40, 41, 42, 43, 49, 55, 77, 78, 79, 81, 104,
  138, 141, 142, 143, 144, 146, 147, 148, 149, 150, 151, 152, 153,
  155, 156, 157, 159, 161, 162, 164, 165, 166, 167, 168, 169, 171, 172, 173,
  229,
]);

function sceneFor(id) {
  if (id >= 231 && id <= 300) return sceneFor231To300(id);
  if (id >= 301 && id <= 371) return sceneFor301To371(id);
  if (DRIVE.has(id)) return "drive";
  if (CLEARING.has(id)) return "clearing";
  if (ARRIVAL.has(id)) return "arrival";
  if (STREAM.has(id)) return "stream";
  if (SHED.has(id)) return "shed";
  if (FOREST.has(id)) return "forest";
  return "cabin";
}

function proseOf(id, paragraphs) {
  if (id >= 231 && id <= 300) return proseOf231To300(id, paragraphs);
  if (id >= 301 && id <= 371) return proseOf301To371(id, paragraphs);
  if (id === 5) return [paragraphs[0], `${paragraphs[1]} ${paragraphs[2]}`, paragraphs[3]];
  if (id === 8) return [`${paragraphs[0]} ${paragraphs[1]}`, paragraphs[2]];
  if (id === 22) return paragraphs.slice(0, -2);
  if (id === 23 || id === 29) return paragraphs.slice(0, -2);
  if (id === 31 || id === 44 || id === 56 || id === 64 || id === 71) return paragraphs.slice(0, -2);
  if (id === 38) return [`${paragraphs[0]} ${paragraphs[1]}`];
  if ([46, 58, 66, 69, 72, 76].includes(id)) return paragraphs.slice(0, -3);
  if (id === 57) return paragraphs.slice(0, -2);
  if (id === 85) return [paragraphs[0], paragraphs[1], `${paragraphs[2]} ${paragraphs[3]}`, paragraphs[4]];
  if (id === 84 || id === 93 || id === 94 || id === 97 || id === 98 || id === 101 || id === 102 || id === 103 || id === 106 || id === 107 || id === 109 || id === 110) return paragraphs.slice(0, -2);
  if (id === 91 || id === 92 || id === 95 || id === 108) return paragraphs.slice(0, -3);
  if (id === 117) return paragraphs.slice(0, -4);
  if (id === 123) {
    const marker = " To ask the stranger to leave";
    const splitAt = paragraphs[3].indexOf(marker);
    return [...paragraphs.slice(0, 3), splitAt >= 0 ? paragraphs[3].slice(0, splitAt) : paragraphs[3]];
  }
  if (id === 141) return paragraphs.slice(0, -5);
  if (id === 145) return [...paragraphs.slice(0, 5), `${paragraphs[5]} ${paragraphs[6]}`];
  if (id === 150) return [paragraphs[0], `${paragraphs[1]} ${paragraphs[2]}`, paragraphs[3]];
  if (id === 151) return [`${paragraphs[0]} ${paragraphs[1]}`, ...paragraphs.slice(2, -1)];
  if (id === 154 || id === 158 || id === 162 || id === 169 || id === 176) return paragraphs.slice(0, -2);
  if (id === 168) return [`${paragraphs[0]} ${paragraphs[1]}`, `${paragraphs[2]} ${paragraphs[3]}`];
  if (id === 156) return paragraphs.slice(0, -3);
  if (id === 159) return paragraphs.slice(0, -4);
  if (id === 179) return [paragraphs[0]];
  if (id === 186 || id === 211) return [paragraphs[0]];
  if (id === 188 || id === 193 || id === 208 || id === 209 || id === 217) return paragraphs.slice(0, -2);
  if (id === 189 || id === 200 || id === 226) return paragraphs.slice(0, -3);
  if (id === 213) return paragraphs.slice(0, -2);
  if (id === 229) return paragraphs.slice(0, -2);
  return paragraphs.slice(0, -1);
}

export function buildStory(raw) {
  const entries = {};
  const texts = {};

  for (let id = RANGE[0]; id <= RANGE[1]; id += 1) {
    const source = raw[String(id)];
    if (!source) throw new Error(`Brak paragrafu ${id} w raw-entries.json`);
    const config = CONFIG[id];
    if (!config) throw new Error(`Brak jawnej konfiguracji mechaniki paragrafu ${id}`);

    const entry = { id, scene: sceneFor(id), text: [], from: source.trace };
    for (const paragraph of proseOf(id, source.paragraphs)) {
      const key = `e${id}.p${entry.text.length + 1}`;
      entry.text.push(key);
      texts[key] = paragraph;
    }
    if (config.guards) entry.guards = structuredClone(config.guards);
    if (config.on) entry.on = structuredClone(config.on);
    if (config.end) entry.end = true;
    if (config.choices) {
      entry.choices = config.choices.map((item, index) => {
        const key = `e${id}.c${index + 1}`;
        texts[key] = item.label;
        const { label, ...choiceConfig } = item;
        return { text: key, ...choiceConfig };
      });
    }
    entries[id] = entry;
  }

  return {
    story: { extracted: [...RANGE], start: 1, starts: { alex: 1, charlie: 2 }, entries },
    texts,
  };
}

export function writeStoryFiles(raw) {
  const { story, texts } = buildStory(raw);
  const data = new URL("../data/", import.meta.url);
  const textEn = new URL("text.en.json", data);
  // Zachowaj ręczne poprawki i znaczniki istniejących kluczy. Generator
  // dodaje tylko nowe treści wynikające z rozszerzonego zakresu.
  const existing = existsSync(textEn) ? JSON.parse(readFileSync(textEn, "utf8")) : {};
  const mergedTexts = { ...texts };
  for (const key of Object.keys(mergedTexts)) {
    if (typeof existing[key] === "string" && existing[key].trim()) mergedTexts[key] = existing[key];
  }
  writeFileSync(new URL("story.json", data), `${JSON.stringify(story, null, 2)}\n`);
  writeFileSync(textEn, `${JSON.stringify(mergedTexts, null, 2)}\n`);
  const textPl = new URL("text.pl.json", data);
  const media = new URL("media.json", data);
  if (!existsSync(textPl)) writeFileSync(textPl, "{}\n");
  if (!existsSync(media)) {
    writeFileSync(media, `${JSON.stringify({ entries: {}, scenes: {} }, null, 2)}\n`);
  }
  return { story, texts: mergedTexts };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const raw = JSON.parse(readFileSync(new URL("./raw-entries.json", import.meta.url), "utf8"));
  const { story, texts } = writeStoryFiles(raw);
  console.log(`Zbudowano ${Object.keys(story.entries).length} paragrafów, ${Object.keys(texts).length} tekstów.`);
}
