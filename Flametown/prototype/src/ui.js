import { DEFAULT_GRID_SIZE, GRID_SIZE_MAX, GRID_SIZE_MIN } from '../config.js';
import { pieceCells } from './pieces.js';

export function createUIPanel(panelEl, initialState, callbacks) {
  const panel = { state: initialState };

  panelEl.innerHTML = `
    <div id="piece-preview" style="display:grid;grid-template-columns:repeat(4,20px);grid-template-rows:repeat(4,20px);gap:2px;margin-bottom:8px;cursor:pointer;"></div>
    <div style="font-size:12px;margin-bottom:8px;line-height:1.4;">
      Scroll: zoom &middot; Środkowy przycisk / WASD: przesuń widok<br/>
      Kliknij klocek: podnieś &middot; TAB / PPM: obróć &middot; Klik na polu: postaw
    </div>
    <button id="new-game-btn">New Game</button>
    <div style="margin-top:6px;font-size:12px;">
      Rozmiar siatki:
      <input id="grid-size-input" type="number" min="${GRID_SIZE_MIN}" max="${GRID_SIZE_MAX}" value="${DEFAULT_GRID_SIZE}" style="width:70px;" />
    </div>
  `;

  const previewEl = panelEl.querySelector('#piece-preview');
  const newGameBtn = panelEl.querySelector('#new-game-btn');
  const gridSizeInput = panelEl.querySelector('#grid-size-input');

  panel.renderPreview = () => {
    previewEl.innerHTML = '';
    for (let i = 0; i < 16; i += 1) {
      const cellEl = document.createElement('div');
      cellEl.style.background = 'rgba(255,255,255,0.08)';
      cellEl.style.minHeight = '20px';
      previewEl.appendChild(cellEl);
    }

    const { currentPiece } = panel.state;
    if (!currentPiece) {
      return;
    }

    const cells = pieceCells(currentPiece.shapeId, currentPiece.rotation);
    for (const [row, col] of cells) {
      const index = row * 4 + col;
      if (index < 0 || index >= previewEl.children.length) {
        continue;
      }
      const cellEl = previewEl.children[index];
      cellEl.textContent = '🧱';
      cellEl.style.display = 'flex';
      cellEl.style.alignItems = 'center';
      cellEl.style.justifyContent = 'center';
      cellEl.style.background = '#5a5a66';
    }
  };

  previewEl.addEventListener('click', () => callbacks.onTakePiece());
  newGameBtn.addEventListener('click', () => {
    const requestedSize = Number(gridSizeInput.value);
    if (window.confirm('Na pewno zaczynasz nową grę? Obecne miasto zostanie utracone.')) {
      callbacks.onNewGame(requestedSize);
    }
  });

  panel.setGridSize = (value) => {
    gridSizeInput.value = String(value);
  };

  return panel;
}
