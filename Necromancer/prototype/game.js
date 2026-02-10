const CONFIG = {
    GRID_SIZE: 20,
    SUSTAIN_PRODUCTION: {
        FOREST: 10,
        WATER: 15
    },
    CONSUMPTION: {
        VILLAGE: 5,
        CITY: 20
    },
    DIFFUSION_RATE: 0.3,
    EXPANSION_THRESHOLD: 80,
    STABILITY_DECAY: 0.05,
    STABILITY_RECOVERY: 0.1
};

const TYPES = {
    PLAIN: { emoji: '⬜', name: 'Plain' },
    FOREST: { emoji: '🌲', name: 'Forest' },
    VILLAGE: { emoji: '🏡', name: 'Village' },
    CITY: { emoji: '🏙️', name: 'City' },
    WATER: { emoji: '🌊', name: 'Water' },
    MOUNTAIN: { emoji: '⛰️', name: 'Mountain' },
    RUIN: { emoji: '🏚️', name: 'Ruin' }
};

class Cell {
    constructor(x, y, type = 'PLAIN') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.population = (type === 'VILLAGE') ? 10 : (type === 'CITY' ? 50 : 0);
        this.sustain = 0;
        this.stability = 100;
        this.regionId = null;
        this.element = null;
    }

    render() {
        if (!this.element) return;
        this.element.textContent = TYPES[this.type].emoji;

        // Visual feedback based on stability
        const saturation = this.stability;
        const brightness = 50 + (this.stability / 2);
        this.element.style.filter = `saturate(${saturation}%) brightness(${brightness}%)`;

        if (this.type === 'RUIN') {
            this.element.style.filter = `grayscale(80%)`;
        }
    }
}

class Game {
    constructor() {
        this.grid = [];
        this.turn = 0;
        this.regions = [];
        this.autoSim = false;
        this.init();
    }

