// Rendering: the city, day-night light, entities are drawn by main via helpers here.
import { BLOCKS, BLOCK, ROAD, PITCH, WORLD, SIDEWALK, PALETTE } from './config.js';

// darkness 0 (midday) .. 1 (deep night) from the day fraction (0=dawn)
export function darkness(dayFrac) {
  const sun = Math.sin(dayFrac * Math.PI * 2 - Math.PI / 2); // -1 night .. 1 noon-ish
  return Math.max(0, Math.min(0.82, 0.45 - sun * 0.5));
}
export function skyTint(dayFrac) {
  const d = darkness(dayFrac);
  return `rgba(10,16,48,${(d * 0.55).toFixed(3)})`;
}

export function drawCity(ctx, city, cam, vw, vh, dayFrac) {
  const x0 = Math.max(0, cam.x - 20), y0 = Math.max(0, cam.y - 20);
  const x1 = Math.min(WORLD, cam.x + vw + 20), y1 = Math.min(WORLD, cam.y + vh + 20);
  // ground: grass base, sand strip on the south-east edge (the bay)
  ctx.fillStyle = PALETTE.grass; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = PALETTE.sand; ctx.fillRect(x0, WORLD - 90, x1 - x0, Math.max(0, y1 - (WORLD - 90)));
  ctx.fillStyle = PALETTE.water; ctx.fillRect(x0, WORLD - 34, x1 - x0, Math.max(0, y1 - (WORLD - 34)));
  // roads
  ctx.fillStyle = PALETTE.road;
  for (let i = 0; i <= BLOCKS; i++) {
    const c = i * PITCH;
    if (c + ROAD > x0 && c < x1) ctx.fillRect(c, y0, ROAD, y1 - y0);
    if (c + ROAD > y0 && c < y1) ctx.fillRect(x0, c, x1 - x0, ROAD);
  }
  // sidewalk borders around blocks
  ctx.fillStyle = PALETTE.sidewalk;
  for (let by = 0; by < BLOCKS; by++) for (let bx = 0; bx < BLOCKS; bx++) {
    const bx0 = ROAD + bx * PITCH, by0 = ROAD + by * PITCH;
    if (bx0 + BLOCK < x0 || bx0 > x1 || by0 + BLOCK < y0 || by0 > y1) continue;
    ctx.fillRect(bx0 - SIDEWALK / 2, by0 - SIDEWALK / 2, BLOCK + SIDEWALK, BLOCK + SIDEWALK);
    ctx.fillStyle = PALETTE.grass; ctx.fillRect(bx0, by0, BLOCK, BLOCK); ctx.fillStyle = PALETTE.sidewalk;
  }
  // centre dashes
  ctx.fillStyle = PALETTE.roadLine;
  for (let i = 0; i <= BLOCKS; i++) {
    const c = i * PITCH + ROAD / 2;
    for (let d = 8; d < WORLD; d += 36) {
      if (c > x0 && c < x1 && d > y0 && d < y1) ctx.fillRect(c - 1, d, 2, 18);
      if (c > y0 && c < y1 && d > x0 && d < x1) ctx.fillRect(d, c - 1, 18, 2);
    }
  }
  const dark = darkness(dayFrac);
  // buildings with roofs and windows (windows light up at night)
  for (const b of city.buildings) {
    if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(b.x + 5, b.y + 7, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof; ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
    const cols = Math.max(2, Math.floor(b.w / 26)), rows = Math.max(2, Math.floor(b.h / 26));
    for (let r = 0; r < rows; r++) for (let cIdx = 0; cIdx < cols; cIdx++) {
      const lit = ((b.seed * 997 + r * 31 + cIdx * 17) % 10) / 10 < dark;
      ctx.fillStyle = lit ? '#ffd76a' : 'rgba(20,30,40,0.55)';
      ctx.fillRect(b.x + 12 + cIdx * 24, b.y + 12 + r * 24, 10, 12);
    }
  }
  // palms
  for (const p of city.palms) {
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 2, p.y - 10); ctx.stroke();
    ctx.strokeStyle = '#2e8b4f'; ctx.lineWidth = 2.5;
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2 + p.x;
      ctx.beginPath(); ctx.moveTo(p.x + 2, p.y - 10);
      ctx.lineTo(p.x + 2 + Math.cos(ang) * 11, p.y - 14 + Math.sin(ang) * 5); ctx.stroke();
    }
  }
  // place labels
  ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const key of Object.keys(city.places)) {
    const pl = city.places[key];
    if (pl.x < x0 || pl.x > x1 || pl.y < y0 || pl.y > y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(pl.x - 52, pl.y - 34, 104, 18);
    ctx.fillStyle = '#ffe9a8'; ctx.fillText(pl.label, pl.x, pl.y - 21);
  }
}

export function drawMinimap(mm, state) {
  const ctx = mm.getContext('2d');
  const S = mm.width, scale = S / WORLD;
  ctx.fillStyle = '#20262e'; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#4a5058';
  for (let i = 0; i <= BLOCKS; i++) {
    ctx.fillRect(i * PITCH * scale, 0, ROAD * scale, S);
    ctx.fillRect(0, i * PITCH * scale, S, ROAD * scale);
  }
  ctx.fillStyle = '#c96f4a';
  for (const b of state.city.buildings) ctx.fillRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale);
  const dot = (x, y, color, r) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x * scale, y * scale, r, 0, 6.3); ctx.fill(); };
  for (const c of state.traffic) dot(c.x, c.y, '#cfd6dd', 1.6);
  for (const c of state.police) dot(c.x, c.y, Math.sin(performance.now() / 140) > 0 ? '#ff5252' : '#5b8cff', 2.6);
  if (state.target) dot(state.target.x, state.target.y, '#ffd83d', 3.4);
  dot(state.player.x, state.player.y, '#ffffff', 3);
  ctx.strokeStyle = '#ffd83d'; ctx.beginPath(); ctx.arc(state.player.x * scale, state.player.y * scale, 5, 0, 6.3); ctx.stroke();
}
