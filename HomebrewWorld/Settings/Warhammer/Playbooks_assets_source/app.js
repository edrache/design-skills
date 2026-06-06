const STORAGE_KEY = "warhammer-playbooks-theme";

function getThemeLink() {
  return document.getElementById("theme-stylesheet");
}

function setActiveButtons(theme) {
  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    const selected = button.getAttribute("data-theme-option") === theme;
    button.setAttribute("data-selected", String(selected));
    button.setAttribute("aria-pressed", String(selected));
  });
}

function applyTheme(theme) {
  const link = getThemeLink();
  if (!link) return;
  const href = theme === "print" ? link.dataset.printHref : link.dataset.screenHref;
  if (href) link.setAttribute("href", href);
  document.body.setAttribute("data-theme", theme);
  window.localStorage.setItem(STORAGE_KEY, theme);
  setActiveButtons(theme);
}

document.addEventListener("DOMContentLoaded", () => {
  const stored = window.localStorage.getItem(STORAGE_KEY) || "screen";
  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    button.addEventListener("click", () => applyTheme(button.dataset.themeOption || "screen"));
  });
  document.querySelectorAll("[data-print-page]").forEach((button) => {
    button.addEventListener("click", () => window.print());
  });
  applyTheme(stored === "print" ? "print" : "screen");
});
