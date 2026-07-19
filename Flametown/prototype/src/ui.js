import { DEFAULT_GRID_SIZE, GRID_SIZE_MAX, GRID_SIZE_MIN } from '../config.js';
import { SCORING_GROUP_IDS, SHOP_GROUP_DEFINITIONS, getElementOverlayIcons } from './elementCatalog.js';
import { pieceCells } from './pieces.js';

export function createUIPanel(panelEl, initialState, callbacks) {
  const panel = { state: initialState };

  panelEl.innerHTML = `
    <div id="piece-preview" style="display:grid;grid-template-columns:repeat(4,20px);grid-template-rows:repeat(4,20px);gap:2px;margin-bottom:8px;cursor:pointer;"></div>
    <div style="font-size:12px;margin-bottom:8px;line-height:1.4;">
      Scroll: zoom &middot; Środkowy przycisk / WASD: przesuń widok<br/>
      Kliknij klocek: podnieś &middot; TAB / PPM: obróć &middot; Klik na polu: postaw
    </div>
    <button id="tutorial-btn" type="button" style="margin-bottom:6px;">Tutorial</button>
    <button id="new-game-btn">New Game</button>
    <div style="margin-top:6px;font-size:12px;">
      Rozmiar siatki:
      <input id="grid-size-input" type="number" min="${GRID_SIZE_MIN}" max="${GRID_SIZE_MAX}" value="${DEFAULT_GRID_SIZE}" style="width:70px;" />
    </div>
  `;

  const debugPanelEl = document.createElement('div');
  debugPanelEl.id = 'debug-panel';
  debugPanelEl.innerHTML = `
    <button id="debug-toggle-btn" type="button">Hide Debug</button>
    <pre id="debug-content" style="margin:8px 0 0;white-space:pre-wrap;"></pre>
  `;
  document.body.appendChild(debugPanelEl);

  const previewEl = panelEl.querySelector('#piece-preview');
  const tutorialBtn = panelEl.querySelector('#tutorial-btn');
  const newGameBtn = panelEl.querySelector('#new-game-btn');
  const gridSizeInput = panelEl.querySelector('#grid-size-input');
  const debugToggleBtn = debugPanelEl.querySelector('#debug-toggle-btn');
  const debugContentEl = debugPanelEl.querySelector('#debug-content');
  let debugCollapsed = false;

  function sortedElementCounts(elementCounts) {
    return Object.entries(elementCounts || {}).sort(([left], [right]) => left.localeCompare(right));
  }

  function countOccupiedCells(grid) {
    let occupied = 0;
    for (const row of grid || []) {
      for (const cell of row) {
        if (cell.elementType) {
          occupied += 1;
        }
      }
    }
    return occupied;
  }

  function countHoveredClusterCells(cells) {
    if (!cells) {
      return 0;
    }
    if (cells instanceof Set) {
      return cells.size;
    }
    if (Array.isArray(cells)) {
      return cells.length;
    }
    return 0;
  }

  panel.renderPreview = () => {
    previewEl.innerHTML = '';
    for (let i = 0; i < 16; i += 1) {
      const cellEl = document.createElement('div');
      cellEl.style.background = 'rgba(255,255,255,0.08)';
      cellEl.style.minHeight = '20px';
      cellEl.style.position = 'relative';
      cellEl.style.borderRadius = '4px';
      cellEl.style.overflow = 'hidden';
      previewEl.appendChild(cellEl);
    }

    const { currentPiece } = panel.state;
    if (!currentPiece) {
      return;
    }

    const cells = pieceCells(currentPiece.shapeId, currentPiece.rotation);
    for (const [cellIndex, [row, col]] of cells.entries()) {
      const index = row * 4 + col;
      if (index < 0 || index >= previewEl.children.length) {
        continue;
      }
      const cellEl = previewEl.children[index];
      cellEl.style.display = 'flex';
      cellEl.style.alignItems = 'center';
      cellEl.style.justifyContent = 'center';
      cellEl.style.background = '#5a5a66';
      cellEl.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.12)';

      const plannedCell = currentPiece.plannedCells?.[cellIndex];
      const elementType = plannedCell?.elementType;
      if (!elementType) {
        continue;
      }

      const icons = getElementOverlayIcons(elementType);
      if (icons.length === 0) {
        continue;
      }

      const iconStripEl = document.createElement('div');
      iconStripEl.style.position = 'absolute';
      iconStripEl.style.inset = '0';
      iconStripEl.style.display = 'flex';
      iconStripEl.style.alignItems = 'center';
      iconStripEl.style.justifyContent = 'center';
      iconStripEl.style.pointerEvents = 'none';

      for (const icon of icons) {
        const iconEl = document.createElement('img');
        iconEl.src = icon.iconAssetPath;
        iconEl.alt = icon.id;
        iconEl.style.display = 'block';
        iconEl.style.width = '100%';
        iconEl.style.height = '100%';
        iconEl.style.objectFit = 'contain';
        iconEl.style.filter = 'drop-shadow(0 1px 1px rgba(0,0,0,0.45))';
        iconStripEl.appendChild(iconEl);
      }

      cellEl.appendChild(iconStripEl);
    }
  };

  panel.renderDebug = () => {
    const { camera, residents, elementCounts, gridSize, grid, hoveredCell } = panel.state;
    const occupiedCells = countOccupiedCells(grid);
    const totalCells = gridSize * gridSize;
    const hoveredClusterSize =
      panel.state.hoveredClusterSize ?? countHoveredClusterCells(panel.state.hoveredClusterCells);
    const lines = [
      `Zoom: ${Number(camera?.zoom || 0).toFixed(3)}`,
      `Residents: ${(residents || []).length}`,
      `Occupied: ${occupiedCells} / ${totalCells}`,
      hoveredCell ? `Hovered: (${hoveredCell.row}, ${hoveredCell.col})` : 'Hovered: none',
      `Hovered cluster size: ${hoveredClusterSize}`,
      'Buildings:',
    ];

    for (const [elementType, count] of sortedElementCounts(elementCounts)) {
      lines.push(`  ${elementType}: ${count}`);
    }

    debugContentEl.textContent = lines.join('\n');
    debugContentEl.style.display = debugCollapsed ? 'none' : 'block';
    debugToggleBtn.textContent = debugCollapsed ? 'Show Debug' : 'Hide Debug';
  };

  previewEl.addEventListener('click', () => callbacks.onTakePiece());
  tutorialBtn.addEventListener('click', () => callbacks.onToggleTutorial());
  newGameBtn.addEventListener('click', () => {
    const requestedSize = Number(gridSizeInput.value);
    if (window.confirm('Na pewno zaczynasz nową grę? Obecne miasto zostanie utracone.')) {
      callbacks.onNewGame(requestedSize);
    }
  });
  debugToggleBtn.addEventListener('click', () => {
    debugCollapsed = !debugCollapsed;
    panel.renderDebug();
  });

  panel.setGridSize = (value) => {
    gridSizeInput.value = String(value);
  };

  return panel;
}

