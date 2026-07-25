import { DEFAULT_GRID_SIZE, GRID_SIZE_MAX, GRID_SIZE_MIN } from '../config.js';
import { canAffordCostEntries, getStarterTileDefinitions } from './deck.js';
import { SCORING_GROUP_IDS, SHOP_GROUP_DEFINITIONS, getElementOverlayIcons } from './elementCatalog.js';
import { pieceCells } from './pieces.js';

export function createUIPanel(panelEl, initialState, callbacks) {
  const panel = { state: initialState };

  panelEl.innerHTML = `
    <div id="starter-picker" style="display:none;margin-bottom:12px;"></div>
    <div style="font-size:12px;margin-bottom:8px;line-height:1.4;">
      Talia klocków: starter wybierasz raz, potem dobierasz z ręki i płacisz towarami za refill.
    </div>
    <div id="piece-preview" style="display:grid;grid-template-columns:repeat(4,20px);grid-template-rows:repeat(4,20px);gap:2px;margin-bottom:8px;cursor:pointer;"></div>
    <div id="deck-status" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:8px;"></div>
    <div id="draw-controls" style="display:grid;gap:6px;margin-bottom:8px;"></div>
    <button id="shop-toggle-btn" type="button" style="margin-bottom:6px;">Sklep</button>
    <div id="market-panel" style="display:none;gap:6px;margin-bottom:8px;"></div>
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
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <button id="debug-toggle-btn" type="button">Hide Debug</button>
      <button id="debug-add-any-btn" type="button">Dodaj +50 każdego towaru</button>
    </div>
    <pre id="debug-content" style="margin:8px 0 0;white-space:pre-wrap;"></pre>
  `;
  document.body.appendChild(debugPanelEl);

  const previewEl = panelEl.querySelector('#piece-preview');
  const tutorialBtn = panelEl.querySelector('#tutorial-btn');
  const newGameBtn = panelEl.querySelector('#new-game-btn');
  const gridSizeInput = panelEl.querySelector('#grid-size-input');
  const debugToggleBtn = debugPanelEl.querySelector('#debug-toggle-btn');
  const debugAddAnyBtn = debugPanelEl.querySelector('#debug-add-any-btn');
  const debugContentEl = debugPanelEl.querySelector('#debug-content');
  const starterPickerEl = panelEl.querySelector('#starter-picker');
  const deckStatusEl = panelEl.querySelector('#deck-status');
  const drawControlsEl = panelEl.querySelector('#draw-controls');
  const marketPanelEl = panelEl.querySelector('#market-panel');
  const shopToggleBtn = panelEl.querySelector('#shop-toggle-btn');
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

  function createGoodsTokenChip(goodsType, amount, options = {}) {
    const chip = document.createElement('div');
    chip.style.display = 'inline-flex';
    chip.style.alignItems = 'center';
    chip.style.justifyContent = 'center';
    chip.style.gap = '4px';
    chip.style.padding = options.compact ? '0' : '4px 6px';
    chip.style.borderRadius = '999px';
    chip.style.background = options.compact ? 'transparent' : 'rgba(255,255,255,0.06)';

    const iconEl = document.createElement('img');
    iconEl.src = SHOP_GROUP_DEFINITIONS[goodsType].iconAssetPath;
    iconEl.alt = goodsType;
    iconEl.style.width = options.iconSize ? `${options.iconSize}px` : '16px';
    iconEl.style.height = options.iconSize ? `${options.iconSize}px` : '16px';
    iconEl.style.objectFit = 'contain';
    chip.appendChild(iconEl);

    if (amount !== undefined && amount !== null) {
      const valueEl = document.createElement('span');
      valueEl.textContent = String(amount);
      valueEl.style.fontSize = options.fontSize || '12px';
      valueEl.style.fontWeight = '700';
      chip.appendChild(valueEl);
    }

    return chip;
  }

  function createGoodsCostStrip(costEntries, options = {}) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexWrap = 'wrap';
    wrap.style.alignItems = 'center';
    wrap.style.gap = options.gap || '6px';
    for (const entry of costEntries || []) {
      wrap.appendChild(
        createGoodsTokenChip(entry.goodsType, entry.amount, {
          compact: options.compact,
          iconSize: options.iconSize,
          fontSize: options.fontSize,
        })
      );
    }
    return wrap;
  }

  function createCostButton(costEntries, options = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = Boolean(options.disabled);
    button.style.padding = options.padding || '6px 8px';
    button.style.minWidth = '0';
    button.style.borderRadius = options.radius || '8px';
    button.style.border = '0';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.cursor = button.disabled ? 'default' : 'pointer';
    button.style.opacity = button.disabled ? '0.45' : '1';
    button.style.background = button.disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)';
    button.appendChild(
      createGoodsCostStrip(costEntries, {
        compact: true,
        iconSize: options.iconSize || 14,
        fontSize: options.fontSize || '11px',
        gap: options.gap || '6px',
      })
    );
    return button;
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

  function renderStarterPicker() {
    const showStarterPicker = panel.state?.runState === 'starter-selection';
    starterPickerEl.style.display = showStarterPicker ? 'grid' : 'none';
    if (!showStarterPicker) {
      starterPickerEl.innerHTML = '';
      return;
    }

    starterPickerEl.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    starterPickerEl.style.gap = '8px';
    starterPickerEl.innerHTML = '';
    for (const tile of getStarterTileDefinitions()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.style.padding = '10px';
      button.style.borderRadius = '10px';
      button.style.border = '1px solid rgba(255,255,255,0.12)';
      button.style.background = 'rgba(255,255,255,0.06)';
      button.style.color = '#fff4e0';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';
      button.innerHTML = `
        <strong style="display:block;margin-bottom:4px;">${tile.name}</strong>
        <span style="display:block;font-size:11px;opacity:0.8;">1 dom · 2 parki · 1 sklep</span>
      `;
      const goodsRow = document.createElement('div');
      goodsRow.style.marginTop = '6px';
      goodsRow.style.display = 'flex';
      goodsRow.style.alignItems = 'center';
      goodsRow.style.gap = '6px';
      goodsRow.style.fontSize = '11px';
      goodsRow.style.opacity = '0.8';
      goodsRow.appendChild(createGoodsTokenChip(tile.goodsType, null, { compact: true, iconSize: 14 }));
      button.appendChild(goodsRow);
      button.addEventListener('click', () => callbacks.onStartRun(tile.id));
      starterPickerEl.appendChild(button);
    }
  }

  function renderTilePreviewGrid(shapeId, plannedCells, options = {}) {
    const rotation = options.rotation || 0;
    const cells = pieceCells(shapeId || 'O', rotation);
    const maxRow = Math.max(...cells.map(([row]) => row), 0);
    const maxCol = Math.max(...cells.map(([, col]) => col), 0);
    const columns = Math.max(options.columns || 0, maxCol + 1);
    const rows = Math.max(options.rows || 0, maxRow + 1);
    const cellSize = options.cellSize || 16;
    const gap = options.gap || 2;
    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = `repeat(${columns}, ${cellSize}px)`;
    wrapper.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    wrapper.style.gap = `${gap}px`;
    wrapper.style.justifyContent = 'center';
    const cellIndexByGridIndex = new Map(
      cells.map(([row, col], cellIndex) => [`${row}:${col}`, cellIndex])
    );

    for (let index = 0; index < columns * rows; index += 1) {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const cellEl = document.createElement('div');
      cellEl.style.width = `${cellSize}px`;
      cellEl.style.height = `${cellSize}px`;
      cellEl.style.background = 'rgba(255,255,255,0.08)';
      cellEl.style.borderRadius = '4px';
      cellEl.style.position = 'relative';
      cellEl.style.overflow = 'hidden';

      const plannedCellIndex = cellIndexByGridIndex.get(`${row}:${col}`);
      const elementType =
        plannedCellIndex === undefined ? null : plannedCells?.[plannedCellIndex];
      if (elementType) {
        cellEl.style.background = '#5a5a66';
        cellEl.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.12)';
        const icons = getElementOverlayIcons(elementType);
        for (const icon of icons) {
          const iconEl = document.createElement('img');
          iconEl.src = icon.iconAssetPath;
          iconEl.alt = icon.id;
          iconEl.style.position = 'absolute';
          iconEl.style.inset = '0';
          iconEl.style.width = '100%';
          iconEl.style.height = '100%';
          iconEl.style.objectFit = 'contain';
          iconEl.style.filter = 'drop-shadow(0 1px 1px rgba(0,0,0,0.45))';
          cellEl.appendChild(iconEl);
        }
      }

      wrapper.appendChild(cellEl);
    }
    return wrapper;
  }

  function renderDeckStatus() {
    const deckState = panel.state?.deckState || { hand: [], drawPile: [], discardPile: [], handSize: 0 };
    const items = [
      { label: 'Ręka', value: `${deckState.hand?.length || 0}/${deckState.handSize || 0}` },
      { label: 'Deck', value: String(deckState.drawPile?.length || 0) },
      { label: 'Odrzucone', value: String(deckState.discardPile?.length || 0) },
    ];

    deckStatusEl.innerHTML = '';
    for (const item of items) {
      const cell = document.createElement('div');
      cell.style.padding = '6px 8px';
      cell.style.borderRadius = '8px';
      cell.style.background = 'rgba(255,255,255,0.06)';
      cell.innerHTML = `
        <div style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.7;">${item.label}</div>
        <div style="font-size:13px;font-weight:700;margin-top:2px;">${item.value}</div>
      `;
      deckStatusEl.appendChild(cell);
    }
  }

  function renderDrawControls() {
    const deckState = panel.state?.deckState || {};
    const scoreTotals = panel.state?.scoreTotals || {};
    const missing = Math.max(0, (deckState.handSize || 0) - (deckState.hand?.length || 0));
    drawControlsEl.innerHTML = '';

    const status = document.createElement('div');
    status.style.fontSize = '12px';
    status.style.opacity = '0.8';
    if (panel.state?.runState === 'starter-selection') {
      status.textContent = 'Wybierz starter, aby rozpocząć talię.';
    } else if (missing <= 0) {
      status.textContent = 'Ręka pełna.';
    } else if ((deckState.drawPile?.length || 0) + (deckState.discardPile?.length || 0) <= 0) {
      status.textContent = 'Brak klocków do dobrania.';
    } else {
      status.textContent = 'Dobierz do pełnej ręki.';
    }
    drawControlsEl.appendChild(status);

    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.flexWrap = 'nowrap';
    buttons.style.gap = '4px';
    for (const groupId of SCORING_GROUP_IDS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled =
        panel.state?.runState !== 'playing' || missing <= 0 || (scoreTotals[groupId] || 0) < (deckState.drawCost || 0);
      button.style.padding = '6px 4px';
      button.style.minWidth = '0';
      button.style.flex = '1 1 0';
      button.style.borderRadius = '8px';
      button.style.border = '0';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      button.style.cursor = button.disabled ? 'default' : 'pointer';
      button.style.opacity = button.disabled ? '0.45' : '1';
      button.appendChild(
        createGoodsCostStrip([{ goodsType: groupId, amount: deckState.drawCost || 0 }], {
          compact: true,
          iconSize: 14,
          fontSize: '11px',
          gap: '4px',
        })
      );
      button.addEventListener('click', () => callbacks.onDraw(groupId));
      buttons.appendChild(button);
    }
    drawControlsEl.appendChild(buttons);
  }

  function renderMarket() {
    const isOpen = Boolean(panel.state?.marketState?.isOpen);
    marketPanelEl.style.display = isOpen ? 'grid' : 'none';
    shopToggleBtn.textContent = isOpen ? 'Ukryj sklep' : 'Sklep';
    marketPanelEl.innerHTML = '';
    if (!isOpen) {
      return;
    }

    const summary = document.createElement('div');
    summary.style.fontSize = '12px';
    summary.style.opacity = '0.8';
    summary.textContent = 'Sklep pokazuje 2 startery i 1 losowy klocek.';
    marketPanelEl.appendChild(summary);

    const refreshWrap = document.createElement('div');
    refreshWrap.style.padding = '8px';
    refreshWrap.style.borderRadius = '10px';
    refreshWrap.style.background = 'rgba(255,255,255,0.06)';
    const refreshLabel = document.createElement('div');
    refreshLabel.style.fontSize = '12px';
    refreshLabel.style.opacity = '0.8';
    refreshLabel.style.marginBottom = '6px';
    refreshLabel.textContent = 'Odśwież sklep:';
    refreshWrap.appendChild(refreshLabel);
    const refreshButtons = document.createElement('div');
    refreshButtons.style.display = 'flex';
    refreshButtons.style.flexWrap = 'nowrap';
    refreshButtons.style.gap = '4px';
    for (const groupId of SCORING_GROUP_IDS) {
      const funds = panel.state?.scoreTotals?.[groupId] || 0;
      const refreshCost = panel.state?.marketState?.refreshCost || 0;
      const button = createCostButton([{ goodsType: groupId, amount: refreshCost }], {
        disabled: panel.state?.runState !== 'playing' || funds < refreshCost,
        padding: '6px 4px',
        iconSize: 14,
        fontSize: '11px',
        gap: '4px',
      });
      button.style.flex = '1 1 0';
      button.addEventListener('click', () => callbacks.onRefreshMarket(groupId));
      refreshButtons.appendChild(button);
    }
    refreshWrap.appendChild(refreshButtons);
    marketPanelEl.appendChild(refreshWrap);

    const offers = panel.state?.marketState?.offers || [];
    offers.forEach((offer, index) => {
      const isAffordable = canAffordCostEntries(panel.state?.scoreTotals, offer.costEntries);
      const row = document.createElement('div');
      row.style.padding = '8px';
      row.style.borderRadius = '10px';
      row.style.background = 'rgba(255,255,255,0.06)';
      const header = document.createElement('div');
      header.style.display = 'grid';
      header.style.gridTemplateColumns = '1fr auto';
      header.style.gap = '8px';
      header.style.alignItems = 'center';
      const copy = document.createElement('div');
      const typeLabel = offer.offerType === 'starter' ? 'Starter' : 'Losowy klocek';
      copy.innerHTML = `
        <strong style="display:block;">${offer.name}</strong>
        <span style="display:block;font-size:11px;opacity:0.76;margin-top:2px;">${typeLabel}</span>
      `;
      header.appendChild(copy);
      header.appendChild(
        renderTilePreviewGrid(offer.shapeId || 'O', offer.plannedCells, {
          columns: 4,
          rows: 2,
          cellSize: 16,
          gap: 2,
        })
      );
      row.appendChild(header);
      const buttonsWrap = document.createElement('div');
      buttonsWrap.style.display = 'flex';
      buttonsWrap.style.flexWrap = 'nowrap';
      buttonsWrap.style.gap = '4px';
      buttonsWrap.style.marginTop = '8px';

      if (offer.offerType === 'starter') {
        for (const groupId of SCORING_GROUP_IDS) {
          const canUse = canAffordCostEntries(panel.state?.scoreTotals, offer.costEntries, {
            preferredAnyGoodsType: groupId,
          });
          const buyButton = createCostButton([{ goodsType: groupId, amount: offer.costEntries?.[0]?.amount || 0 }], {
            disabled: panel.state?.runState !== 'playing' || !canUse,
            padding: '6px 4px',
            iconSize: 14,
            fontSize: '11px',
            gap: '4px',
          });
          buyButton.style.flex = '1 1 0';
          buyButton.addEventListener('click', () => callbacks.onBuyOffer(index, groupId));
          buttonsWrap.appendChild(buyButton);
        }
      } else {
        const buyButton = createCostButton(offer.costEntries, {
          disabled: panel.state?.runState !== 'playing' || !isAffordable,
          padding: '6px 8px',
          iconSize: 14,
          fontSize: '11px',
          gap: '6px',
        });
        buyButton.addEventListener('click', () => callbacks.onBuyOffer(index));
        buttonsWrap.appendChild(buyButton);
      }

      row.appendChild(buttonsWrap);
      marketPanelEl.appendChild(row);
    });
  }

  panel.render = () => {
    panel.renderPreview();
    renderStarterPicker();
    renderDeckStatus();
    renderDrawControls();
    renderMarket();
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
      `Run state: ${panel.state.runState || 'unknown'}`,
      `Deck/Hand/Discard: ${panel.state.deckState?.drawPile?.length || 0} / ${
        panel.state.deckState?.hand?.length || 0
      } / ${panel.state.deckState?.discardPile?.length || 0}`,
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
  shopToggleBtn.addEventListener('click', () => callbacks.onToggleShop());
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
  debugAddAnyBtn.addEventListener('click', () => callbacks.onDebugAddAny?.());

  panel.setGridSize = (value) => {
    gridSizeInput.value = String(value);
  };

  panel.renderPreview = panel.renderPreview.bind(panel);
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
