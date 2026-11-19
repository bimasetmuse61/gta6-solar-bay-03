// Solar Bay — main loop, player, driving, wanted system, missions, HUD, save.
// Vanilla JS, no build step. Open game/index.html in a desktop browser.
import { WORLD, PLAYER, CAR, WANTED, DAY_LENGTH, SAVE_KEY, PALETTE } from './config.js';
import { buildCity, collideBuildings, clampWorld } from './world.js';
import { makeTrafficCar, updateTraffic, makePedestrian, updatePedestrian, makePolice, updatePolice, drawCarShape } from './entities.js';
import { MISSIONS, COURIER_PAY, COURIER_LINES } from './missions.js';
import { drawCity, drawMinimap, darkness, skyTint } from './render.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const statusEl = document.getElementById('status');
const audio = createAudio();
const rand = Math.random;

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener('resize', resize); resize();

// ---------- save ----------
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s.cash === 'number') return s; } catch {}
  return null;
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cash: state.cash, mission: state.missionIndex, done: state.storyDone, dayFrac: state.dayFrac })); } catch {}
}

// ---------- state ----------
const saved = loadSave();
const city = buildCity(7);
const home = city.places.home;
const state = {
  mode: 'title', // title | play | dialogue | paused | busted | wasted | complete
  city,
  player: { x: home.x + 20, y: home.y + 34, angle: -Math.PI / 2, health: saved ? 100 : PLAYER.health, inCar: null, punchT: 0 },
  playerCar: null, // the story car (Mara's coupe) once spawned
  traffic: [], peds: [], police: [],
  cash: saved ? saved.cash : 40,
  wanted: 0, heat: 0, hiddenT: 0, crimeFlash: '',
  missionIndex: saved ? Math.min(saved.mission || 0, MISSIONS.length) : 0,
  storyDone: !!(saved && saved.done),
  missionStage: 'intro', // intro | active | pickup | escape | done
  dialogue: [], dialogueCb: null,
  courier: null, // {x,y,pay,fromX,fromY}
  target: null,
  dayFrac: saved && typeof saved.dayFrac === 'number' ? saved.dayFrac : 0.32,
  time: 0, shake: 0, msg: '', msgT: 0, bustT: 0,
  stats: { crimes: 0, deliveries: 0 },
};
for (let i = 0; i < 11; i++) state.traffic.push(makeTrafficCar(rand));
for (let i = 0; i < 16; i++) state.peds.push(makePedestrian(rand));
// Mara's coupe waits at the garage from the start (mission 1 target)
state.playerCar = { id: 999, kind: 'player', x: city.places.garage.x + 16, y: city.places.garage.y + 10, angle: 0, speed: 0, color: '#f39c12', health: 100, driver: false };
state.traffic.push(state.playerCar);

const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true; audio.unlock();
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Enter') advance();
  if (e.code === 'KeyM') { audio.setMuted(!audio.isMuted()); toast(audio.isMuted() ? 'Sound off' : 'Sound on'); }
  if ((e.code === 'KeyP' || e.code === 'Escape')) {
    if (state.mode === 'play') state.mode = 'paused';
    else if (state.mode === 'paused') state.mode = 'play';
    else if (state.mode === 'title') startGame();
  }
  if (e.code === 'KeyE' && state.mode === 'play') toggleCar();
  if (e.code === 'KeyH' && state.player.inCar) audio.horn();
  if (e.code === 'KeyF' && state.mode === 'play' && !state.player.inCar) doPunch();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('pointerdown', () => { audio.unlock(); advance(); });

function toast(msg, secs) { state.msg = msg; state.msgT = secs || 3.2; statusEl.textContent = msg; }
function currentMission() { return state.missionIndex < MISSIONS.length ? MISSIONS[state.missionIndex] : null; }

