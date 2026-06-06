// js/game.js
var Game = {
  storageKey: "lonely-patrons-state",

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
        season: null,
        region: null,
        terrain: null,
        weather: null,
        house: null,
        knownFor: null
      },
      patron: {
        appearance: null,
        personality: null,
        nameInitials: null,
        ancestry: null,
        talent: null,
        theme1: null,
        theme2: null
      },
      morningSystem: null,
      days: [],
      ending: {
        delivery: null,
        deliveryRoll: null,
        whatTheyLove: null,
        proposalRelationship: 0,
        proposalRoll: null,
        event: null
      },
      _act1: null,
      _act2: null,
      _actChosen: null,
      _sessionVersion: 1
    };
  },

  state: null,

  init: function() {
    var saved = this.loadRawState();
    this.state = this.normalizeState(saved);
    this.save();
  },

  loadRawState: function() {
    if (typeof localStorage === "undefined") return null;
    try {
      var saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      return null;
    }
  },

  normalizeState: function(savedState) {
    var state = this.mergeDeep(this.defaultState(), savedState || {});

    if (state.language !== "en" && state.language !== "pl") state.language = "pl";
    if (typeof state.day !== "number" || state.day < 1) state.day = 1;
    if (typeof state.characterAge !== "number" || state.characterAge < 16) state.characterAge = 16;
    if (typeof state.workPoints !== "number" || isNaN(state.workPoints)) state.workPoints = 30;
    state.workPoints = Math.max(0, Math.min(30, Math.round(state.workPoints)));

    if (typeof state.improvementBonus !== "number" || isNaN(state.improvementBonus)) state.improvementBonus = 0;
    state.improvementBonus = Math.max(0, Math.min(3, Math.round(state.improvementBonus)));

    if (typeof state.improvementAttemptsToday !== "number" || isNaN(state.improvementAttemptsToday)) {
      state.improvementAttemptsToday = 0;
    }
    state.improvementAttemptsToday = Math.max(0, Math.min(2, Math.round(state.improvementAttemptsToday)));

    if (!state.days || typeof state.days.length !== "number") state.days = [];

    state.ending.proposalRelationship = parseInt(state.ending.proposalRelationship, 10);
    if (isNaN(state.ending.proposalRelationship)) state.ending.proposalRelationship = 0;

    return state;
  },

  mergeDeep: function(target, source) {
    var key;
    var output = Array.isArray(target) ? target.slice() : {};

    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        output[key] = target[key];
      }
    }

    if (!source || typeof source !== "object") return output;

    for (key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      if (this.isPlainObject(source[key]) && this.isPlainObject(output[key])) {
        output[key] = this.mergeDeep(output[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }

    return output;
  },

  isPlainObject: function(value) {
    return !!value && Object.prototype.toString.call(value) === "[object Object]";
  },

  save: function() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {}
  },

  reset: function() {
    this.state = this.defaultState();
    this.save();
  },

  rollDie: function(n) {
    return Math.floor(Math.random() * n) + 1;
  },

  rollD66: function() {
    return this.rollDie(6) * 10 + this.rollDie(6);
  },

  roll2D6: function() {
    return this.rollDie(6) + this.rollDie(6);
  },

  wpRollDie: function() {
    var wp = this.state.workPoints;
    var sides = wp >= 20 ? 20 : wp >= 12 ? 12 : wp >= 10 ? 10 : wp >= 8 ? 8 : wp >= 6 ? 6 : 4;
    return { sides: sides, result: this.rollDie(sides) };
  },

  reduceWP: function(amount) {
    var newWP = this.state.workPoints - amount;
    if (newWP < 0) newWP = Math.abs(newWP);
    this.state.workPoints = Math.max(0, Math.min(30, newWP));
    this.save();
    return this.state.workPoints;
  },

  getResult: function(tableKey, rollValue) {
    var table = typeof TABLES !== "undefined" ? TABLES[tableKey] : null;
    var lang = this.state.language;
    var data;
    var i;
    var entry;

    if (!table) return "?";
    data = table[lang] || table.en;

    if (table.type === "d66") {
      return data[rollValue] || "?";
    }
    if (table.type === "2d6") {
      for (i = 0; i < data.length; i += 1) {
        entry = data[i];
        if (entry && rollValue >= entry.min && rollValue <= entry.max) return entry.text;
      }
      return "?";
    }
    if (table.type === "age") {
      return data[rollValue] || data[80] || "?";
    }
    if (table.type === "adjective") {
      return data[rollValue] || "?";
    }
    return data[rollValue] || "?";
  },

  rollAdjective: function() {
    var hundreds = this.rollDie(6) * 100;
    var tens = (this.rollDie(10) % 10) * 10;
    var units = this.rollDie(10) % 10;
    var number = hundreds + tens + units;
    return {
      number: number,
      text: this.getResult("adjectives", number)
    };
  },

  tryImprovement: function() {
    var bonus;
    var roll;
    var threshold;
    var success;

    if (this.state.improvementAttemptsToday >= 2) return null;

    bonus = this.state.improvementBonus;
    roll = this.rollDie(6);
    threshold = bonus === 0 ? 3 : bonus === 1 ? 4 : 5;
    success = roll >= threshold;

    this.state.improvementAttemptsToday += 1;
    if (success && bonus < 3) this.state.improvementBonus += 1;
    this.save();

    return {
      roll: roll,
      threshold: threshold,
      success: success,
      newBonus: this.state.improvementBonus
    };
  },

  newDay: function() {
    this.state.day += 1;
    this.state.improvementAttemptsToday = 0;
    this.save();
  },

  setResult: function(path, value) {
    var parts = path.split(".");
    var obj = this.state;
    var i;

    for (i = 0; i < parts.length - 1; i += 1) {
      if (!obj[parts[i]] || typeof obj[parts[i]] !== "object") obj[parts[i]] = {};
      obj = obj[parts[i]];
    }

    obj[parts[parts.length - 1]] = value;
    this.save();
  }
};

Game.init();
