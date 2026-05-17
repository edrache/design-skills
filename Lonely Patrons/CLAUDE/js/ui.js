// js/ui.js
var UI = {

  // ===== JĘZYK =====
  setLanguage: function(lang) {
    Game.state.language = lang;
    Game.save();
    // Zaktualizuj przyciski lang
    document.getElementById("btn-lang-en").classList.toggle("active", lang === "en");
    document.getElementById("btn-lang-pl").classList.toggle("active", lang === "pl");
    // Podmień wszystkie data-i18n
    document.querySelectorAll("[data-i18n]").forEach(function(el) {
      var key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    // Przerenderuj aktywną zakładkę (wyniki rzutów w nowym języku)
    UI.renderActiveTab();
    // Aktualizuj etykietę dnia
    UI.updateDayLabel();
  },

  // ===== ZAKŁADKI =====
  showTab: function(tabName) {
    document.querySelectorAll(".tab-panel").forEach(function(el) {
      el.classList.add("hidden");
    });
    document.querySelectorAll(".nav-btn").forEach(function(el) {
      el.classList.remove("active");
    });
    var panel = document.getElementById("tab-" + tabName);
    if (panel) panel.classList.remove("hidden");
    var btn = document.querySelector(".nav-btn[data-tab='" + tabName + "']");
    if (btn) btn.classList.add("active");
    UI.currentTab = tabName;
    UI.renderActiveTab();
  },

  currentTab: "arrival",
  currentSubtab: "morning",

  showSubtab: function(name) {
    document.querySelectorAll(".subtab-panel").forEach(function(el) {
      el.classList.add("hidden");
    });
    document.querySelectorAll(".subtab-btn").forEach(function(el) {
      el.classList.remove("active");
    });
    var panel = document.getElementById("subtab-" + name);
    if (panel) panel.classList.remove("hidden");
    var btn = document.querySelector(".subtab-btn[data-subtab='" + name + "']");
    if (btn) btn.classList.add("active");
    UI.currentSubtab = name;
  },

  renderActiveTab: function() {
    var tab = UI.currentTab;
    if (tab === "arrival")  UI.renderArrival();
    if (tab === "day")      UI.renderDay();
    if (tab === "ending")   UI.renderEnding();
    if (tab === "summary")  UI.renderSummary();
  },

  updateDayLabel: function() {
    var el = document.getElementById("day-tab-label");
    if (el) el.textContent = t("tab.day") + " " + Game.state.day;
  },

  // ===== KOMPONENT RZUTU =====
  // Tworzy rząd: etykieta | przycisk rzutu | wynik + re-roll
  makeRollRow: function(tableKey, statePath, rollFn) {
    var table = TABLES[tableKey];
    var lang = Game.state.language;
    var label = table.label[lang] || table.label["en"];

    // Pobierz istniejący wynik z state
    var existing = UI.getStateValue(statePath);

    var row = document.createElement("div");
    row.className = "roll-row";
    row.id = "row-" + tableKey;

    var labelEl = document.createElement("span");
    labelEl.className = "roll-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);

    var resultDiv = document.createElement("div");
    resultDiv.className = "roll-result";
    resultDiv.id = "result-" + tableKey;

    if (existing) {
      resultDiv.innerHTML = UI.makeResultHTML(tableKey, existing);
    } else {
      var rollBtn = document.createElement("button");
      rollBtn.className = "btn-roll";
      rollBtn.textContent = t("btn.roll");
      rollBtn.onclick = function() { rollFn(); };
      resultDiv.appendChild(rollBtn);
    }

    row.appendChild(resultDiv);
    return row;
  },

  makeResultHTML: function(tableKey, rollValue) {
    var text = Game.getResult(tableKey, rollValue);
    return '<span class="result-value">' + text + '</span>' +
           '<button class="btn-reroll" onclick="UI.reroll(\'' + tableKey + '\')">' + t("btn.reroll") + '</button>';
  },

  reroll: function(tableKey) {
    // Znajdź statePath i rollFn z konfiguracji
    var cfg = UI.rollConfig[tableKey];
    if (cfg) cfg.rollFn();
  },

  getStateValue: function(path) {
    if (!path) return null;
    var parts = path.split(".");
    var obj = Game.state;
    for (var i = 0; i < parts.length; i++) {
      if (obj == null) return null;
      obj = obj[parts[i]];
    }
    return obj;
  },

  updateResult: function(tableKey, rollValue, statePath) {
    if (statePath) Game.setResult(statePath, rollValue);
    var resultDiv = document.getElementById("result-" + tableKey);
    if (resultDiv) resultDiv.innerHTML = UI.makeResultHTML(tableKey, rollValue);
    UI.renderSummaryIfVisible();
  },

  renderSummaryIfVisible: function() {
    if (UI.currentTab === "summary") UI.renderSummary();
  },

  // ===== NOWA SESJA =====
  confirmNewSession: function() {
    if (confirm(t("confirm.newSession"))) {
      Game.reset();
      UI.renderActiveTab();
      UI.showTab("arrival");
      UI.updateDayLabel();
    }
  },

  // ===== NOWY DZIEŃ =====
  newDay: function() {
    Game.newDay();
    UI.updateDayLabel();
    UI.renderDay();
  },

  // Konfiguracja rzutów (wypełniana przez renderArrival/renderDay/renderEnding)
  rollConfig: {},

  // ===== OVERLAY PRZYMIOTNIKA =====
  openAdjectiveOverlay: function() {
    document.getElementById("adj-overlay").classList.remove("hidden");
    UI.rollAdjective();
  },
  closeAdjectiveOverlay: function() {
    document.getElementById("adj-overlay").classList.add("hidden");
  },
  rollAdjective: function() {
    var r = Game.rollAdjective();
    document.getElementById("adj-result").textContent = r.text;
    document.getElementById("adj-number").textContent = "#" + r.number;
  },

  // ===== PLACEHOLDER METODY (dodawane w kolejnych taskach) =====
  renderArrival: function() {
    var lang = Game.state.language;

    // --- KRAJOBRAZ ---
    var landscapeGroup = document.getElementById("rolls-landscape");
    landscapeGroup.innerHTML = "";

    function makeRoll(tableKey, statePath, rollFn) {
      UI.rollConfig[tableKey] = { statePath: statePath, rollFn: rollFn };
      return UI.makeRollRow(tableKey, statePath, rollFn);
    }

    landscapeGroup.appendChild(makeRoll("season", "landscape.season", function() {
      UI.updateResult("season", Game.rollDie(4), "landscape.season");
    }));
    landscapeGroup.appendChild(makeRoll("region", "landscape.region", function() {
      UI.updateResult("region", Game.rollD66(), "landscape.region");
    }));
    landscapeGroup.appendChild(makeRoll("terrain", "landscape.terrain", function() {
      UI.updateResult("terrain", Game.rollDie(8), "landscape.terrain");
    }));
    landscapeGroup.appendChild(makeRoll("weather", "landscape.weather", function() {
      UI.updateResult("weather", Game.rollDie(12), "landscape.weather");
    }));
    landscapeGroup.appendChild(makeRoll("patronHouse", "landscape.house", function() {
      UI.updateResult("patronHouse", Game.rollDie(20), "landscape.house");
    }));
    landscapeGroup.appendChild(makeRoll("regionKnownFor", "landscape.knownFor", function() {
      var roll = Game.rollDie(100);
      if (roll >= 95) roll = 95;
      UI.updateResult("regionKnownFor", roll, "landscape.knownFor");
    }));

    // --- PATRON ---
    var patronGroup = document.getElementById("rolls-patron");
    patronGroup.innerHTML = "";

    patronGroup.appendChild(makeRoll("appearance", "patron.appearance", function() {
      UI.updateResult("appearance", Game.rollDie(4), "patron.appearance");
    }));
    patronGroup.appendChild(makeRoll("personality", "patron.personality", function() {
      UI.updateResult("personality", Game.rollD66(), "patron.personality");
    }));
    patronGroup.appendChild(makeRoll("nameInitials", "patron.nameInitials", function() {
      UI.updateResult("nameInitials", Game.rollDie(8), "patron.nameInitials");
    }));
    patronGroup.appendChild(makeRoll("ancestry", "patron.ancestry", function() {
      var roll = Game.rollDie(12);
      var r = roll <= 3 ? 1 : roll;
      UI.updateResult("ancestry", r, "patron.ancestry");
    }));
    patronGroup.appendChild(makeRoll("talent", "patron.talent", function() {
      UI.updateResult("talent", Game.rollDie(20), "patron.talent");
    }));
    patronGroup.appendChild(makeRoll("ttrpgThemes", "patron.theme1", function() {
      var r1 = Game.rollDie(100);
      var r2 = Game.rollDie(100);
      Game.setResult("patron.theme1", r1);
      Game.setResult("patron.theme2", r2);
      var t1 = Game.getResult("ttrpgThemes", r1);
      var t2 = Game.getResult("ttrpgThemes", r2);
      var resultDiv = document.getElementById("result-ttrpgThemes");
      if (resultDiv) {
        resultDiv.innerHTML =
          '<span class="result-value">' + t1 + ' / ' + t2 + '</span>' +
          '<button class="btn-reroll" onclick="UI.reroll(\'ttrpgThemes\')">' + t("btn.reroll") + '</button>';
      }
      UI.renderSummaryIfVisible();
    }));
  },
  renderDay: function() {
    UI.renderWPTracker();
    UI.renderMorning();
    UI.renderAfternoon();
    UI.renderNight();
  },

  renderWPTracker: function() {
    var wp = Game.state.workPoints;
    var pct = Math.round((wp / 30) * 100);
    var container = document.getElementById("wp-tracker");
    var complete = wp === 0;
    container.innerHTML =
      '<div class="wp-header">' +
        '<span>' + t("wp.label") + '</span>' +
        '<span class="wp-count">' + wp + ' / 30</span>' +
      '</div>' +
      '<div class="wp-bar-bg"><div class="wp-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="wp-actions">' +
        (complete ? '' :
          '<button class="btn-roll" onclick="UI.doWPRoll()">' + t("btn.rollWp") + '</button>' +
          '<button class="wp-adj-btn" onclick="Game.state.workPoints = Math.min(30, Game.state.workPoints+1); Game.save(); UI.renderWPTracker();">+</button>' +
          '<button class="wp-adj-btn" onclick="Game.state.workPoints = Math.max(0, Game.state.workPoints-1); Game.save(); UI.renderWPTracker();">−</button>'
        ) +
      '</div>' +
      (complete ? '<div class="wp-complete">' + t("wp.complete") + '</div>' : '');
  },

  doWPRoll: function() {
    var r = Game.wpRollDie();
    Game.reduceWP(r.result);
    UI.renderWPTracker();
    UI.renderSummaryIfVisible();
    var log = document.getElementById("wp-roll-log");
    if (!log) {
      log = document.createElement("div");
      log.id = "wp-roll-log";
      log.style.cssText = "font-size:13px;color:var(--text-muted);margin-top:8px";
      document.getElementById("wp-tracker").parentNode.insertBefore(log, document.getElementById("wp-tracker").nextSibling);
    }
    log.textContent += "1D" + r.sides + " → " + r.result + "  ";
  },

  renderMorning: function() {
    var group = document.getElementById("rolls-morning");
    group.innerHTML = "";

    UI.rollConfig["system"] = { statePath: "morningSystem", rollFn: function() {
      UI.updateResult("system", Game.rollDie(20), "morningSystem");
    }};
    group.appendChild(UI.makeRollRow("system", "morningSystem", UI.rollConfig["system"].rollFn));

    UI.renderImprovement();
  },

  renderImprovement: function() {
    var sec = document.getElementById("improvement-section");
    var bonus = Game.state.improvementBonus;
    var attempts = Game.state.improvementAttemptsToday;
    var maxAttempts = 2;
    sec.innerHTML =
      '<div class="improvement-header">' + t("improvement.label") + '</div>' +
      '<div class="improvement-bonus">+' + bonus + '</div>' +
      (attempts < maxAttempts ?
        '<button class="btn-roll" onclick="UI.doImprovement()">' + t("improvement.try") + ' (' + (maxAttempts - attempts) + ')</button>' :
        '<div class="improvement-log">' + t("improvement.label") + ': max</div>'
      );
  },

  doImprovement: function() {
    var r = Game.tryImprovement();
    if (!r) return;
    var log = (r.success ? "✓ " : "✗ ") + "1D6=" + r.roll + " (próg " + r.threshold + "+) → +" + r.newBonus;
    UI.renderImprovement();
    var sec = document.getElementById("improvement-section");
    var logEl = document.createElement("div");
    logEl.className = "improvement-log";
    logEl.textContent = log;
    sec.appendChild(logEl);
  },

  renderAfternoon: function() {
    var group = document.getElementById("rolls-afternoon");
    group.innerHTML = "";

    var state = Game.state;
    if (!state._act1) state._act1 = null;
    if (!state._act2) state._act2 = null;
    if (!state._actChosen) state._actChosen = null;

    var row = document.createElement("div");
    row.innerHTML =
      '<div class="roll-row">' +
        '<span class="roll-label">' + (TABLES.activities.label[state.language] || TABLES.activities.label.en) + '</span>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="btn-roll" onclick="UI.rollActivity(1)">' + t("btn.rollActivity1") + '</button>' +
          '<button class="btn-roll" onclick="UI.rollActivity(2)">' + t("btn.rollActivity2") + '</button>' +
        '</div>' +
      '</div>' +
      '<div id="activities-results"></div>';
    group.appendChild(row);
    UI.renderActivityResults();

    UI.rollConfig["enjoyment"] = { statePath: null, rollFn: function() {
      var r = Game.rollDie(12);
      var text = Game.getResult("enjoyment", r);
      var el = document.getElementById("result-enjoyment");
      if (el) el.innerHTML = '<span class="result-value">' + text + '</span>' +
        '<button class="btn-reroll" onclick="UI.reroll(\'enjoyment\')">' + t("btn.reroll") + '</button>';
    }};
    group.appendChild(UI.makeRollRow("enjoyment", null, UI.rollConfig["enjoyment"].rollFn));
  },

  rollActivity: function(num) {
    var r = Game.rollDie(100);
    var state = Game.state;
    if (num === 1) state._act1 = r; else state._act2 = r;
    Game.save();
    UI.renderActivityResults();
  },

  renderActivityResults: function() {
    var state = Game.state;
    var container = document.getElementById("activities-results");
    if (!container) return;
    var html = '<div class="activities-choice">';
    if (state._act1) {
      var t1 = Game.getResult("activities", state._act1);
      html += '<button class="activity-option' + (state._actChosen === 1 ? " chosen" : "") + '" onclick="UI.chooseActivity(1)">' + t1 + '</button>';
    }
    if (state._act2) {
      var t2 = Game.getResult("activities", state._act2);
      html += '<button class="activity-option' + (state._actChosen === 2 ? " chosen" : "") + '" onclick="UI.chooseActivity(2)">' + t2 + '</button>';
    }
    html += '</div>';
    container.innerHTML = html;
  },

  chooseActivity: function(num) {
    Game.state._actChosen = num;
    Game.save();
    UI.renderActivityResults();
    UI.renderSummaryIfVisible();
  },

  renderNight: function() {
    var group = document.getElementById("rolls-night");
    group.innerHTML = "";

    UI.rollConfig["tone"] = { statePath: null, rollFn: function() {
      var r = Game.rollDie(6);
      var el = document.getElementById("result-tone");
      if (el) el.innerHTML = '<span class="result-value">' + Game.getResult("tone", r) + '</span>' +
        '<button class="btn-reroll" onclick="UI.reroll(\'tone\')">' + t("btn.reroll") + '</button>';
    }};
    group.appendChild(UI.makeRollRow("tone", null, UI.rollConfig["tone"].rollFn));

    UI.rollConfig["topic"] = { statePath: null, rollFn: function() {
      var r = Game.rollDie(100);
      var el = document.getElementById("result-topic");
      if (el) el.innerHTML = '<span class="result-value">' + Game.getResult("topic", r) + '</span>' +
        '<button class="btn-reroll" onclick="UI.reroll(\'topic\')">' + t("btn.reroll") + '</button>';
    }};
    group.appendChild(UI.makeRollRow("topic", null, UI.rollConfig["topic"].rollFn));
  },
  renderEnding: function() {},
  renderSummary: function() {},

  // ===== INIT =====
  init: function() {
    // Ustaw język z state
    var lang = Game.state.language || "pl";
    UI.setLanguage(lang);
    UI.showTab("arrival");
    UI.updateDayLabel();
  }
};

// Uruchom po załadowaniu DOM
document.addEventListener("DOMContentLoaded", function() { UI.init(); });
