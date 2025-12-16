import './style.css';
import { TERRAIN, TERRAIN_BY_ID } from './terrain';
import { createDemoDeck, cardFromId, shuffle } from './cards';
const canvas = document.getElementById('canvas');
const terrainButtons = document.getElementById('terrainButtons');
const radiusEl = document.getElementById('radius');
const sizeEl = document.getElementById('size');
const radiusVal = document.getElementById('radiusVal');
const sizeVal = document.getElementById('sizeVal');
const jsonEl = document.getElementById('json');
const hoverInfo = document.getElementById('hoverInfo');
const deckCountEl = document.getElementById('deckCount');
const discardCountEl = document.getElementById('discardCount');
const handRow = document.getElementById('handRow');
const turnVal = document.getElementById('turnVal');
const landDeckCountEl = document.getElementById('landDeckCount');
const landHandEl = document.getElementById('landHand');
const landDraftEl = document.getElementById('landDraft');
const startLandBtn = document.getElementById('startLand');
const drawLandBtn = document.getElementById('drawLand');
const ctx = canvas.getContext('2d');
if (!ctx)
    throw new Error('Canvas 2D context not available');
let dpr = window.devicePixelRatio || 1;
const imageCache = new Map();
const state = {
    board: {
        hexSize: Number(sizeEl?.value || 70) || 70,
        radius: Number(radiusEl?.value || 10) || 10,
        tiles: new Map(),
        zoom: 1,
        panX: 0,
        panY: 0,
        selected: 'wuste',
        isPanning: false,
        lastX: 0,
        lastY: 0
    },
    cards: {
        deck: createDemoDeck(),
        hand: [],
        discard: []
    },
    land: {
        deck: [],
        hand: null,
        drawn: [],
        discard: [],
        started: false
    },
    turn: 1
};
function evtToCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function axialToPixel(q, r, size) {
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = size * (1.5 * r);
    return { x, y };
}
function pixelToAxial(x, y, size) {
    const q = (Math.sqrt(3) / 3 * x - (1 / 3) * y) / size;
    const r = ((2 / 3) * y) / size;
    return cubeRound(q, r, -q - r);
}
function cubeRound(x, y, z) {
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);
    const dx = Math.abs(rx - x);
    const dy = Math.abs(ry - y);
    const dz = Math.abs(rz - z);
    if (dx > dy && dx > dz)
        rx = -ry - rz;
    else if (dy > dz)
        ry = -rx - rz;
    else
        rz = -rx - ry;
    return { q: rx, r: ry };
}
function hexCorners(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i - 30);
        pts.push({
            x: cx + size * Math.cos(angle),
            y: cy + size * Math.sin(angle)
        });
    }
    return pts;
}
function key(q, r) {
    return `${q},${r}`;
}
function inRadius(q, r, radius) {
    const s = -q - r;
    return Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= radius;
}
const LAND_POOL = TERRAIN.map(t => t.id).filter(id => id !== 'leer');
function shuffleTerrain(deck) {
    const copy = [...deck];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
function generateLandDeck() {
    // simple deck: three Kopien jedes Land-Typs (ohne "leer")
    const raw = [];
    LAND_POOL.forEach(id => {
        raw.push(id, id, id);
    });
    return shuffleTerrain(raw);
}
function renderTerrainButtons() {
    terrainButtons.innerHTML = '';
    TERRAIN.forEach(t => {
        const b = document.createElement('button');
        b.className = t.id === state.board.selected ? 'active' : '';
        b.innerHTML = t.color
            ? `<span class="dot" style="background:${t.color}"></span>${t.label}`
            : `${t.label}`;
        b.onclick = () => {
            state.board.selected = t.id;
            renderTerrainButtons();
        };
        terrainButtons.appendChild(b);
    });
}
function drawHexImage(img, centerX, centerY, sizePx) {
    const hexW = Math.sqrt(3) * sizePx;
    const hexH = 2 * sizePx;
    const scale = Math.max(hexW / img.width, hexH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = centerX - drawW / 2;
    const dy = centerY - drawH / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
}
function loadTerrainImages() {
    const sources = Array.from(new Set(TERRAIN.map(t => t.image).filter(Boolean)));
    if (!sources.length)
        return Promise.resolve();
    const loaders = sources.map(src => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ src, img });
        img.onerror = () => resolve({ src, img: null });
        img.src = src;
    }));
    return Promise.all(loaders).then(items => {
        items.forEach(({ src, img }) => {
            if (img)
                imageCache.set(src, img);
        });
    });
}
function resize() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.board.panX === 0 && state.board.panY === 0) {
        state.board.panX = rect.width / 2;
        state.board.panY = rect.height / 2;
    }
    draw();
}
function worldToScreen(x, y) {
    return { x: state.board.panX + x * state.board.zoom, y: state.board.panY + y * state.board.zoom };
}
function screenToWorld(x, y) {
    return { x: (x - state.board.panX) / state.board.zoom, y: (y - state.board.panY) / state.board.zoom };
}
function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    const g = ctx.createRadialGradient(rect.width * 0.55, rect.height * 0.45, 20, rect.width * 0.55, rect.height * 0.45, Math.max(rect.width, rect.height));
    g.addColorStop(0, 'rgba(255,255,255,0.04)');
    g.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, rect.width, rect.height);
    const size = state.board.hexSize;
    const r = state.board.radius;
    for (let q = -r; q <= r; q++) {
        for (let rr = -r; rr <= r; rr++) {
            if (!inRadius(q, rr, r))
                continue;
            const p = axialToPixel(q, rr, size);
            const sp = worldToScreen(p.x, p.y);
            const pts = hexCorners(sp.x, sp.y, size * state.board.zoom);
            const tId = state.board.tiles.get(key(q, rr));
            const terrain = tId ? TERRAIN_BY_ID.get(tId) : undefined;
            const traceHex = () => {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < 6; i++)
                    ctx.lineTo(pts[i].x, pts[i].y);
                ctx.closePath();
            };
            if (terrain) {
                const img = terrain.image ? imageCache.get(terrain.image) : null;
                if (img) {
                    const sizePx = size * state.board.zoom;
                    traceHex();
                    ctx.save();
                    ctx.clip();
                    drawHexImage(img, sp.x, sp.y, sizePx);
                    ctx.restore();
                }
                else if (terrain.color) {
                    traceHex();
                    ctx.fillStyle = `${terrain.color}CC`;
                    ctx.fill();
                }
            }
            traceHex();
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}
function placeAt(mouseX, mouseY, erase = false) {
    const w = screenToWorld(mouseX, mouseY);
    const a = pixelToAxial(w.x, w.y, state.board.hexSize);
    if (!inRadius(a.q, a.r, state.board.radius))
        return;
    const k = key(a.q, a.r);
    const fromHand = state.land.hand;
    const terrainToUse = fromHand ?? state.board.selected;
    if (erase || terrainToUse === 'leer') {
        state.board.tiles.delete(k);
    }
    else {
        state.board.tiles.set(k, terrainToUse);
        if (fromHand) {
            state.land.discard.push(fromHand);
            state.land.hand = null;
            state.land.drawn = [];
            updateLandUI();
        }
    }
    syncJSON();
    draw();
}
function syncJSON() {
    const payload = {
        board: {
            hexSize: state.board.hexSize,
            radius: state.board.radius,
            tiles: Array.from(state.board.tiles.entries()).map(([k, v]) => ({ k, v }))
        },
        land: {
            deck: [...state.land.deck],
            hand: state.land.hand,
            drawn: [...state.land.drawn],
            discard: [...state.land.discard],
            started: state.land.started
        },
        cards: {
            deck: state.cards.deck.map(c => c.id),
            hand: state.cards.hand.map(c => c.id),
            discard: state.cards.discard.map(c => c.id)
        },
        turn: state.turn
    };
    jsonEl.value = JSON.stringify(payload, null, 2);
}
function loadJSON() {
    try {
        const obj = JSON.parse(jsonEl.value || '{}');
        if (obj.board) {
            if (typeof obj.board.hexSize === 'number')
                state.board.hexSize = obj.board.hexSize;
            if (typeof obj.board.radius === 'number')
                state.board.radius = obj.board.radius;
            state.board.tiles = new Map();
            if (Array.isArray(obj.board.tiles)) {
                obj.board.tiles.forEach(t => {
                    if (t && typeof t.k === 'string' && typeof t.v === 'string')
                        state.board.tiles.set(t.k, t.v);
                });
            }
            sizeEl.value = String(state.board.hexSize);
            radiusEl.value = String(state.board.radius);
            sizeVal.textContent = String(state.board.hexSize);
            radiusVal.textContent = String(state.board.radius);
        }
        if (obj.cards) {
            const toCards = (ids) => ids.map(cardFromId);
            state.cards.deck = toCards(obj.cards.deck || []);
            state.cards.hand = toCards(obj.cards.hand || []);
            state.cards.discard = toCards(obj.cards.discard || []);
        }
        if (obj.land) {
            state.land.deck = [...(obj.land.deck || [])];
            state.land.hand = obj.land.hand ?? null;
            state.land.drawn = [...(obj.land.drawn || [])];
            state.land.discard = [...(obj.land.discard || [])];
            state.land.started = Boolean(obj.land.started);
        }
        state.turn = obj.turn && typeof obj.turn === 'number' ? obj.turn : 1;
        updateLandUI();
        renderHand();
        draw();
    }
    catch (e) {
        alert('JSON ungültig.');
    }
}
function resetLandStage() {
    state.land.deck = generateLandDeck();
    state.land.discard = [];
    state.land.hand = null;
    state.land.drawn = [];
    state.land.started = true;
    state.board.tiles.clear();
    // beim Start Auswahl zurücksetzen
    state.board.selected = 'wuste';
    renderTerrainButtons();
    updateLandUI();
    syncJSON();
    draw();
}
function ensureLandDeck() {
    if (state.land.deck.length === 0 && state.land.discard.length > 0) {
        state.land.deck = shuffleTerrain([...state.land.discard]);
        state.land.discard = [];
    }
}
function drawLandTile() {
    if (!state.land.started)
        resetLandStage();
    if (state.land.drawn.length > 0)
        return;
    ensureLandDeck();
    const drawn = [];
    for (let i = 0; i < 3; i++) {
        ensureLandDeck();
        const t = state.land.deck.pop();
        if (t)
            drawn.push(t);
    }
    state.land.drawn = drawn;
    updateLandUI();
    syncJSON();
}
function chooseLandTile(choice) {
    if (!state.land.drawn.includes(choice))
        return;
    const rest = state.land.drawn.filter(t => t !== choice);
    // rest unter das Deck legen (bottom = front)
    state.land.deck = [...rest.reverse(), ...state.land.deck];
    state.land.hand = choice;
    state.land.drawn = [];
    state.board.selected = choice;
    renderTerrainButtons();
    updateLandUI();
    syncJSON();
}
function updateLandUI() {
    if (landDeckCountEl)
        landDeckCountEl.textContent = String(state.land.deck.length);
    if (landHandEl) {
        landHandEl.innerHTML = '';
        if (state.land.hand) {
            const terrain = TERRAIN_BY_ID.get(state.land.hand);
            const img = terrain?.image ? `<img src=\"${terrain.image}\" alt=\"${terrain?.label ?? state.land.hand}\" />` : '';
            landHandEl.innerHTML = `<div class=\"land-card current\">${img || terrain?.label || state.land.hand}</div>`;
        }
        else {
            landHandEl.innerHTML = '<div class=\"land-card placeholder\">kein Tile gewählt</div>';
        }
    }
    if (landDraftEl) {
        landDraftEl.innerHTML = '';
        if (state.land.drawn.length) {
            state.land.drawn.forEach(tid => {
                const terrain = TERRAIN_BY_ID.get(tid);
                const img = terrain?.image ? `<img src=\"${terrain.image}\" alt=\"${terrain?.label ?? tid}\" />` : '';
                const card = document.createElement('div');
                card.className = 'land-card';
                card.innerHTML = img || (terrain?.label ?? tid);
                card.title = terrain?.label ?? tid;
                card.onclick = () => chooseLandTile(tid);
                landDraftEl.appendChild(card);
            });
        }
    }
    if (drawLandBtn) {
        const canDraw = (state.land.deck.length > 0 || state.land.discard.length > 0) && state.land.drawn.length === 0;
        drawLandBtn.disabled = !canDraw;
    }
}
function ensureDeck() {
    if (state.cards.deck.length === 0 && state.cards.discard.length > 0) {
        state.cards.deck = shuffle([...state.cards.discard]);
        state.cards.discard = [];
    }
}
function drawCard(count = 1) {
    for (let i = 0; i < count; i++) {
        ensureDeck();
        const card = state.cards.deck.pop();
        if (!card)
            break;
        state.cards.hand.push(card);
    }
    renderHand();
    syncJSON();
}
function playCard(cardId) {
    const idx = state.cards.hand.findIndex(c => c.id === cardId);
    if (idx === -1)
        return;
    const [card] = state.cards.hand.splice(idx, 1);
    state.cards.discard.push(card);
    renderHand();
    syncJSON();
}
function discardHand() {
    if (!state.cards.hand.length)
        return;
    state.cards.discard.push(...state.cards.hand);
    state.cards.hand = [];
    renderHand();
    syncJSON();
}
function shuffleDeck() {
    state.cards.deck = shuffle([...state.cards.deck, ...state.cards.discard]);
    state.cards.discard = [];
    renderHand();
    syncJSON();
}
function nextTurn() {
    state.turn += 1;
    drawCard(1);
    renderHand();
    syncJSON();
}
function renderHand() {
    handRow.innerHTML = '';
    state.cards.hand.forEach(card => {
        const terrain = card.affinity && card.affinity !== 'neutral' ? TERRAIN_BY_ID.get(card.affinity) : undefined;
        const bgImg = terrain?.image;
        const baseColor = terrain?.color || '#9aa4b5';
        const el = document.createElement('div');
        el.className = 'card';
        if (bgImg) {
            el.classList.add('has-image');
            el.style.backgroundImage = `url(${bgImg})`;
        }
        else {
            el.style.background = `linear-gradient(160deg, ${baseColor}33, rgba(255,255,255,0.04))`;
            el.style.borderColor = `${baseColor}66`;
        }
        el.innerHTML = `
      <div class="card-overlay">
        <div class="card-title-row">
          <div class="card-title">${card.name}</div>
          <div class="card-cost">${card.cost}</div>
        </div>
        <div class="card-text">${card.text ?? ''}</div>
        <div class="card-affinity">${card.affinity ? `Affinität: ${card.affinity}` : ''}</div>
      </div>
    `;
        el.onclick = () => playCard(card.id);
        el.title = card.text ?? card.name;
        handRow.appendChild(el);
    });
    deckCountEl.textContent = String(state.cards.deck.length);
    discardCountEl.textContent = String(state.cards.discard.length);
    turnVal.textContent = String(state.turn);
}
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousedown', e => {
    const p = evtToCanvas(e);
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        state.board.isPanning = true;
        state.board.lastX = e.clientX;
        state.board.lastY = e.clientY;
        return;
    }
    if (e.button === 2)
        placeAt(p.x, p.y, true);
    else
        placeAt(p.x, p.y, false);
});
window.addEventListener('mousemove', e => {
    if (state.board.isPanning) {
        const dx = e.clientX - state.board.lastX;
        const dy = e.clientY - state.board.lastY;
        state.board.panX += dx;
        state.board.panY += dy;
        state.board.lastX = e.clientX;
        state.board.lastY = e.clientY;
        draw();
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
        return;
    const w = screenToWorld(x, y);
    const a = pixelToAxial(w.x, w.y, state.board.hexSize);
    if (!inRadius(a.q, a.r, state.board.radius)) {
        hoverInfo.textContent = '—';
        return;
    }
    const tId = state.board.tiles.get(key(a.q, a.r));
    const t = tId ? TERRAIN_BY_ID.get(tId) : undefined;
    const infoText = t?.info ? ` — ${t.info}` : '';
    hoverInfo.textContent = `${a.q},${a.r}` + (t ? ` · ${t.label}${infoText}` : '');
});
window.addEventListener('mouseup', () => (state.board.isPanning = false));
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const p = evtToCanvas(e);
    const before = screenToWorld(p.x, p.y);
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    state.board.zoom = Math.min(3, Math.max(0.35, state.board.zoom * factor));
    const after = screenToWorld(p.x, p.y);
    state.board.panX += (after.x - before.x) * state.board.zoom;
    state.board.panY += (after.y - before.y) * state.board.zoom;
    draw();
}, { passive: false });
radiusEl.oninput = () => {
    state.board.radius = Number(radiusEl.value);
    radiusVal.textContent = radiusEl.value;
    syncJSON();
    draw();
};
sizeEl.oninput = () => {
    state.board.hexSize = Number(sizeEl.value);
    sizeVal.textContent = sizeEl.value;
    syncJSON();
    draw();
};
document.getElementById('clear').onclick = () => {
    state.board.tiles.clear();
    syncJSON();
    draw();
};
document.getElementById('random').onclick = () => {
    state.board.tiles.clear();
    const r = state.board.radius;
    const choices = TERRAIN.filter(t => t.id !== 'leer').map(t => t.id);
    for (let q = -r; q <= r; q++)
        for (let rr = -r; rr <= r; rr++) {
            if (!inRadius(q, rr, r))
                continue;
            const pick = choices[Math.floor(Math.random() * choices.length)];
            state.board.tiles.set(key(q, rr), pick);
        }
    syncJSON();
    draw();
};
document.getElementById('copy').onclick = async () => {
    try {
        await navigator.clipboard.writeText(jsonEl.value);
    }
    catch {
        alert('Kopieren nicht möglich (Browser-Permission).');
    }
};
document.getElementById('load').onclick = loadJSON;
document.getElementById('drawCard').onclick = () => drawCard(1);
document.getElementById('discardHand').onclick = discardHand;
document.getElementById('nextTurn').onclick = nextTurn;
document.getElementById('shuffleDeck').onclick = shuffleDeck;
startLandBtn.onclick = resetLandStage;
drawLandBtn.onclick = drawLandTile;
updateLandUI();
renderTerrainButtons();
renderHand();
updateLandUI();
// Direkt einige Karten zeigen, damit die Hand sichtbar ist.
drawCard(3);
window.addEventListener('resize', resize);
resize();
loadTerrainImages().then(() => draw());