export function createTutorialOverlay(initialViewModel, callbacks) {
  const overlayEl = document.createElement('div');
  overlayEl.id = 'tutorial-overlay';
  overlayEl.innerHTML = `
    <div class="tutorial-backdrop"></div>
    <section class="tutorial-card" aria-live="polite">
      <div class="tutorial-step-label"></div>
      <h2 class="tutorial-title"></h2>
      <p class="tutorial-body"></p>
      <p class="tutorial-instruction"></p>
      <div class="tutorial-status"></div>
      <div class="tutorial-actions">
        <button id="tutorial-prev-btn" type="button">Wstecz</button>
        <button id="tutorial-restart-btn" type="button">Powtórz krok</button>
        <button id="tutorial-rules-btn" type="button">Wersja tekstowa</button>
        <button id="tutorial-next-btn" type="button">Dalej</button>
        <button id="tutorial-close-btn" type="button">Zamknij</button>
      </div>
    </section>
    <section class="tutorial-rules-modal" aria-hidden="true">
      <div class="tutorial-rules-header">
        <h3>Pełne zasady gry</h3>
        <button id="tutorial-rules-close-btn" type="button">Zamknij</button>
      </div>
      <div class="tutorial-rules-body"></div>
    </section>
  `;
  document.body.appendChild(overlayEl);

  const stepLabelEl = overlayEl.querySelector('.tutorial-step-label');
  const titleEl = overlayEl.querySelector('.tutorial-title');
  const bodyEl = overlayEl.querySelector('.tutorial-body');
  const instructionEl = overlayEl.querySelector('.tutorial-instruction');
  const statusEl = overlayEl.querySelector('.tutorial-status');
  const prevBtn = overlayEl.querySelector('#tutorial-prev-btn');
  const restartBtn = overlayEl.querySelector('#tutorial-restart-btn');
  const rulesBtn = overlayEl.querySelector('#tutorial-rules-btn');
  const nextBtn = overlayEl.querySelector('#tutorial-next-btn');
  const closeBtn = overlayEl.querySelector('#tutorial-close-btn');
  const rulesModalEl = overlayEl.querySelector('.tutorial-rules-modal');
  const rulesBodyEl = overlayEl.querySelector('.tutorial-rules-body');
  const rulesCloseBtn = overlayEl.querySelector('#tutorial-rules-close-btn');
  let rulesOpen = false;

  function renderRulesContent() {
    const sections = callbacks.getRulesSections?.() || [];
    rulesBodyEl.innerHTML = '';
    for (const section of sections) {
      const sectionEl = document.createElement('section');
      sectionEl.className = 'tutorial-rules-section';

      const title = document.createElement('h4');
      title.textContent = section.title;
      sectionEl.appendChild(title);

      const list = document.createElement('ul');
      for (const item of section.items || []) {
        const listItem = document.createElement('li');
        listItem.textContent = item;
        list.appendChild(listItem);
      }
      sectionEl.appendChild(list);
      rulesBodyEl.appendChild(sectionEl);
    }
  }

  function setRulesOpen(nextValue) {
    rulesOpen = nextValue;
    rulesModalEl.dataset.open = rulesOpen ? 'true' : 'false';
    rulesModalEl.setAttribute('aria-hidden', rulesOpen ? 'false' : 'true');
  }

  prevBtn.addEventListener('click', () => callbacks.onPrevious());
  restartBtn.addEventListener('click', () => callbacks.onRestart());
  rulesBtn.addEventListener('click', () => {
    renderRulesContent();
    setRulesOpen(true);
  });
  nextBtn.addEventListener('click', () => callbacks.onNext());
  closeBtn.addEventListener('click', () => callbacks.onClose());
  rulesCloseBtn.addEventListener('click', () => setRulesOpen(false));

  window.addEventListener('keydown', (event) => {
    if (!event.code || event.code !== 'Space') {
      return;
    }
    if (overlayEl.style.display !== 'block' || nextBtn.disabled || rulesOpen) {
      return;
    }

    const targetTagName = event.target instanceof HTMLElement ? event.target.tagName : '';
    if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA') {
      return;
    }

    event.preventDefault();
    callbacks.onNext();
  });

  return {
    render(viewModel) {
      const model = viewModel || initialViewModel;
      overlayEl.style.display = model?.active ? 'block' : 'none';
      if (!model?.active) {
        setRulesOpen(false);
        return;
      }

      stepLabelEl.textContent = `Krok ${model.stepNumber} / ${model.totalSteps}`;
      titleEl.textContent = model.title || '';
      bodyEl.textContent = model.body || '';
      instructionEl.textContent = model.instruction || '';
      statusEl.textContent = model.completed
        ? 'Krok zaliczony. Możesz przejść dalej.'
        : 'Ten krok czeka na akcję w grze.';
      statusEl.dataset.complete = model.completed ? 'true' : 'false';
      prevBtn.disabled = !model.canGoBack;
      nextBtn.disabled = !model.canGoNext;
      nextBtn.textContent = model.continueLabel || 'Dalej';
      restartBtn.disabled = false;
      rulesBtn.disabled = false;
    },
  };
}

