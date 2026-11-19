// City generation: an 8x8 grid of blocks separated by roads, deterministic
// from a seed so every visit (and every screenshot) shows the same Solar Bay.
import { BLOCKS, BLOCK, ROAD, PITCH, WORLD, PALETTE } from './config.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function roadCenter(i) { return i * PITCH + ROAD / 2; } // centre line of road i (0..BLOCKS)
export function isRoadCoord(v) {
  const m = ((v % PITCH) + PITCH) % PITCH;
  return m < ROAD;
}
export function clampWorld(v) { return Math.max(12, Math.min(WORLD - 12, v)); }

export function buildCity(seed) {
  const rand = rng(seed || 7);
  const buildings = [], palms = [];
  for (let by = 0; by < BLOCKS; by++) for (let bx = 0; bx < BLOCKS; bx++) {
    const x0 = ROAD + bx * PITCH, y0 = ROAD + by * PITCH;
    // one main building per block with a margin, sometimes split in two
    const split = rand() > 0.6;
    const mk = (x, y, w, h) => {
      const ci = Math.floor(rand() * PALETTE.building.length);
      buildings.push({ x, y, w, h, color: PALETTE.building[ci], roof: PALETTE.roof[ci], floors: 2 + Math.floor(rand() * 5), seed: rand() });
    };
    if (split) { mk(x0 + 14, y0 + 14, BLOCK / 2 - 20, BLOCK - 28); mk(x0 + BLOCK / 2 + 6, y0 + 14, BLOCK / 2 - 20, BLOCK - 28); }
    else mk(x0 + 14, y0 + 14, BLOCK - 28, BLOCK - 28);
    if (rand() > 0.45) palms.push({ x: x0 + 6 + rand() * 8, y: y0 + 6 + rand() * (BLOCK - 12) });
    if (rand() > 0.5) palms.push({ x: x0 + BLOCK - 10, y: y0 + rand() * BLOCK });
  }
  // named places used by missions: fixed lots around the map
  const places = {
    home:    { x: roadCenter(1), y: roadCenter(1), label: 'Home' },
    diner:   { x: roadCenter(3), y: roadCenter(1), label: 'Coral Diner' },
    garage:  { x: roadCenter(6), y: roadCenter(2), label: 'Bay Garage' },
    docks:   { x: roadCenter(7), y: roadCenter(7), label: 'The Docks' },
    hotel:   { x: roadCenter(2), y: roadCenter(5), label: 'Palms Hotel' },
    lookout: { x: roadCenter(5), y: roadCenter(6), label: 'Lookout Point' },
    depot:   { x: roadCenter(1), y: roadCenter(6), label: 'Courier Depot' },
  };
  return { buildings, palms, places, world: WORLD };
}

export function buildingAt(city, x, y, pad) {
  const p = pad || 0;
  for (const b of city.buildings) {
    if (x > b.x - p && x < b.x + b.w + p && y > b.y - p && y < b.y + b.h + p) return b;
  }
  return null;
}
// Push a circle (x,y,r) out of any building it overlaps; returns corrected [x,y].
export function collideBuildings(city, x, y, r) {
  const b = buildingAt(city, x, y, r * 0.6);
  if (!b) return [x, y];
  const left = Math.abs(x - (b.x - r * 0.6)), right = Math.abs(x - (b.x + b.w + r * 0.6));
  const top = Math.abs(y - (b.y - r * 0.6)), bottom = Math.abs(y - (b.y + b.h + r * 0.6));
  const m = Math.min(left, right, top, bottom);
  if (m === left) x = b.x - r * 0.6; else if (m === right) x = b.x + b.w + r * 0.6;
  else if (m === top) y = b.y - r * 0.6; else y = b.y + b.h + r * 0.6;
  return [x, y];
}