    init() {
        const gridEl = document.getElementById('grid');
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            this.grid[y] = [];
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                let type = 'PLAIN';
                // Procedural generation (very simple for MVP)
                const rand = Math.random();
                if (rand < 0.05) type = 'MOUNTAIN';
                else if (rand < 0.15) type = 'WATER';
                else if (rand < 0.25) type = 'FOREST';
                else if (rand < 0.27) type = 'VILLAGE';

                const cell = new Cell(x, y, type);
                const el = document.createElement('div');
                el.className = 'cell';
                el.addEventListener('click', () => this.handleCellClick(cell));
                gridEl.appendChild(el);
                cell.element = el;
                this.grid[y][x] = cell;
                cell.render();
            }
        }
        this.recalculateRegions();

        document.getElementById('step-btn').addEventListener('click', () => this.step());
        document.getElementById('auto-btn').addEventListener('click', () => {
            this.autoSim = !this.autoSim;
            document.getElementById('auto-btn').textContent = this.autoSim ? 'Stop Simulation' : 'Auto Simulation';
            if (this.autoSim) this.runAuto();
        });
    }

    recalculateRegions() {
        let regionCount = 0;
        const visited = new Set();
        this.regions = [];

        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (visited.has(cell) || cell.type === 'MOUNTAIN' || cell.type === 'WATER') continue;

                const region = [];
                const queue = [cell];
                visited.add(cell);

                while (queue.length > 0) {
                    const curr = queue.shift();
                    curr.regionId = regionCount;
                    region.push(curr);

                    const neighbors = this.getNeighbors(curr.x, curr.y);
                    for (const next of neighbors) {
                        if (!visited.has(next) && next.type !== 'MOUNTAIN' && next.type !== 'WATER') {
                            visited.add(next);
                            queue.push(next);
                        }
                    }
                }
                this.regions.push({ id: regionCount++, cells: region, sustainCapacity: 0, demand: 0 });
            }
        }
    }

    getNeighbors(x, y) {
        const neighbors = [];
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < CONFIG.GRID_SIZE && ny >= 0 && ny < CONFIG.GRID_SIZE) {
                neighbors.push(this.grid[ny][nx]);
            }
        }
        return neighbors;
    }

    handleCellClick(cell) {
        if (cell.population > 0) {
            this.log(`Necromancer kills population in ${cell.type} at ${cell.x},${cell.y}`);
            cell.population = 0;
            cell.stability -= 50;
            cell.element.classList.add('death-flash');
            setTimeout(() => cell.element.classList.remove('death-flash'), 300);
            this.step();
        }
    }

    log(msg, type = '') {
        const logEl = document.getElementById('log');
        const entry = document.createElement('p');
        entry.className = 'log-entry ' + (type ? 'log-' + type : '');
        entry.textContent = `[Month ${this.turn}] ${msg}`;
        logEl.prepend(entry);
    }

    step() {
        this.turn++;
        document.getElementById('turn-counter').textContent = `Month: ${this.turn}`;

        // 1. Sustain Production
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (cell.type === 'FOREST') cell.sustain += CONFIG.SUSTAIN_PRODUCTION.FOREST;
                if (cell.type === 'WATER') cell.sustain += CONFIG.SUSTAIN_PRODUCTION.WATER;
            }
        }

        // 2. Sustain Flow (Diffusion)
        const nextSustain = this.grid.map(row => row.map(c => c.sustain));
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const neighbors = this.getNeighbors(x, y);
                for (const n of neighbors) {
                    if (n.type === 'MOUNTAIN') continue;
                    const transfer = this.grid[y][x].sustain * CONFIG.DIFFUSION_RATE / neighbors.length;
                    nextSustain[y][x] -= transfer;
                    nextSustain[n.y][n.x] += transfer;
                }
            }
        }
        this.grid.forEach((row, y) => row.forEach((c, x) => c.sustain = nextSustain[y][x]));

        // 3. Consumption & Regression
        this.grid.flat().forEach(cell => {
            let demand = 0;
            if (cell.type === 'VILLAGE') demand = (cell.population / 10) * CONFIG.CONSUMPTION.VILLAGE;
            if (cell.type === 'CITY') demand = (cell.population / 10) * CONFIG.CONSUMPTION.CITY;

            if (demand > 0) {
                if (cell.sustain >= demand) {
                    cell.sustain -= demand;
                    cell.stability = Math.min(100, cell.stability + CONFIG.STABILITY_RECOVERY);
                } else {
                    const deficit = demand - cell.sustain;
                    cell.sustain = 0;
                    cell.population = Math.max(0, cell.population - (deficit / 2));
                    cell.stability = Math.max(0, cell.stability - CONFIG.STABILITY_DECAY * 10);
                }
            } else {
                cell.stability = Math.min(100, cell.stability + CONFIG.STABILITY_RECOVERY);
            }

            // Transformation
            if (cell.population === 0 && (cell.type === 'VILLAGE' || cell.type === 'CITY')) {
                this.log(`A settlement at ${cell.x},${cell.y} has collapsed.`, 'death');
                cell.type = 'RUIN';
            }
        });

        // 4. Expansion
        this.grid.flat().forEach(cell => {
            if (cell.stability > CONFIG.EXPANSION_THRESHOLD && (cell.type === 'VILLAGE' || cell.type === 'CITY')) {
                const neighbors = this.getNeighbors(cell.x, cell.y).filter(n => n.type === 'PLAIN');
                if (neighbors.length > 0 && Math.random() < 0.05) {
                    const target = neighbors[Math.floor(Math.random() * neighbors.length)];
                    target.type = cell.type;
                    target.population = 5;
                    target.stability = 50;
                    this.log(`Expansion: New ${target.type} at ${target.x},${target.y}`);
                }
            }
            // Forest expansion
            if (cell.type === 'FOREST' && cell.stability > 70) {
                const neighbors = this.getNeighbors(cell.x, cell.y).filter(n => n.type === 'PLAIN');
                if (neighbors.length > 0 && Math.random() < 0.02) {
                    const target = neighbors[Math.floor(Math.random() * neighbors.length)];
                    target.type = 'FOREST';
                    this.log(`Nature grows: Forest at ${target.x},${target.y}`);
                }
            }
        });

        this.grid.flat().forEach(c => c.render());
    }

    runAuto() {
        if (!this.autoSim) return;
        this.step();
        setTimeout(() => this.runAuto(), 1000);
    }
}

window.game = new Game();