function startGame() {
  if (state.mode === 'busted' || state.mode === 'wasted') {
    state.player.health = 100; state.wanted = 0; state.heat = 0; state.police = [];
    state.player.inCar = null; state.player.x = home.x + 20; state.player.y = home.y + 34;
    if (state.mode === 'busted') state.cash = Math.max(0, state.cash - 50);
  }
  state.mode = 'play';
  const m = currentMission();
  if (m && state.missionStage === 'intro') showDialogue(m.intro, () => beginMission());
  else if (!m && !state.storyDone) { state.storyDone = true; }
  toast(m ? `Mission: ${m.title}` : 'Solar Bay is yours. Courier jobs pay at the Depot.');
}
function showDialogue(lines, cb) {
  state.dialogue = lines.slice(); state.dialogueCb = cb || null; state.mode = 'dialogue';
}
function advance() {
  if (state.mode === 'title' || state.mode === 'complete') { startGame(); return; }
  if (state.mode === 'busted' || state.mode === 'wasted') { startGame(); return; }
  if (state.mode === 'dialogue') {
    state.dialogue.shift();
    if (!state.dialogue.length) { state.mode = 'play'; const cb = state.dialogueCb; state.dialogueCb = null; if (cb) cb(); }
  }
}
function beginMission() {
  const m = currentMission(); if (!m) return;
  state.missionStage = 'active';
  const pl = city.places[m.place]; state.target = { x: pl.x, y: pl.y };
  toast(m.objective, 5);
  if (m.id === 'm4' || m.id === 'm5') { /* heat comes when the item is grabbed */ }
}
function completeMission() {
  const m = currentMission(); if (!m) return;
  state.cash += m.reward; audio.cash(); persist();
  showDialogue(m.outro, () => {
    state.missionIndex++; state.missionStage = 'intro'; state.target = null; persist();
    const n = currentMission();
    if (n) showDialogue(n.intro, () => beginMission());
    else { state.storyDone = true; state.mode = 'complete'; persist(); }
  });
  state.missionStage = 'done';
}
function addCrime(amount, label) {
  state.heat = Math.min(100, state.heat + amount); state.stats.crimes++;
  const stars = Math.min(WANTED.max, Math.floor(state.heat / 20) + (state.heat > 4 ? 1 : 0));
  const capped = Math.max(state.wanted, Math.min(WANTED.max, stars));
  if (capped > state.wanted) { state.wanted = capped; audio.star(); }
  state.hiddenT = 0; state.crimeFlash = label; setTimeout(() => { state.crimeFlash = ''; }, 10);
  toast(label + '  Wanted level up!', 2);
}
function toggleCar() {
  const p = state.player;
  if (p.inCar) {
    const car = p.inCar; p.inCar = null; car.driver = false;
    p.x = car.x - Math.sin(car.angle) * 20; p.y = car.y + Math.cos(car.angle) * 20;
    audio.door(); audio.engine(0, false); return;
  }
  let best = null, bd = 52;
  for (const c of state.traffic) {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bd) { bd = d; best = c; }
  }
  if (best) {
    p.inCar = best; best.driver = true; audio.door();
    if (best !== state.playerCar && best.kind === 'traffic') addCrime(22, 'Vehicle theft!');
    if (currentMission() && currentMission().id === 'm1' && best === state.playerCar && state.missionStage === 'active') {
      toast('Got the coupe! Mara is impressed. Mission complete.', 4); completeMission();
    }
  }
}
function doPunch() {
  const p = state.player; p.punchT = 0.22; audio.punch();
  for (const ped of state.peds) {
    if (Math.hypot(ped.x - p.x, ped.y - p.y) < 30) { ped.scared = 2; addCrime(18, 'Assault!'); return; }
  }
  for (const c of state.traffic) {
    if (!p.inCar && Math.hypot(c.x - p.x, c.y - p.y) < 40) { c.health -= 12; addCrime(12, 'Vandalism!'); return; }
  }
}
function startCourier() {
  const places = Object.values(city.places);
  const dest = places[Math.floor(rand() * places.length)];
  const from = city.places.depot;
  const dist = Math.hypot(dest.x - from.x, dest.y - from.y);
  state.courier = { x: dest.x, y: dest.y, pay: Math.round(COURIER_PAY.base + dist * COURIER_PAY.perMeter) };
  state.target = { x: dest.x, y: dest.y };
  toast(COURIER_LINES[Math.floor(rand() * COURIER_LINES.length)] + ` Deliver for $${state.courier.pay}.`, 4.5);
}

