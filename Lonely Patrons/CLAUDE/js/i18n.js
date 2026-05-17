// js/i18n.js
var I18N = {
  en: {
    // Tabs
    "tab.arrival":     "Arrival",
    "tab.day":         "Day",
    "tab.ending":      "Ending",
    "tab.summary":     "Summary",

    // Arrival sections
    "section.landscape": "Landscape",
    "section.patron":    "Patron",

    // Day sub-tabs
    "subtab.morning":   "Morning",
    "subtab.afternoon": "Afternoon",
    "subtab.night":     "Night",

    // Buttons
    "btn.roll":         "🎲 Roll",
    "btn.reroll":       "↺",
    "btn.newDay":       "New Day →",
    "btn.newSession":   "New Session",
    "btn.copy":         "📋 Copy",
    "btn.adjective":    "🎲",
    "btn.rollWp":       "🎲 Roll (reduce WP)",
    "btn.rollActivity1":"🎲 Roll 1",
    "btn.rollActivity2":"🎲 Roll 2",

    // WP tracker
    "wp.label":        "Work Points",
    "wp.complete":     "Design complete! You can deliver it.",

    // Improvement
    "improvement.label":  "Improvement bonus",
    "improvement.try":    "Try improvement",

    // Afternoon
    "afternoon.choose":   "Choose one:",

    // Ending
    "ending.relationship.cordial":  "Cordial (+0)",
    "ending.relationship.kind":     "Kind (+1)",
    "ending.relationship.excellent":"Excellent (+2)",
    "ending.relationship.special":  "Super special (+3)",
    "ending.age.label":             "Character's age:",

    // Adjective overlay
    "adj.title":   "Adjective",
    "adj.new":     "↺ New",
    "adj.close":   "✕ Close",

    // Summary
    "summary.patron":    "Patron",
    "summary.landscape": "Landscape",
    "summary.system":    "TTRPG System",
    "summary.bonus":     "Improvement bonus",
    "summary.day":       "Day",
    "summary.morning":   "Morning",
    "summary.afternoon": "Afternoon",
    "summary.night":     "Night",
    "summary.ending":    "Ending",
    "summary.empty":     "No data yet. Start rolling!",

    // New session confirm
    "confirm.newSession": "Start a new session? All current data will be lost.",

    // Arrival done badge
    "arrival.done": "✓ Done"
  },
  pl: {
    "tab.arrival":     "Przybycie",
    "tab.day":         "Dzień",
    "tab.ending":      "Zakończenie",
    "tab.summary":     "Podsumowanie",

    "section.landscape": "Krajobraz",
    "section.patron":    "Patron",

    "subtab.morning":   "Rano",
    "subtab.afternoon": "Popołudnie",
    "subtab.night":     "Noc",

    "btn.roll":         "🎲 Rzuć",
    "btn.reroll":       "↺",
    "btn.newDay":       "Nowy dzień →",
    "btn.newSession":   "Nowa sesja",
    "btn.copy":         "📋 Kopiuj",
    "btn.adjective":    "🎲",
    "btn.rollWp":       "🎲 Rzuć (zredukuj WP)",
    "btn.rollActivity1":"🎲 Rzuć 1",
    "btn.rollActivity2":"🎲 Rzuć 2",

    "wp.label":        "Punkty Pracy",
    "wp.complete":     "Projekt ukończony! Możesz go wręczyć.",

    "improvement.label":  "Bonus ulepszenia",
    "improvement.try":    "Próba ulepszenia",

    "afternoon.choose":   "Wybierz jedną:",

    "ending.relationship.cordial":  "Serdeczna (+0)",
    "ending.relationship.kind":     "Życzliwa (+1)",
    "ending.relationship.excellent":"Doskonała (+2)",
    "ending.relationship.special":  "Wyjątkowa (+3)",
    "ending.age.label":             "Wiek postaci:",

    "adj.title":   "Przymiotnik",
    "adj.new":     "↺ Nowy",
    "adj.close":   "✕ Zamknij",

    "summary.patron":    "Patron",
    "summary.landscape": "Krajobraz",
    "summary.system":    "System TTRPG",
    "summary.bonus":     "Bonus ulepszenia",
    "summary.day":       "Dzień",
    "summary.morning":   "Rano",
    "summary.afternoon": "Popołudnie",
    "summary.night":     "Noc",
    "summary.ending":    "Zakończenie",
    "summary.empty":     "Brak danych. Zacznij rzucać!",

    "confirm.newSession": "Zacząć nową sesję? Wszystkie dane zostaną utracone.",

    "arrival.done": "✓ Gotowe"
  }
};

function t(key) {
  var lang = (window.Game && Game.state.language) || "pl";
  return (I18N[lang] && I18N[lang][key]) || I18N["en"][key] || key;
}
