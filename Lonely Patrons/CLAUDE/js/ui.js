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
  renderArrival: function() {},
  renderDay: function() {},
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
