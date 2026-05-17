// js/game.js
var Game = {

  defaultState: function() {
    return {
      language: "pl",
      phase: "arrival",
      characterAge: 16,
      day: 1,
      workPoints: 30,
      improvementBonus: 0,
      improvementAttemptsToday: 0,
      landscape: {
        season: null, region: null, terrain: null,
        weather: null, house: null, knownFor: null
      },
      patron: {
        appearance: null, personality: null, nameInitials: null,
        ancestry: null, talent: null, theme1: null, theme2: null
      },
      morningSystem: null,
      days: [],
      ending: {
        delivery: null, deliveryRoll: null,
        whatTheyLove: null, proposalRelationship: 0,
        proposalRoll: null, event: null
      }
    };
  },

  state: null,

  init: function() {
    var saved = localStorage.getItem("lonely-patrons-state");
    if (saved) {
      try { this.state = JSON.parse(saved); }
      catch(e) { this.state = this.defaultState(); }
    } else {
      this.state = this.defaultState();
    }
  },

  save: function() {
    localStorage.setItem("lonely-patrons-state", JSON.stringify(this.state));
  },

  reset: function() {
    this.state = this.defaultState();
    this.save();
  },

  // Rzut kością n-ścienną (1..n)
  rollDie: function(n) {
    return Math.floor(Math.random() * n) + 1;
  },

  // D66: dwa d6, konkatenacja → klucz 11-66
  rollD66: function() {
    return this.rollDie(6) * 10 + this.rollDie(6);
  },

  // 2D6: suma
  roll2D6: function() {
    return this.rollDie(6) + this.rollDie(6);
  },

  // Auto-dobór kości wg aktualnych WP
  wpRollDie: function() {
    var wp = this.state.workPoints;
    var sides = wp >= 20 ? 20 : wp >= 12 ? 12 : wp >= 10 ? 10 : wp >= 8 ? 8 : wp >= 6 ? 6 : 4;
    return { sides: sides, result: this.rollDie(sides) };
  },

  // Redukcja WP (wynik ujemny → wartość bezwzględna)
  reduceWP: function(amount) {
    var newWP = this.state.workPoints - amount;
    if (newWP < 0) newWP = Math.abs(newWP);
    this.state.workPoints = newWP;
    this.save();
    return newWP;
  },

  // Pobierz wynik z tabeli wg klucza i aktualnego języka
  getResult: function(tableKey, rollValue) {
    var lang = this.state.language;
    var table = TABLES[tableKey];
    if (!table) return "?";
    var data = table[lang] || table["en"];

    if (table.type === "d66") {
      return data[rollValue] || "?";
    }
    if (table.type === "2d6") {
      for (var i = 0; i < data.length; i++) {
        var entry = data[i];
        if (rollValue >= entry.min && rollValue <= entry.max) return entry.text;
      }
      return "?";
    }
    if (table.type === "age") {
      return data[rollValue] || data[80] || "?";
    }
    if (table.type === "adjective") {
      return data[rollValue] || "?";
    }
    // Zwykłe tablice (d4, d6, d8, d12, d20, d100)
    return data[rollValue] || "?";
  },

  // Rzut przymiotnika (600 adjectives): 1D6×100 + (1D10%10)×10 + (1D10%10)
  rollAdjective: function() {
    var hundreds = this.rollDie(6) * 100;
    var tens = (this.rollDie(10) % 10) * 10;
    var units = this.rollDie(10) % 10;
    var num = hundreds + tens + units;
    return { number: num, text: this.getResult("adjectives", num) };
  },

  // Próba ulepszenia (improvement): max 2 próby dziennie
  tryImprovement: function() {
    if (this.state.improvementAttemptsToday >= 2) return null;
    var bonus = this.state.improvementBonus;
    var roll = this.rollDie(6);
    var threshold = bonus === 0 ? 3 : bonus === 1 ? 4 : 5;
    var success = roll >= threshold;
    this.state.improvementAttemptsToday += 1;
    if (success && bonus < 3) this.state.improvementBonus += 1;
    this.save();
    return { roll: roll, threshold: threshold, success: success, newBonus: this.state.improvementBonus };
  },

  // Nowy dzień: zapisuje aktualny dzień, resetuje próby ulepszenia
  newDay: function() {
    this.state.day += 1;
    this.state.improvementAttemptsToday = 0;
    this.save();
  },

  // Zapisz wynik rzutu w stanie gry
  setResult: function(path, value) {
    // path np. "landscape.season" lub "patron.theme1"
    var parts = path.split(".");
    var obj = this.state;
    for (var i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    this.save();
  }
};

Game.init();