export function createScorePanel(scorePanelEl, initialState) {
  const panel = {
    state: initialState,
    lastVersion: null,
  };

  scorePanelEl.innerHTML = `
    <div class="score-panel-title">Goods flow</div>
    <div class="score-panel-list"></div>
  `;

  const listEl = scorePanelEl.querySelector('.score-panel-list');

  panel.renderScores = (force = false) => {
    const version = panel.state?.scoreTotalsVersion ?? 0;
    if (!force && panel.lastVersion === version) {
      return;
    }

    const scoreTotals = panel.state?.scoreTotals || {};
    listEl.innerHTML = '';

    for (const groupId of SCORING_GROUP_IDS) {
      const rowEl = document.createElement('div');
      rowEl.className = 'score-row';

      const iconEl = document.createElement('img');
      iconEl.className = 'score-row-icon';
      iconEl.src = SHOP_GROUP_DEFINITIONS[groupId].iconAssetPath;
      iconEl.alt = groupId;

      const valueEl = document.createElement('div');
      valueEl.className = 'score-row-value';
      valueEl.textContent = String(scoreTotals[groupId] || 0);

      rowEl.appendChild(iconEl);
      rowEl.appendChild(valueEl);
      listEl.appendChild(rowEl);
    }

    panel.lastVersion = version;
  };

  panel.renderScores(true);
  return panel;
}