// ---------- update ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state.mode === 'play' || state.mode === 'dialogue') update(dt);
  render();
  requestAnimationFrame(frame);
}
function update(dt) {
  state.time += dt; state.dayFrac = (state.dayFrac + dt / DAY_LENGTH) % 1;
  if (state.msgT > 0) state.msgT -= dt;
  if (state.player.punchT > 0) state.player.punchT -= dt;
  const p = state.player;
  const inDialogue = state.mode === 'dialogue';

  // --- player movement / driving ---
  if (!inDialogue) {
    if (p.inCar) {
      const car = p.inCar;
      const up = keys.KeyW || keys.ArrowUp, down = keys.KeyS || keys.ArrowDown;
      const left = keys.KeyA || keys.ArrowLeft, right = keys.KeyD || keys.ArrowRight;
      if (up) car.speed += CAR.accel * dt; if (down) car.speed -= (car.speed > 4 ? CAR.brake : CAR.accel * 0.6) * dt;
      car.speed *= Math.pow(CAR.friction, dt * 60 * 0.16);
      car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed * (keys.ShiftLeft ? 1.25 : 1), car.speed));
      if (Math.abs(car.speed) > 4) car.angle += (left ? -1 : right ? 1 : 0) * CAR.turn * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120);
      car.x += Math.cos(car.angle) * car.speed * dt; car.y += Math.sin(car.angle) * car.speed * dt;
      const [nx, ny] = collideBuildings(city, car.x, car.y, 16);
      if (nx !== car.x || ny !== car.y) { if (Math.abs(car.speed) > 130) { audio.crash(); state.shake = 0.25; car.health -= 8; } car.speed *= -0.25; car.x = nx; car.y = ny; }
      car.x = clampWorld(car.x); car.y = clampWorld(car.y);
      p.x = car.x; p.y = car.y; p.angle = car.angle;
      audio.engine(car.speed / CAR.maxSpeed, true);
      // collisions with traffic / peds while driving
      for (const c of state.traffic) {
        if (c === car) continue;
        if (Math.hypot(c.x - car.x, c.y - car.y) < 30 && Math.abs(car.speed) > 60) { audio.crash(); state.shake = 0.3; c.health -= 20; addCrime(16, 'Hit and run!'); car.speed *= 0.55; }
      }
      for (const ped of state.peds) {
        if (Math.hypot(ped.x - car.x, ped.y - car.y) < 20 && Math.abs(car.speed) > 50) { ped.scared = 3; ped.x += 30; addCrime(30, 'Reckless driving!'); p.health -= 4; }
      }
    } else {
      audio.engine(0, false);
      const sp = (keys.ShiftLeft || keys.ShiftRight) ? PLAYER.run : PLAYER.walk;
      let mx = 0, my = 0;
      if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1;
      if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
      if (mx || my) { const l = Math.hypot(mx, my); p.x += (mx / l) * sp * dt; p.y += (my / l) * sp * dt; p.angle = Math.atan2(my, mx); }
      const [nx, ny] = collideBuildings(city, p.x, p.y, PLAYER.radius); p.x = clampWorld(nx); p.y = clampWorld(ny);
    }
  }

  // --- traffic & peds ---
  for (const c of state.traffic) if (c !== p.inCar && c.kind !== 'player') updateTraffic(c, dt, rand);
  if (state.playerCar !== p.inCar) { /* parked story car stays put */ }
  const threat = Math.abs(p.inCar ? p.inCar.speed : 0) > 80 ? p : null;
  for (const ped of state.peds) updatePedestrian(ped, dt, threat);

  // --- wanted & police ---
  const seenByPolice = state.police.some(c => Math.hypot(c.x - p.x, c.y - p.y) < 300);
  if (state.wanted > 0 && !seenByPolice) state.hiddenT += dt; else if (seenByPolice) state.hiddenT = 0;
  if (state.hiddenT > WANTED.decayDelay) {
    state.heat = Math.max(0, state.heat - dt * (100 / WANTED.decayEvery) * 0.34);
    const s = state.heat <= 1 ? 0 : Math.min(state.wanted, Math.max(1, Math.ceil(state.heat / 20)));
    if (s < state.wanted) { state.wanted = s; if (s === 0) { state.heat = 0; toast('You lost the heat. Lay low worked.'); onHeatCleared(); } }
  }
  const wantPolice = state.wanted === 0 ? 0 : 1 + state.wanted;
  while (state.police.length < wantPolice) {
    const a = rand() * 6.28, d = 420 + rand() * 160;
    state.police.push(makePolice(clampWorld(p.x + Math.cos(a) * d), clampWorld(p.y + Math.sin(a) * d)));
  }
  while (state.police.length > wantPolice) state.police.pop();
  let copClose = false;
  for (const cop of state.police) {
    const dist = updatePolice(cop, dt, { x: p.x, y: p.y, inCar: !!p.inCar }, city);
    if (dist < 30) copClose = true;
    if (dist < 26 && Math.abs(p.inCar ? p.inCar.speed : 0) < 30) { /* contact below */ }
  }
  audio.siren(state.police.length > 0 && state.wanted > 0, state.time);
  // busted: surrounded and slow / on foot
  if (state.wanted > 0 && copClose && !p.inCar) {
    state.bustT += dt;
    if (state.bustT > 1.6) { state.mode = 'busted'; state.bustT = 0; audio.engine(0, false); }
  } else if (state.wanted > 0 && copClose && p.inCar && Math.abs(p.inCar.speed) < 18) {
    state.bustT += dt;
    if (state.bustT > 2.2) { state.mode = 'busted'; state.bustT = 0; }
  } else state.bustT = Math.max(0, state.bustT - dt);
  if (p.health <= 0) { state.mode = 'wasted'; audio.engine(0, false); }

  checkObjectives();
  drawMinimap(minimap, state);
}
function onHeatCleared() {
  const m = currentMission();
  if (m && (m.id === 'm4' || m.id === 'm5') && state.missionStage === 'escape') completeMission();
}
function near(x, y, d) { return Math.hypot(state.player.x - x, state.player.y - y) < d; }
function checkObjectives() {
  const m = currentMission();
  if (m && state.missionStage === 'active') {
    const pl = city.places[m.place];
    if (m.id === 'm1') { if (near(pl.x, pl.y, 60)) toast('The coupe is here — press E next to it.', 1.2); }
    else if (m.id === 'm2' && near(pl.x, pl.y, 34)) { audio.pickup(); toast('Envelope picked up.'); completeMission(); }
    else if (m.id === 'm3' && near(pl.x, pl.y, 40)) {
      state.missionStage = 'pickup'; const lk = city.places.lookout; state.target = { x: lk.x, y: lk.y };
      toast('Guest on board. Take them to Lookout Point.', 4);
    } else if (m.id === 'm4' && near(pl.x, pl.y, 36)) {
      audio.pickup(); addCrime(55, 'The crate is hot!'); state.missionStage = 'escape';
      state.target = { x: home.x, y: home.y }; toast('Crate taken! Get Home and lose the heat.', 4);
    } else if (m.id === 'm5' && near(pl.x, pl.y, 36)) {
      audio.pickup(); addCrime(80, 'The big score!'); state.missionStage = 'escape'; state.target = null;
      toast('Case grabbed! Escape: lose all wanted stars.', 4);
    }
  } else if (m && state.missionStage === 'pickup' && m.id === 'm3') {
    const lk = city.places.lookout;
    if (near(lk.x, lk.y, 44)) completeMission();
  } else if (m && state.missionStage === 'escape' && m.id === 'm4') {
    if (near(home.x, home.y, 44) && state.wanted === 0) completeMission();
  }
  // courier depot: accept / deliver
  const depot = city.places.depot;
  if (!state.courier && near(depot.x, depot.y, 36) && state.mode === 'play') {
    if (!state._depotHint || state.time - state._depotHint > 6) { state._depotHint = state.time; toast('Courier Depot: press Enter to take a delivery job.'); }
    if (keys.Enter) startCourier();
  }
  if (state.courier && near(state.courier.x, state.courier.y, 38)) {
    state.cash += state.courier.pay; state.stats.deliveries++; audio.cash(); persist();
    toast(`Delivered! +$${state.courier.pay}`); state.courier = null; state.target = null;
  }
  // cash pickups scattered rarely: a glowing pickup near home respawns
  if (!state.pickup) state.pickup = { x: home.x - 60, y: home.y + 90 };
  if (state.pickup && near(state.pickup.x, state.pickup.y, 24)) {
    state.cash += 25; audio.pickup(); persist(); toast('Found $25 cash.');
    state.pickup = { x: 120 + rand() * (WORLD - 240), y: 120 + rand() * (WORLD - 240) };
  }
}

