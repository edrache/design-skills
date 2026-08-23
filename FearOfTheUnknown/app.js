(() => {
  const data = window.FOTU_DATA;
  if (!data) throw new Error("Brak danych generatora. Uruchom scripts/build-data.mjs.");

  const state = {
    setting: localStorage.getItem("fotu-setting") || "core",
    category: localStorage.getItem("fotu-category") || "town",
    results: {},
    dialogTableId: null,
  };

  const elements = {
    tabs: document.querySelector(".category-tabs"),
    settingInputs: [...document.querySelectorAll('input[name="setting"]')],
    eyebrow: document.querySelector("#category-eyebrow"),
    title: document.querySelector("#category-title"),
    intro: document.querySelector("#category-intro"),
    settingNote: document.querySelector("#setting-note"),
    tableCount: document.querySelector("#table-count"),
    board: document.querySelector("#results-grid"),
    rollAll: document.querySelector("#roll-all-button"),
    copyCategory: document.querySelector("#copy-category-button"),
    dialog: document.querySelector("#table-dialog"),
    dialogLabel: document.querySelector("#dialog-label"),
    dialogTitle: document.querySelector("#dialog-title"),
    dialogDescription: document.querySelector("#dialog-description"),
    fullTable: document.querySelector("#full-table"),
    dialogRoll: document.querySelector("#dialog-roll-button"),
    toast: document.querySelector("#toast"),
  };

  function category() {
    return data.categories.find((item) => item.id === state.category);
  }

  function tables() {
    return data.tables.filter((table) => table.category === state.category);
  }

  function tableById(id) {
    return data.tables.find((table) => table.id === id);
  }

  function entriesFor(table) {
    return state.setting === "pl90" && table.pl90 ? table.pl90 : table.core;
  }

  function randomResult(table) {
    const entries = entriesFor(table);
    return entries[Math.floor(Math.random() * entries.length)];
  }

  function rollOne(table) {
    state.results[table.id] = randomResult(table);
    renderBoard();
    pulseCard(table.id);
  }

  function rollAll() {
    tables().forEach((table) => {
      state.results[table.id] = randomResult(table);
    });
    renderBoard();
    elements.board.classList.remove("just-rolled");
    requestAnimationFrame(() => {
      elements.board.classList.add("just-rolled");
      elements.board.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function pulseCard(id) {
    const card = elements.board.querySelector(`[data-card="${id}"]`);
    if (!card) return;
    card.classList.remove("just-rolled");
    requestAnimationFrame(() => card.classList.add("just-rolled"));
  }

  function formatRoll(table, value) {
    return table.dice === "d66" ? `${value[0]}–${value[1]}` : value;
  }

  function renderTabs() {
    elements.tabs.innerHTML = data.categories
      .map(
        (item, index) => `
          <button
            type="button"
            role="tab"
            aria-selected="${item.id === state.category}"
            tabindex="${item.id === state.category ? "0" : "-1"}"
            data-category="${item.id}"
          >
            <span class="tab-index">${String(index + 1).padStart(2, "0")}</span>
            ${item.label}
          </button>`,
      )
      .join("");
  }

  function renderBoard() {
    const categoryTables = tables();
    elements.tableCount.textContent = categoryTables.length;
    elements.board.dataset.category = state.category;
    elements.board.innerHTML = categoryTables
      .map((table, index) => {
        const result = state.results[table.id];
        return `
          <article class="result-card ${result ? "has-result" : ""}" data-card="${table.id}">
            <div class="card-topline">
              <div>
                <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
                <p class="result-label">${escapeHtml(table.label)}</p>
                ${table.tagType ? `<span class="tag-type">tag ${escapeHtml(table.tagType)}</span>` : ""}
              </div>
              <span class="dice-result">
                ${result ? `${table.dice} · ${formatRoll(table, result.roll)}` : table.dice}
              </span>
            </div>
            <h2>${escapeHtml(table.title)}</h2>
            <p class="card-description">${escapeHtml(table.description)}</p>
            <div class="card-result">
              ${
                result
                  ? `<p>${escapeHtml(result.text)}</p>`
                  : '<p class="card-placeholder">Oczekuje na wspólny rzut.</p>'
              }
            </div>
            <div class="card-actions">
              <button
                type="button"
                class="card-action"
                data-reroll="${table.id}"
                aria-label="Przerzuć: ${escapeHtml(table.title)}"
              >↻ <span>Przerzuć</span></button>
              <button
                type="button"
                class="card-action"
                data-view="${table.id}"
                aria-label="Pełna tabela: ${escapeHtml(table.title)}"
              >Tabela <span aria-hidden="true">↗</span></button>
            </div>
          </article>`;
      })
      .join("");
  }

  function render() {
    const currentCategory = category();
    elements.eyebrow.textContent = currentCategory.eyebrow;
    elements.title.textContent = currentCategory.label;
    elements.intro.textContent = currentCategory.intro;
    elements.settingNote.textContent =
      data.settings.find((setting) => setting.id === state.setting)?.note || "";
    elements.settingInputs.forEach((input) => {
      input.checked = input.value === state.setting;
    });
    renderTabs();
    renderBoard();
  }

  function selectCategory(id) {
    state.category = id;
    localStorage.setItem("fotu-category", id);
    render();
  }

  function showFullTable(id) {
    const table = tableById(id);
    if (!table) return;
    state.dialogTableId = id;
    const entries = entriesFor(table);
    const current = state.results[table.id];
    elements.dialogLabel.textContent = `${category().label} · ${table.dice}`;
    elements.dialogTitle.textContent = table.title;
    elements.dialogDescription.textContent = table.description;
    elements.fullTable.innerHTML =
      table.dice === "d66"
        ? Array.from({ length: 6 }, (_, group) => {
            const groupEntries = entries.slice(group * 6, group * 6 + 6);
            return `
              <section class="roll-group">
                <h3>Pierwsza kość: ${group + 1}</h3>
                <ol>
                  ${groupEntries
                    .map(
                      (entry) => `
                        <li class="${current?.roll === entry.roll ? "is-current" : ""}">
                          <span>${formatRoll(table, entry.roll)}</span>
                          <p>${escapeHtml(entry.text)}</p>
                        </li>`,
                    )
                    .join("")}
                </ol>
              </section>`;
          }).join("")
        : `<ol class="d6-list">${entries
            .map(
              (entry) => `
                <li class="${current?.roll === entry.roll ? "is-current" : ""}">
                  <span>${entry.roll}</span>
                  <p>${escapeHtml(entry.text)}</p>
                </li>`,
            )
            .join("")}</ol>`;
    elements.dialog.showModal();
    requestAnimationFrame(() => {
      elements.fullTable.querySelector(".is-current")?.scrollIntoView({ block: "center" });
    });
  }

  function closeDialog() {
    elements.dialog.close();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
  }

  async function copyCategory() {
    const categoryTables = tables();
    if (categoryTables.some((table) => !state.results[table.id])) {
      showToast("Najpierw wylosuj całą kategorię");
      return;
    }

    const settingLabel = data.settings.find((setting) => setting.id === state.setting)?.label;
    const lines = [`${category().label} — ${settingLabel}`, ""];
    categoryTables.forEach((table, index) => {
      const result = state.results[table.id];
      lines.push(
        `${index + 1}. ${table.label}: ${result.text}`,
        `   ${table.dice}: ${formatRoll(table, result.roll)}`,
      );
    });

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      showToast(`Skopiowano cały zestaw: ${category().label}`);
    } catch {
      showToast("Nie udało się skopiować zestawu");
    }
  }

  function escapeHtml(text) {
    const node = document.createElement("div");
    node.textContent = text;
    return node.innerHTML;
  }

  elements.tabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (button) selectCategory(button.dataset.category);
  });

  elements.tabs.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const index = data.categories.findIndex((item) => item.id === state.category);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = data.categories[(index + direction + data.categories.length) % data.categories.length];
    selectCategory(next.id);
    elements.tabs.querySelector(`[data-category="${next.id}"]`)?.focus();
  });

  elements.board.addEventListener("click", (event) => {
    const rerollButton = event.target.closest("[data-reroll]");
    if (rerollButton) {
      rollOne(tableById(rerollButton.dataset.reroll));
      return;
    }
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) showFullTable(viewButton.dataset.view);
  });

  elements.settingInputs.forEach((input) => {
    input.addEventListener("change", () => {
      state.setting = input.value;
      state.results = {};
      localStorage.setItem("fotu-setting", state.setting);
      render();
    });
  });

  elements.rollAll.addEventListener("click", rollAll);
  elements.copyCategory.addEventListener("click", copyCategory);
  elements.dialogRoll.addEventListener("click", () => {
    const table = tableById(state.dialogTableId);
    if (table) rollOne(table);
    closeDialog();
  });
  document.querySelectorAll(".dialog-close, .dialog-close-secondary").forEach((button) => {
    button.addEventListener("click", closeDialog);
  });
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) closeDialog();
  });

  render();
})();
