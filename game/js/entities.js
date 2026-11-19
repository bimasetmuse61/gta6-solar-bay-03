// Traffic cars, pedestrians and police: spawning and per-frame updates.
// Traffic follows the road grid lane by lane and turns at intersections;
// pedestrians stroll along sidewalks; police home in on the player.
import { BLOCKS, PITCH, ROAD, WORLD, PALETTE, CAR } from './config.js';
import { roadCenter, buildingAt, clampWorld } from './world.js';

let idSeq = 1;
function laneOffset(dir) { return dir > 0 ? ROAD * 0.26 : -ROAD * 0.26; }

export function makeTrafficCar(rand) {
  // pick a road (vertical or horizontal) and a direction, sit in the right lane
  const vertical = rand() > 0.5;
  const roadIdx = Math.floor(rand() * (BLOCKS + 1));
  const dir = rand() > 0.5 ? 1 : -1;
  const along = rand() * WORLD;
  const c = roadCenter(roadIdx);
  const car = {
    id: idSeq++, kind: 'traffic', vertical, dir,
    x: vertical ? c + laneOffset(dir) : along,
    y: vertical ? along : c - laneOffset(dir),
    angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
    speed: 90 + rand() * 70, color: PALETTE.car[Math.floor(rand() * PALETTE.car.length)],
    health: 60, driver: true,
  };
  // for horizontal roads the lane side flips with the y axis; store lane centre
  car.roadIdx = roadIdx;
  return car;
}

export function updateTraffic(car, dt, rand) {
  const dist = car.speed * dt;
  if (car.vertical) car.y += car.dir * dist; else car.x += car.dir * dist;
  // turn chance at each intersection crossing
  const along = car.vertical ? car.y : car.x;
  const nearCross = Math.abs(((along % PITCH) + PITCH) % PITCH - ROAD / 2) < dist;
  if (nearCross && rand() < 0.35) {
    const crossIdx = Math.round((along - ROAD / 2) / PITCH);
    if (crossIdx >= 0 && crossIdx <= BLOCKS) {
      const c = roadCenter(crossIdx), centre = roadCenter(car.roadIdx);
      const ndir = rand() > 0.5 ? 1 : -1;
      if (car.vertical) { car.x = centre + laneOffset(car.dir); car.y = c; car.vertical = false; car.dir = ndir; car.roadIdx = crossIdx; car.angle = ndir > 0 ? 0 : Math.PI; car.x += ndir * 2; }
      else { car.y = centre - laneOffset(car.dir); car.x = c; car.vertical = true; car.dir = ndir; car.roadIdx = crossIdx; car.angle = ndir > 0 ? Math.PI / 2 : -Math.PI / 2; car.y += ndir * 2; }
    }
  }
  if (car.x < -60) car.x = WORLD + 40; if (car.x > WORLD + 60) car.x = -40;
  if (car.y < -60) car.y = WORLD + 40; if (car.y > WORLD + 60) car.y = -40;
  if (car.vertical) car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  else car.angle = car.dir > 0 ? 0 : Math.PI;
}

export function makePedestrian(rand) {
  const vertical = rand() > 0.5;
  const roadIdx = Math.floor(rand() * (BLOCKS + 1));
  const side = rand() > 0.5 ? 1 : -1;
  const c = roadCenter(roadIdx) + side * (ROAD / 2 + 7);
  const along = rand() * WORLD;
  return {
    id: idSeq++, x: vertical ? c : along, y: vertical ? along : c,
    vertical, dir: rand() > 0.5 ? 1 : -1, roadIdx, side,
    speed: 34 + rand() * 30, color: PALETTE.car[Math.floor(rand() * PALETTE.car.length)],
    scared: 0, phase: rand() * 6.28,
  };
}

export function updatePedestrian(p, dt, threat) {
  if (threat && Math.hypot(p.x - threat.x, p.y - threat.y) < 90) p.scared = 1.2;
  if (p.scared > 0) p.scared -= dt;
  const sp = p.speed * (p.scared > 0 ? 2.6 : 1);
  if (p.vertical) p.y += p.dir * sp * dt; else p.x += p.dir * sp * dt;
  if (p.x < 8 || p.x > WORLD - 8) { p.dir *= -1; p.x = clampWorld(p.x); }
  if (p.y < 8 || p.y > WORLD - 8) { p.dir *= -1; p.y = clampWorld(p.y); }
  p.phase += dt * (p.scared > 0 ? 10 : 5);
}

export function makePolice(x, y) {
  return { id: idSeq++, kind: 'police', x, y, angle: 0, speed: 0, color: PALETTE.police, health: 120, sirenPhase: Math.random() * 6 };
}
export function updatePolice(cop, dt, target, city) {
  const dx = target.x - cop.x, dy = target.y - cop.y;
  const dist = Math.hypot(dx, dy) || 1;
  const want = Math.atan2(dy, dx);
  let diff = want - cop.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  cop.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  const top = target.inCar ? 300 : 215;
  cop.speed += ((dist > 46 ? top : top * 0.25) - cop.speed) * Math.min(1, dt * 1.6);
  cop.x += Math.cos(cop.angle) * cop.speed * dt;
  cop.y += Math.sin(cop.angle) * cop.speed * dt;
  if (buildingAt(city, cop.x, cop.y, 6)) { cop.x -= Math.cos(cop.angle) * cop.speed * dt * 1.4; cop.y -= Math.sin(cop.angle) * cop.speed * dt * 1.4; cop.angle += 0.7; }
  cop.x = clampWorld(cop.x); cop.y = clampWorld(cop.y);
  cop.sirenPhase += dt * 9;
  return dist;
}
export function drawCarShape(ctx, car, isPlayerCar) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-CAR.length / 2 + 2, -CAR.width / 2 + 3, CAR.length, CAR.width);
  ctx.fillStyle = car.kind === 'police' ? PALETTE.police : car.color;
  ctx.beginPath(); ctx.roundRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 6); ctx.fill();
  if (car.kind === 'police') { ctx.fillStyle = PALETTE.policeTrim; ctx.fillRect(-6, -CAR.width / 2, 14, CAR.width); }
  ctx.fillStyle = '#20303c'; ctx.fillRect(-4, -CAR.width / 2 + 3, 12, CAR.width - 6);
  ctx.fillStyle = '#ffd76a'; ctx.fillRect(CAR.length / 2 - 3, -CAR.width / 2 + 2, 3, 5); ctx.fillRect(CAR.length / 2 - 3, CAR.width / 2 - 7, 3, 5);
  if (car.kind === 'police') {
    const on = Math.sin(car.sirenPhase) > 0;
    ctx.fillStyle = on ? '#ff4444' : '#4466ff'; ctx.beginPath(); ctx.arc(1, 0, 4.5, 0, 6.3); ctx.fill();
  }
  if (isPlayerCar) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -CAR.width); ctx.lineTo(6, -CAR.width + 8); ctx.lineTo(-6, -CAR.width + 8); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