// ---------- render ----------
function render() {
  const vw = canvas.width, vh = canvas.height;
  const p = state.player;
  if (state.shake > 0) state.shake -= 0.016;
  const shx = state.shake > 0 ? (rand() - 0.5) * 10 : 0, shy = state.shake > 0 ? (rand() - 0.5) * 10 : 0;
  const cam = { x: Math.max(0, Math.min(WORLD - vw, p.x - vw / 2 + shx)), y: Math.max(0, Math.min(WORLD - vh, p.y - vh / 2 + shy)) };
  ctx.fillStyle = '#57a05e'; ctx.fillRect(0, 0, vw, vh);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  drawCity(ctx, city, cam, vw, vh, state.dayFrac);
  // target marker
  if (state.target) {
    const bob = Math.sin(state.time * 4) * 5;
    ctx.fillStyle = '#ffd83d'; ctx.beginPath();
    ctx.moveTo(state.target.x, state.target.y - 26 + bob); ctx.lineTo(state.target.x - 10, state.target.y - 44 + bob); ctx.lineTo(state.target.x + 10, state.target.y - 44 + bob);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,216,61,0.7)'; ctx.beginPath(); ctx.arc(state.target.x, state.target.y, 30 + Math.sin(state.time * 3) * 4, 0, 6.3); ctx.stroke();
  }
  if (state.pickup) {
    ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(state.pickup.x, state.pickup.y, 9 + Math.sin(state.time * 5) * 2, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('$', state.pickup.x, state.pickup.y + 4);
  }
  for (const ped of state.peds) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(ped.x, ped.y + 3, 7, 0, 6.3); ctx.fill();
    ctx.fillStyle = ped.color; ctx.beginPath(); ctx.arc(ped.x, ped.y, 7, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(ped.x, ped.y - 2, 3.6, 0, 6.3); ctx.fill();
    if (ped.scared > 0) { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', ped.x, ped.y - 14); }
  }
  for (const c of state.traffic) if (c !== p.inCar) drawCarShape(ctx, c, c === state.playerCar);
  for (const cop of state.police) drawCarShape(ctx, cop, false);
  if (p.inCar) drawCarShape(ctx, p.inCar, true);
  else {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(p.x, p.y + 4, 10, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#ffdf6b'; ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER.radius, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#2456a6'; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 3, p.y + Math.sin(p.angle) * 3, 3.4, 0, 6.3); ctx.fill();
    if (p.punchT > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16, 6, 0, 6.3); ctx.stroke(); }
  }
  ctx.restore();
  // day-night tint + lamp glow at night
  ctx.fillStyle = skyTint(state.dayFrac); ctx.fillRect(0, 0, vw, vh);
  if (darkness(state.dayFrac) > 0.45 && p.inCar) {
    const g = ctx.createRadialGradient(vw / 2, vh / 2, 40, vw / 2, vh / 2, 300);
    g.addColorStop(0, 'rgba(255,240,180,0.10)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
  }
  drawHUD(vw, vh);
  if (state.mode === 'title') overlay('SOLAR BAY', 'An open-world crime game in a browser city.', 'Press Enter or click to play — WASD move, E enter car, F punch, Shift run.');
  if (state.mode === 'paused') overlay('PAUSED', 'Solar Bay waits for no one. Except now.', 'Press P or Esc to resume.');
  if (state.mode === 'busted') overlay('BUSTED', 'The Solar Bay PD got you. Fine: $50.', 'Press Enter to continue.');
  if (state.mode === 'wasted') overlay('WASTED', 'You woke up at Home, patched up and poorer in pride.', 'Press Enter to continue.');
  if (state.mode === 'complete') overlay('SOLAR BAY IS YOURS', `Story complete. Cash $${state.cash} · Deliveries ${state.stats.deliveries} · Crimes ${state.stats.crimes}`, 'Press Enter to keep cruising — courier jobs still pay.');
  if (state.mode === 'dialogue' && state.dialogue.length) {
    ctx.fillStyle = 'rgba(8,10,16,0.88)'; ctx.fillRect(30, vh - 128, vw - 60, 92);
    ctx.strokeStyle = '#ffd83d'; ctx.strokeRect(30, vh - 128, vw - 60, 92);
    ctx.fillStyle = '#fff'; ctx.font = '19px system-ui'; ctx.textAlign = 'left';
    wrapText(state.dialogue[0], 52, vh - 92, vw - 110, 24);
    ctx.fillStyle = '#ffd83d'; ctx.font = '13px system-ui'; ctx.fillText('Enter / click ▸', vw - 150, vh - 52);
  }
}
function wrapText(text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW) { ctx.fillText(line, x, yy); line = ''; yy += lh; }
    line += w + ' ';
  }
  ctx.fillText(line, x, yy);
}
function overlay(title, sub, hint) {
  const vw = canvas.width, vh = canvas.height;
  ctx.fillStyle = 'rgba(6,10,20,0.72)'; ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd83d'; ctx.font = 'bold 64px system-ui'; ctx.fillText(title, vw / 2, vh / 2 - 40);
  ctx.fillStyle = '#fff'; ctx.font = '20px system-ui'; ctx.fillText(sub, vw / 2, vh / 2 + 6);
  ctx.fillStyle = '#cfd6dd'; ctx.font = '16px system-ui'; ctx.fillText(hint, vw / 2, vh / 2 + 40);
}
function drawHUD(vw, vh) {
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(8,10,16,0.66)'; ctx.fillRect(14, 14, 252, 86);
  ctx.fillStyle = '#2ecc71'; ctx.font = 'bold 24px system-ui'; ctx.fillText('$' + state.cash, 26, 44);
  ctx.fillStyle = '#fff'; ctx.font = '15px system-ui';
  const m = currentMission();
  ctx.fillText(m ? `Mission ${state.missionIndex + 1}/5: ${m.title}` : 'Free roam — Courier Depot pays', 26, 68);
  ctx.fillStyle = '#ff8a80'; ctx.fillRect(26, 78, 110, 8);
  ctx.fillStyle = '#2ecc71'; ctx.fillRect(26, 78, Math.max(0, state.player.health) * 1.1, 8);
  // wanted stars top-right
  ctx.font = '26px system-ui'; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < state.wanted ? '#ffd83d' : 'rgba(255,255,255,0.25)'; ctx.fillText('★', vw - 24 - (4 - i) * 28, 42); }
  const hrs = Math.floor(state.dayFrac * 24), mins = Math.floor((state.dayFrac * 24 % 1) * 60);
  ctx.fillStyle = '#fff'; ctx.font = '14px system-ui';
  ctx.fillText(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}${state.wanted && state.hiddenT > 2 ? ' · hidden ' + Math.max(0, Math.ceil(13 - state.hiddenT)) + 's' : ''}`, vw - 24, 66);
  if (state.bustT > 0.2) { ctx.fillStyle = '#ff5252'; ctx.font = 'bold 18px system-ui'; ctx.fillText('BUSTED…', vw - 24, 92); }
  // objective line bottom-left
  if (state.mode === 'play') {
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(8,10,16,0.6)';
    const obj = state.courier ? `Courier: deliver the package — $${state.courier.pay}` : (m ? m.objective : 'Free roam. Visit the Courier Depot for work.');
    ctx.font = '15px system-ui'; const w = ctx.measureText(obj).width + 24;
    ctx.fillRect(14, vh - 42, w, 28); ctx.fillStyle = '#ffe9a8'; ctx.fillText(obj, 26, vh - 23);
  }
  if (state.msgT > 0 && state.msg) {
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(8,10,16,0.78)';
    ctx.font = 'bold 17px system-ui'; const w = ctx.measureText(state.msg).width + 36;
    ctx.fillRect(vw / 2 - w / 2, 16, w, 34); ctx.fillStyle = '#fff'; ctx.fillText(state.msg, vw / 2, 39);
  }
  statusEl.textContent = `Cash $${state.cash}. Wanted ${state.wanted} stars. ${m ? 'Mission: ' + m.title : 'Free roam.'}`;
}

// screenshot / test hooks: deterministic scenes for ?shot=...
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  state.mode = 'play'; state.missionStage = 'active';
  const pl = city.places.garage; state.target = { x: pl.x, y: pl.y };
  if (shot === 'play' || shot === 'mission') {
    state.player.x = city.places.diner.x - 60; state.player.y = city.places.diner.y + 40;
    state.wanted = 2; state.heat = 45; state.cash = 320;
    state.police.push(makePolice(state.player.x + 150, state.player.y - 90), makePolice(state.player.x - 170, state.player.y + 60));
  }
  if (shot === 'drive') {
    const car = state.playerCar; car.x = city.places.hotel.x; car.y = city.places.hotel.y; car.angle = 0.4; state.player.inCar = car; car.driver = true;
    state.player.x = car.x; state.player.y = car.y; state.cash = 610;
  }
  if (shot === 'night') { state.dayFrac = 0.02; state.player.x = city.places.lookout.x - 40; state.player.y = city.places.lookout.y + 30; state.cash = 940; }
}
window.__SOLAR_BAY__ = { state, startGame, keys };
requestAnimationFrame(frame);
