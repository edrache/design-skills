// js/ui.js
var UI = {
  currentTab: "arrival",
  currentSubtab: "morning",
  rollConfig: {},

  setLanguage: function(lang) {
    Game.state.language = lang;
    Game.save();
    document.documentElement.lang = lang;

    var enBtn = document.getElementById("btn-lang-en");
    var plBtn = document.getElementById("btn-lang-pl");
    if (enBtn) enBtn.classList.toggle("active", lang === "en");
    if (plBtn) plBtn.classList.toggle("active", lang === "pl");

    document.querySelectorAll("[data-i18n]").forEach(function(el) {
      var key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });

    UI.updateDayLabel();
    UI.updateArrivalBadge();
    UI.renderActiveTab();
  },

  showTab: function(tabName) {
    document.querySelectorAll(".tab-panel").forEach(function(el) {
      el.classList.add("hidden");
    });
    document.querySelectorAll(".nav-btn").forEach(function(el) {
      el.classList.remove("active");
    });

    var panel = document.getElementById("tab-" + tabName);
    if (panel) panel.classList.remove("hidden");

    var button = document.querySelector(".nav-btn[data-tab='" + tabName + "']");
    if (button) button.classList.add("active");

    UI.currentTab = tabName;
    UI.renderActiveTab();
  },

  showSubtab: function(name) {
    document.querySelectorAll(".subtab-panel").forEach(function(el) {
      el.classList.add("hidden");
    });
    document.querySelectorAll(".subtab-btn").forEach(function(el) {
      el.classList.remove("active");
    });

    var panel = document.getElementById("subtab-" + name);
    if (panel) panel.classList.remove("hidden");

    var button = document.querySelector(".subtab-btn[data-subtab='" + name + "']");
    if (button) button.classList.add("active");

    UI.currentSubtab = name;
  },

  renderActiveTab: function() {
    if (UI.currentTab === "arrival") UI.renderArrival();
    if (UI.currentTab === "day") UI.renderDay();
    if (UI.currentTab === "ending") UI.renderEnding();
    UI.renderSummary();
  },

  updateDayLabel: function() {
    var el = document.getElementById("day-tab-label");
    if (el) el.textContent = t("tab.day") + " " + Game.state.day;
  },

  updateArrivalBadge: function() {
    var label = document.querySelector(".nav-btn[data-tab='arrival'] .nav-label");
    if (!label) return;
    label.textContent = t("tab.arrival") + (UI.isArrivalComplete() ? " " + t("arrival.done") : "");
  },

  isArrivalComplete: function() {
    var landscape = Game.state.landscape || {};
    var patron = Game.state.patron || {};
    return !!(
      landscape.season &&
      landscape.region &&
      landscape.terrain &&
      landscape.weather &&
      landscape.house &&
      landscape.knownFor &&
      patron.appearance &&
      patron.personality &&
      patron.nameInitials &&
      patron.ancestry &&
      patron.talent &&
      patron.theme1 &&
      patron.theme2
    );
  },

  tableLabel: function(tableKey) {
    var table = TABLES[tableKey];
    var lang = Game.state.language;
    if (!table || !table.label) return tableKey;
    return table.label[lang] || table.label.en || tableKey;
  },

  ensureDayState: function() {
    if (!Game.state.days) Game.state.days = [];
    var index = Math.max(Game.state.day - 1, 0);
    if (!Game.state.days[index]) {
      Game.state.days[index] = {
        morning: { wpRolls: [], wpReductions: [], weatherRoll: null },
        afternoon: { activity1: null, activity2: null, chosen: null, enjoyment: null },
        night: { tone: null, topic: null }
      };
      Game.save();
    }
    return Game.state.days[index];
  },

  getCurrentDayState: function() {
    return UI.ensureDayState();
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

  setStateValue: function(path, value) {
    var parts = path.split(".");
    var obj = Game.state;
    for (var i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] == null || typeof obj[parts[i]] !== "object") obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    Game.save();
  },

  makeResultMarkup: function(text, rerollAction, meta) {
    var html = '<span class="result-value">' + UI.escapeHtml(text) + "</span>";
    if (meta) html += '<span class="result-meta">' + UI.escapeHtml(meta) + "</span>";
    html += '<button class="btn-reroll" onclick="' + rerollAction + '">' + t("btn.reroll") + "</button>";
    return html;
  },

  makeRollRow: function(tableKey, statePath, rollFn) {
    var existing = UI.getStateValue(statePath);
    var row = document.createElement("div");
    row.className = "roll-row";
    row.id = "row-" + tableKey;

    var labelEl = document.createElement("span");
    labelEl.className = "roll-label";
    labelEl.textContent = UI.tableLabel(tableKey);
    row.appendChild(labelEl);

    var resultDiv = document.createElement("div");
    resultDiv.className = "roll-result";
    resultDiv.id = "result-" + tableKey;

    if (existing != null) {
      resultDiv.innerHTML = UI.makeResultHTML(tableKey, existing);
    } else {
      var rollBtn = document.createElement("button");
      rollBtn.className = "btn-roll";
      rollBtn.textContent = t("btn.roll");
      rollBtn.onclick = rollFn;
      resultDiv.appendChild(rollBtn);
    }

    row.appendChild(resultDiv);
    return row;
  },

  makeResultHTML: function(tableKey, rollValue) {
    if (tableKey === "ttrpgThemes") {
      var t1 = Game.state.patron && Game.state.patron.theme1;
      var t2 = Game.state.patron && Game.state.patron.theme2;
      var text1 = t1 ? Game.getResult("ttrpgThemes", t1) : "";
      var text2 = t2 ? Game.getResult("ttrpgThemes", t2) : "";
      return UI.makeResultMarkup(text1 + " / " + text2, "UI.reroll('ttrpgThemes')");
    }
    return UI.makeResultMarkup(Game.getResult(tableKey, rollValue), "UI.reroll('" + tableKey + "')");
  },

  reroll: function(tableKey) {
    var cfg = UI.rollConfig[tableKey];
    if (cfg && typeof cfg.rollFn === "function") cfg.rollFn();
  },

  updateResult: function(tableKey, rollValue, statePath) {
    if (statePath) UI.setStateValue(statePath, rollValue);
    var resultDiv = document.getElementById("result-" + tableKey);
    if (resultDiv) resultDiv.innerHTML = UI.makeResultHTML(tableKey, rollValue);
    UI.updateArrivalBadge();
    UI.renderSummary();
  },

  confirmNewSession: function() {
    if (!confirm(t("confirm.newSession"))) return;
    Game.reset();
    UI.currentTab = "arrival";
    UI.currentSubtab = "morning";
    UI.updateDayLabel();
    UI.updateArrivalBadge();
    UI.showTab("arrival");
    UI.showSubtab("morning");
  },

  newDay: function() {
    UI.ensureDayState();
    Game.newDay();
    UI.ensureDayState();
    UI.updateDayLabel();
    UI.renderDay();
    UI.renderSummary();
  },

  renderArrival: function() {
    var landscapeGroup = document.getElementById("rolls-landscape");
    var patronGroup = document.getElementById("rolls-patron");
    if (!landscapeGroup || !patronGroup) return;

    landscapeGroup.innerHTML = "";
    patronGroup.innerHTML = "";
    UI.rollConfig = {};

    function addConfiguredRow(container, tableKey, statePath, rollFn) {
      UI.rollConfig[tableKey] = { statePath: statePath, rollFn: rollFn };
      container.appendChild(UI.makeRollRow(tableKey, statePath, rollFn));
    }

    addConfiguredRow(landscapeGroup, "season", "landscape.season", function() {
      UI.updateResult("season", Game.rollDie(4), "landscape.season");
    });
    addConfiguredRow(landscapeGroup, "region", "landscape.region", function() {
      UI.updateResult("region", Game.rollD66(), "landscape.region");
    });
    addConfiguredRow(landscapeGroup, "terrain", "landscape.terrain", function() {
      UI.updateResult("terrain", Game.rollDie(8), "landscape.terrain");
    });
    addConfiguredRow(landscapeGroup, "weather", "landscape.weather", function() {
      UI.updateResult("weather", Game.rollDie(12), "landscape.weather");
    });
    addConfiguredRow(landscapeGroup, "patronHouse", "landscape.house", function() {
      UI.updateResult("patronHouse", Game.rollDie(20), "landscape.house");
    });
    addConfiguredRow(landscapeGroup, "regionKnownFor", "landscape.knownFor", function() {
      UI.updateResult("regionKnownFor", Game.rollDie(100), "landscape.knownFor");
    });

    addConfiguredRow(patronGroup, "appearance", "patron.appearance", function() {
      UI.updateResult("appearance", Game.rollDie(4), "patron.appearance");
    });
    addConfiguredRow(patronGroup, "personality", "patron.personality", function() {
      UI.updateResult("personality", Game.rollD66(), "patron.personality");
    });
    addConfiguredRow(patronGroup, "nameInitials", "patron.nameInitials", function() {
      UI.updateResult("nameInitials", Game.rollDie(8), "patron.nameInitials");
    });
    addConfiguredRow(patronGroup, "ancestry", "patron.ancestry", function() {
      var roll = Game.rollDie(12);
      UI.updateResult("ancestry", roll <= 3 ? 1 : roll, "patron.ancestry");
    });
    addConfiguredRow(patronGroup, "talent", "patron.talent", function() {
      UI.updateResult("talent", Game.rollDie(20), "patron.talent");
    });
    UI.rollConfig.ttrpgThemes = {
      statePath: "patron.theme1",
      rollFn: function() {
        var r1 = Game.rollDie(100);
        var r2 = Game.rollDie(100);
        UI.setStateValue("patron.theme1", r1);
        UI.setStateValue("patron.theme2", r2);
        var resultDiv = document.getElementById("result-ttrpgThemes");
        if (resultDiv) resultDiv.innerHTML = UI.makeResultHTML("ttrpgThemes", r1);
        UI.updateArrivalBadge();
        UI.renderSummary();
      }
    };
    patronGroup.appendChild(UI.makeRollRow("ttrpgThemes", "patron.theme1", UI.rollConfig.ttrpgThemes.rollFn));
  },

  renderDay: function() {
    UI.ensureDayState();
    UI.renderWPTracker();
    UI.renderMorning();
    UI.renderAfternoon();
    UI.renderNight();
    UI.showSubtab(UI.currentSubtab || "morning");
  },

  renderWPTracker: function() {
    var wp = Game.state.workPoints;
    var container = document.getElementById("wp-tracker");
    if (!container) return;
    var pct = Math.max(0, Math.min(100, Math.round((wp / 30) * 100)));
    var complete = wp === 0;

    container.innerHTML =
      '<div class="wp-header">' +
        "<span>" + UI.escapeHtml(t("wp.label")) + "</span>" +
        '<span class="wp-count">' + wp + " / 30</span>" +
      "</div>" +
      '<div class="wp-bar-bg"><div class="wp-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="wp-actions">' +
        (complete ? "" :
          '<button class="btn-roll" onclick="UI.doWPRoll()">' + UI.escapeHtml(t("btn.rollWp")) + "</button>" +
          '<button class="wp-adj-btn" onclick="UI.adjustWP(1)">+</button>' +
          '<button class="wp-adj-btn" onclick="UI.adjustWP(-1)">-</button>'
        ) +
      "</div>" +
      (complete ? '<div class="wp-complete">' + UI.escapeHtml(t("wp.complete")) + "</div>" : "");

    var dayState = UI.getCurrentDayState();
    if (dayState.morning.wpRolls.length) {
      var logHtml = dayState.morning.wpRolls.map(function(entry) {
        return "1D" + entry.sides + " -> " + entry.result + " (" + entry.after + " WP)";
      }).join(" | ");
      container.innerHTML += '<div class="improvement-log">' + UI.escapeHtml(logHtml) + "</div>";
    }
  },

  adjustWP: function(amount) {
    var next = Game.state.workPoints + amount;
    if (next < 0) next = 0;
    if (next > 30) next = 30;
    Game.state.workPoints = next;
    Game.save();
    UI.renderWPTracker();
    UI.renderSummary();
  },

  doWPRoll: function() {
    var dayState = UI.getCurrentDayState();
    var roll = Game.wpRollDie();
    var after = Game.reduceWP(roll.result);
    dayState.morning.wpRolls.push({ sides: roll.sides, result: roll.result, after: after });
    Game.save();
    UI.renderWPTracker();
    UI.renderSummary();
  },

  renderMorning: function() {
    var group = document.getElementById("rolls-morning");
    if (!group) return;
    group.innerHTML = "";

    UI.rollConfig.system = {
      statePath: "morningSystem",
      rollFn: function() {
        UI.updateResult("system", Game.rollDie(20), "morningSystem");
      }
    };
    group.appendChild(UI.makeRollRow("system", "morningSystem", UI.rollConfig.system.rollFn));

    UI.rollConfig.weatherDaily = {
      statePath: null,
      rollFn: function() {
        var roll = Game.rollDie(12);
        var dayState = UI.getCurrentDayState();
        dayState.morning.weatherRoll = roll;
        UI.setStateValue("landscape.weather", roll);
        var resultDiv = document.getElementById("result-weatherDaily");
        if (resultDiv) resultDiv.innerHTML = UI.makeResultMarkup(Game.getResult("weather", roll), "UI.reroll('weatherDaily')");
        UI.renderSummary();
      }
    };
    group.appendChild(UI.makeCustomRollRow("weatherDaily", UI.tableLabel("weather") + " (daily)", UI.getCurrentDayState().morning.weatherRoll, function() {
      UI.rollConfig.weatherDaily.rollFn();
    }, function(value) {
      return UI.makeResultMarkup(Game.getResult("weather", value), "UI.reroll('weatherDaily')");
    }));

    UI.renderImprovement();
  },

  renderImprovement: function() {
    var sec = document.getElementById("improvement-section");
    if (!sec) return;
    var bonus = Game.state.improvementBonus;
    var attempts = Game.state.improvementAttemptsToday;
    var remaining = Math.max(0, 2 - attempts);

    sec.innerHTML =
      '<div class="improvement-header">' + UI.escapeHtml(t("improvement.label")) + "</div>" +
      '<div class="improvement-bonus">+' + bonus + "</div>" +
      (remaining > 0 ?
        '<button class="btn-roll" onclick="UI.doImprovement()">' + UI.escapeHtml(t("improvement.try")) + " (" + remaining + ")</button>" :
        '<div class="improvement-log">' + UI.escapeHtml(t("improvement.label")) + ": max</div>"
      );

    var log = UI.getCurrentDayState().morning.improvementLog;
    if (log) sec.innerHTML += '<div class="improvement-log">' + UI.escapeHtml(log) + "</div>";
  },

  doImprovement: function() {
    var result = Game.tryImprovement();
    if (!result) return;
    var status = result.success ? "SUCCESS" : "MISS";
    UI.getCurrentDayState().morning.improvementLog =
      status + ": 1D6=" + result.roll + " / " + result.threshold + "+ -> +" + result.newBonus;
    Game.save();
    UI.renderImprovement();
    UI.renderSummary();
  },

  renderAfternoon: function() {
    var group = document.getElementById("rolls-afternoon");
    if (!group) return;
    group.innerHTML = "";

    var row = document.createElement("div");
    row.className = "roll-block";
    row.innerHTML =
      '<div class="roll-row">' +
        '<span class="roll-label">' + UI.escapeHtml(UI.tableLabel("activities")) + "</span>" +
        '<div class="split-actions">' +
          '<button class="btn-roll" onclick="UI.rollActivity(1)">' + UI.escapeHtml(t("btn.rollActivity1")) + "</button>" +
          '<button class="btn-roll" onclick="UI.rollActivity(2)">' + UI.escapeHtml(t("btn.rollActivity2")) + "</button>" +
        "</div>" +
      "</div>" +
      '<div class="choice-label">' + UI.escapeHtml(t("afternoon.choose")) + "</div>" +
      '<div id="activities-results"></div>';
    group.appendChild(row);
    UI.renderActivityResults();

    var afternoon = UI.getCurrentDayState().afternoon;
    UI.rollConfig.enjoyment = {
      statePath: null,
      rollFn: function() {
        var roll = Game.rollDie(12);
        afternoon.enjoyment = roll;
        Game.save();
        var resultDiv = document.getElementById("result-enjoyment");
        if (resultDiv) resultDiv.innerHTML = UI.makeResultMarkup(Game.getResult("enjoyment", roll), "UI.reroll('enjoyment')");
        UI.renderSummary();
      }
    };
    group.appendChild(UI.makeCustomRollRow("enjoyment", UI.tableLabel("enjoyment"), afternoon.enjoyment, function() {
      UI.rollConfig.enjoyment.rollFn();
    }, function(value) {
      return UI.makeResultMarkup(Game.getResult("enjoyment", value), "UI.reroll('enjoyment')");
    }));
  },

  rollActivity: function(slot) {
    var afternoon = UI.getCurrentDayState().afternoon;
    if (slot === 1) afternoon.activity1 = Game.rollDie(100);
    if (slot === 2) afternoon.activity2 = Game.rollDie(100);
    Game.save();
    UI.renderActivityResults();
    UI.renderSummary();
  },

  chooseActivity: function(slot) {
    UI.getCurrentDayState().afternoon.chosen = slot;
    Game.save();
    UI.renderActivityResults();
    UI.renderSummary();
  },

  renderActivityResults: function() {
    var afternoon = UI.getCurrentDayState().afternoon;
    var container = document.getElementById("activities-results");
    if (!container) return;

    var html = '<div class="activities-choice">';
    if (afternoon.activity1 != null) {
      html += '<button class="activity-option' + (afternoon.chosen === 1 ? " chosen" : "") + '" onclick="UI.chooseActivity(1)">' +
        UI.escapeHtml(Game.getResult("activities", afternoon.activity1)) + "</button>";
    }
    if (afternoon.activity2 != null) {
      html += '<button class="activity-option' + (afternoon.chosen === 2 ? " chosen" : "") + '" onclick="UI.chooseActivity(2)">' +
        UI.escapeHtml(Game.getResult("activities", afternoon.activity2)) + "</button>";
    }
    html += "</div>";
    container.innerHTML = html;
  },

  renderNight: function() {
    var group = document.getElementById("rolls-night");
    if (!group) return;
    group.innerHTML = "";

    var night = UI.getCurrentDayState().night;
    UI.rollConfig.tone = {
      statePath: null,
      rollFn: function() {
        night.tone = Game.rollDie(6);
        Game.save();
        var resultDiv = document.getElementById("result-tone");
        if (resultDiv) resultDiv.innerHTML = UI.makeResultMarkup(Game.getResult("tone", night.tone), "UI.reroll('tone')");
        UI.renderSummary();
      }
    };
    UI.rollConfig.topic = {
      statePath: null,
      rollFn: function() {
        night.topic = Game.rollDie(100);
        Game.save();
        var resultDiv = document.getElementById("result-topic");
        if (resultDiv) resultDiv.innerHTML = UI.makeResultMarkup(Game.getResult("topic", night.topic), "UI.reroll('topic')");
        UI.renderSummary();
      }
    };

    group.appendChild(UI.makeCustomRollRow("tone", UI.tableLabel("tone"), night.tone, function() {
      UI.rollConfig.tone.rollFn();
    }, function(value) {
      return UI.makeResultMarkup(Game.getResult("tone", value), "UI.reroll('tone')");
    }));
    group.appendChild(UI.makeCustomRollRow("topic", UI.tableLabel("topic"), night.topic, function() {
      UI.rollConfig.topic.rollFn();
    }, function(value) {
      return UI.makeResultMarkup(Game.getResult("topic", value), "UI.reroll('topic')");
    }));
  },

  renderEnding: function() {
    var group = document.getElementById("rolls-ending");
    if (!group) return;
    group.innerHTML = "";

    var deliveryRow = document.createElement("div");
    deliveryRow.className = "roll-row";
    deliveryRow.innerHTML =
      '<span class="roll-label">' + UI.escapeHtml(UI.tableLabel("delivery") + " (2D6+" + Game.state.improvementBonus + ")") + "</span>" +
      '<div class="roll-result" id="result-delivery"></div>';
    group.appendChild(deliveryRow);
    UI.updateEndingResult("delivery");

    group.appendChild(UI.makeRollRow("whatTheyLove", "ending.whatTheyLove", function() {
      UI.updateResult("whatTheyLove", Game.rollDie(6), "ending.whatTheyLove");
    }));

    var proposalBlock = document.createElement("div");
    proposalBlock.className = "roll-stack";
    proposalBlock.innerHTML =
      '<div class="roll-row roll-row-stack">' +
        '<span class="roll-label">' + UI.escapeHtml(UI.tableLabel("proposal")) + "</span>" +
        '<select class="relationship-select" id="relationship-select" onchange="UI.changeRelationship(this.value)">' +
          '<option value="0">' + UI.escapeHtml(t("ending.relationship.cordial")) + "</option>" +
          '<option value="1">' + UI.escapeHtml(t("ending.relationship.kind")) + "</option>" +
          '<option value="2">' + UI.escapeHtml(t("ending.relationship.excellent")) + "</option>" +
          '<option value="3">' + UI.escapeHtml(t("ending.relationship.special")) + "</option>" +
        "</select>" +
        '<div class="roll-result" id="result-proposal"></div>' +
      "</div>";
    group.appendChild(proposalBlock);

    var eventBlock = document.createElement("div");
    eventBlock.className = "roll-stack";
    eventBlock.innerHTML =
      '<div class="roll-row roll-row-stack">' +
        '<span class="roll-label">' + UI.escapeHtml(UI.tableLabel("importantEvent")) + "</span>" +
        '<label class="age-row"><span>' + UI.escapeHtml(t("ending.age.label")) + '</span><input id="age-input" class="age-input" type="number" min="16" max="100" value="' + Game.state.characterAge + '" onchange="UI.setCharacterAge(this.value)"></label>' +
        '<div class="roll-result" id="result-importantEvent"></div>' +
      "</div>";
    group.appendChild(eventBlock);

    var select = document.getElementById("relationship-select");
    if (select) select.value = String(Game.state.ending.proposalRelationship || 0);
    UI.updateEndingResult("proposal");
    UI.updateEndingResult("importantEvent");
  },

  updateEndingResult: function(kind) {
    if (kind === "delivery") {
      var deliveryDiv = document.getElementById("result-delivery");
      if (!deliveryDiv) return;
      if (Game.state.ending.deliveryRoll != null) {
        var raw = Game.state.ending.deliveryRaw || Game.state.ending.deliveryRoll;
        deliveryDiv.innerHTML = UI.makeResultMarkup(Game.getResult("delivery", Game.state.ending.deliveryRoll), "UI.doDelivery()", String(raw));
      } else {
        deliveryDiv.innerHTML = '<button class="btn-roll" onclick="UI.doDelivery()">' + UI.escapeHtml(t("btn.roll")) + "</button>";
      }
      return;
    }

    if (kind === "proposal") {
      var proposalDiv = document.getElementById("result-proposal");
      if (!proposalDiv) return;
      if (Game.state.ending.proposalRoll != null) {
        var rawProposal = Game.state.ending.proposalRaw || Game.state.ending.proposalRoll;
        proposalDiv.innerHTML = UI.makeResultMarkup(Game.getResult("proposal", Game.state.ending.proposalRoll), "UI.doProposal()", String(rawProposal));
      } else {
        proposalDiv.innerHTML = '<button class="btn-roll" onclick="UI.doProposal()">' + UI.escapeHtml(t("btn.roll")) + "</button>";
      }
      return;
    }

    if (kind === "importantEvent") {
      var eventDiv = document.getElementById("result-importantEvent");
      if (!eventDiv) return;
      if (Game.state.ending.event != null) {
        eventDiv.innerHTML = UI.makeResultMarkup(Game.getResult("importantEvent", Game.state.ending.event), "UI.doEvent()", String(Game.state.ending.event));
      } else {
        eventDiv.innerHTML = '<button class="btn-roll" onclick="UI.doEvent()">' + UI.escapeHtml(t("btn.roll")) + "</button>";
      }
    }
  },

  changeRelationship: function(value) {
    Game.state.ending.proposalRelationship = parseInt(value, 10) || 0;
    Game.save();
  },

  setCharacterAge: function(value) {
    var parsed = parseInt(value, 10) || 16;
    if (parsed < 16) parsed = 16;
    if (parsed > 100) parsed = 100;
    Game.state.characterAge = parsed;
    Game.save();
  },

  doDelivery: function() {
    var raw = Game.roll2D6() + Game.state.improvementBonus;
    var capped = Math.min(raw, 12);
    Game.state.ending.deliveryRoll = capped;
    Game.state.ending.deliveryRaw = raw;
    Game.save();
    UI.updateEndingResult("delivery");
    UI.renderSummary();
  },

  doProposal: function() {
    var relation = Game.state.ending.proposalRelationship || 0;
    var raw = Game.roll2D6() + relation;
    var normalized = raw <= 7 ? 7 : raw <= 10 ? raw : 11;
    Game.state.ending.proposalRoll = normalized;
    Game.state.ending.proposalRaw = raw;
    Game.save();
    UI.updateEndingResult("proposal");
    UI.renderSummary();
  },

  doEvent: function() {
    var age = Game.state.characterAge || 16;
    var roll = age < 17 ? 17 : age > 80 ? 80 : age;
    Game.state.ending.event = roll;
    Game.save();
    UI.updateEndingResult("importantEvent");
    UI.renderSummary();
  },

  renderSummary: function() {
    var container = document.getElementById("summary-content");
    if (!container) return;
    var state = Game.state;
    var sections = [];

    if (!UI.isAnySummaryData()) {
      container.innerHTML = '<div class="summary-empty">' + UI.escapeHtml(t("summary.empty")) + "</div>";
      return;
    }

    sections.push(UI.summarySection(
      t("summary.patron"),
      [
        UI.summaryPair("Appearance", UI.result("appearance", state.patron.appearance)),
        UI.summaryPair("Personality", UI.result("personality", state.patron.personality)),
        UI.summaryPair("Name", UI.result("nameInitials", state.patron.nameInitials)),
        UI.summaryPair("Ancestry", UI.result("ancestry", state.patron.ancestry)),
        UI.summaryPair("Talent", UI.result("talent", state.patron.talent)),
        UI.summaryPair("Themes", UI.joinNonEmpty([
          UI.result("ttrpgThemes", state.patron.theme1),
          UI.result("ttrpgThemes", state.patron.theme2)
        ], " / "))
      ]
    ));

    sections.push(UI.summarySection(
      t("summary.landscape"),
      [
        UI.result("season", state.landscape.season),
        UI.result("region", state.landscape.region),
        UI.result("terrain", state.landscape.terrain),
        UI.result("weather", state.landscape.weather),
        UI.result("patronHouse", state.landscape.house),
        UI.result("regionKnownFor", state.landscape.knownFor)
      ]
    ));

    sections.push(UI.summarySection(
      t("summary.system"),
      [
        UI.result("system", state.morningSystem),
        UI.summaryPair(t("summary.bonus"), "+" + state.improvementBonus)
      ]
    ));

    if (state.days && state.days.length) {
      for (var i = 0; i < state.days.length; i++) {
        var day = state.days[i];
        if (!day) continue;
        sections.push(UI.renderDaySummary(i + 1, day));
      }
    }

    if (state.ending) {
      sections.push(UI.summarySection(
        t("summary.ending"),
        [
          UI.result("delivery", state.ending.deliveryRoll),
          UI.result("whatTheyLove", state.ending.whatTheyLove),
          UI.result("proposal", state.ending.proposalRoll),
          UI.result("importantEvent", state.ending.event)
        ]
      ));
    }

    container.innerHTML = sections.join("");
  },

  renderDaySummary: function(dayNumber, day) {
    var morningParts = [];
    if (day.morning && day.morning.wpRolls && day.morning.wpRolls.length) {
      morningParts.push(day.morning.wpRolls.map(function(entry) {
        return "1D" + entry.sides + " -> " + entry.result + " (" + entry.after + " WP)";
      }).join(" | "));
    }
    if (day.morning && day.morning.weatherRoll) {
      morningParts.push("Weather: " + UI.result("weather", day.morning.weatherRoll));
    }
    if (day.morning && day.morning.improvementLog) {
      morningParts.push(day.morning.improvementLog);
    }

    var afternoonParts = [];
    if (day.afternoon) {
      if (day.afternoon.activity1) afternoonParts.push(UI.result("activities", day.afternoon.activity1));
      if (day.afternoon.activity2) afternoonParts.push(UI.result("activities", day.afternoon.activity2));
      if (day.afternoon.chosen) {
        var chosenRoll = day.afternoon.chosen === 1 ? day.afternoon.activity1 : day.afternoon.activity2;
        afternoonParts.push("Chosen: " + UI.result("activities", chosenRoll));
      }
      if (day.afternoon.enjoyment) afternoonParts.push(UI.result("enjoyment", day.afternoon.enjoyment));
    }

    var nightParts = [];
    if (day.night) {
      if (day.night.tone) nightParts.push(UI.result("tone", day.night.tone));
      if (day.night.topic) nightParts.push(UI.result("topic", day.night.topic));
    }

    return UI.summarySection(
      t("summary.day") + " " + dayNumber,
      [
        UI.summaryPair(t("summary.morning"), UI.joinNonEmpty(morningParts, " | ")),
        UI.summaryPair(t("summary.afternoon"), UI.joinNonEmpty(afternoonParts, " | ")),
        UI.summaryPair(t("summary.night"), UI.joinNonEmpty(nightParts, " | "))
      ]
    );
  },

  isAnySummaryData: function() {
    var state = Game.state;
    return UI.isArrivalComplete() ||
      state.morningSystem ||
      state.improvementBonus ||
      state.workPoints !== 30 ||
      (state.days && state.days.some(function(day) {
        if (!day) return false;
        return (day.morning && ((day.morning.wpRolls && day.morning.wpRolls.length) || day.morning.weatherRoll || day.morning.improvementLog)) ||
          (day.afternoon && (day.afternoon.activity1 || day.afternoon.activity2 || day.afternoon.enjoyment)) ||
          (day.night && (day.night.tone || day.night.topic));
      })) ||
      (state.ending && (state.ending.deliveryRoll || state.ending.whatTheyLove || state.ending.proposalRoll || state.ending.event));
  },

  copySummary: function() {
    var text = UI.summaryText();
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return;
    }
    var area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  },

  summaryText: function() {
    if (!UI.isAnySummaryData()) return "";
    var chunks = [];
    var state = Game.state;

    chunks.push(t("summary.patron"));
    chunks.push(UI.joinNonEmpty([
      UI.result("appearance", state.patron.appearance),
      UI.result("personality", state.patron.personality),
      UI.result("nameInitials", state.patron.nameInitials),
      UI.result("ancestry", state.patron.ancestry),
      UI.result("talent", state.patron.talent),
      UI.joinNonEmpty([
        UI.result("ttrpgThemes", state.patron.theme1),
        UI.result("ttrpgThemes", state.patron.theme2)
      ], " / ")
    ], " | "));

    chunks.push("");
    chunks.push(t("summary.landscape"));
    chunks.push(UI.joinNonEmpty([
      UI.result("season", state.landscape.season),
      UI.result("region", state.landscape.region),
      UI.result("terrain", state.landscape.terrain),
      UI.result("weather", state.landscape.weather),
      UI.result("patronHouse", state.landscape.house),
      UI.result("regionKnownFor", state.landscape.knownFor)
    ], " | "));

    chunks.push("");
    chunks.push(t("summary.system"));
    chunks.push(UI.joinNonEmpty([
      UI.result("system", state.morningSystem),
      t("summary.bonus") + ": +" + state.improvementBonus
    ], " | "));

    if (state.days) {
      state.days.forEach(function(day, idx) {
        if (!day) return;
        chunks.push("");
        chunks.push(t("summary.day") + " " + (idx + 1));
        chunks.push(t("summary.morning") + ": " + UI.joinNonEmpty([
          day.morning && day.morning.wpRolls && day.morning.wpRolls.length ? day.morning.wpRolls.map(function(entry) {
            return "1D" + entry.sides + " -> " + entry.result + " (" + entry.after + " WP)";
          }).join(" | ") : "",
          day.morning && day.morning.weatherRoll ? "Weather: " + UI.result("weather", day.morning.weatherRoll) : "",
          day.morning && day.morning.improvementLog ? day.morning.improvementLog : ""
        ], " | "));
        chunks.push(t("summary.afternoon") + ": " + UI.joinNonEmpty([
          day.afternoon && day.afternoon.activity1 ? UI.result("activities", day.afternoon.activity1) : "",
          day.afternoon && day.afternoon.activity2 ? UI.result("activities", day.afternoon.activity2) : "",
          day.afternoon && day.afternoon.chosen ? "Chosen: " + UI.result("activities", day.afternoon.chosen === 1 ? day.afternoon.activity1 : day.afternoon.activity2) : "",
          day.afternoon && day.afternoon.enjoyment ? UI.result("enjoyment", day.afternoon.enjoyment) : ""
        ], " | "));
        chunks.push(t("summary.night") + ": " + UI.joinNonEmpty([
          day.night && day.night.tone ? UI.result("tone", day.night.tone) : "",
          day.night && day.night.topic ? UI.result("topic", day.night.topic) : ""
        ], " | "));
      });
    }

    if (state.ending) {
      chunks.push("");
      chunks.push(t("summary.ending"));
      chunks.push(UI.joinNonEmpty([
        UI.result("delivery", state.ending.deliveryRoll),
        UI.result("whatTheyLove", state.ending.whatTheyLove),
        UI.result("proposal", state.ending.proposalRoll),
        UI.result("importantEvent", state.ending.event)
      ], " | "));
    }

    return chunks.join("\n");
  },

  summarySection: function(title, values) {
    var lines = values.filter(function(value) { return !!value; }).map(function(value) {
      return '<div class="summary-value">' + UI.escapeHtml(value) + "</div>";
    }).join("");
    if (!lines) return "";
    return '<section class="summary-section"><div class="summary-section-title">' + UI.escapeHtml(title) + "</div>" + lines + "</section>";
  },

  summaryPair: function(label, value) {
    if (!value) return "";
    return label + ": " + value;
  },

  joinNonEmpty: function(values, separator) {
    return values.filter(function(value) { return !!value; }).join(separator || " | ");
  },

  result: function(tableKey, rollValue) {
    if (rollValue == null) return "";
    return Game.getResult(tableKey, rollValue);
  },

  makeCustomRollRow: function(id, label, existingValue, rollFn, renderValue) {
    var row = document.createElement("div");
    row.className = "roll-row";
    row.id = "row-" + id;

    var labelEl = document.createElement("span");
    labelEl.className = "roll-label";
    labelEl.textContent = label;
    row.appendChild(labelEl);

    var resultDiv = document.createElement("div");
    resultDiv.className = "roll-result";
    resultDiv.id = "result-" + id;
    if (existingValue != null) {
      resultDiv.innerHTML = renderValue(existingValue);
    } else {
      var rollBtn = document.createElement("button");
      rollBtn.className = "btn-roll";
      rollBtn.textContent = t("btn.roll");
      rollBtn.onclick = rollFn;
      resultDiv.appendChild(rollBtn);
    }
    row.appendChild(resultDiv);
    return row;
  },

  escapeHtml: function(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  openAdjectiveOverlay: function() {
    var overlay = document.getElementById("adj-overlay");
    if (overlay) overlay.classList.remove("hidden");
    UI.rollAdjective();
  },

  closeAdjectiveOverlay: function() {
    var overlay = document.getElementById("adj-overlay");
    if (overlay) overlay.classList.add("hidden");
  },

  rollAdjective: function() {
    var result = Game.rollAdjective();
    var resultEl = document.getElementById("adj-result");
    var numberEl = document.getElementById("adj-number");
    if (resultEl) resultEl.textContent = result.text;
    if (numberEl) numberEl.textContent = "#" + result.number;
  },

  init: function() {
    UI.ensureDayState();
    UI.setLanguage(Game.state.language || "pl");
    UI.updateDayLabel();
    UI.updateArrivalBadge();
    UI.showTab("arrival");
    UI.showSubtab("morning");
  }
};

document.addEventListener("DOMContentLoaded", function() {
  UI.init();
});
