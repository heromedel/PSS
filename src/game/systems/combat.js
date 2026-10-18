// Collision and damage. Bullets hit the first thing in priority order: active shield bubble, then the nearest
// overlapping component (armor only from inside its block arc), then the base. Component damage transfers a
// fraction to the base. A destroyed base sheds its surviving components as debris.
import { FIELD } from '../../engine/canvas.js';
import { removeShip } from '../ships.js';

export const COMBAT = { transfer: 0.25, debrisFall: 55, debrisLife: 14, respawnDelay: 1.5, invulnTime: 2.5 };

export function initShield(ship) {
  const gen = ship.children.find(k => k.tags.slot === 'shield');
  if (!gen) { ship.shield = null; return; }
  ship.shield = { gen, up: true, timer: 0, radius: ship.r * (gen.tags.radiusMult || 1.3) };
}

export function updateCombat(game, dt) {
  const world = game.world, bus = game.bus;
  const ships = [...world.withTag('ship')];
  for (const s of ships) {
    if (s.flash > 0) s.flash -= dt; if (s.invuln > 0) s.invuln -= dt;
    for (const k of s.children) if (k.flash > 0) k.flash -= dt;
    if (s.shield && !s.children.includes(s.shield.gen)) s.shield = null; // generator shot off
    if (s.shield && !s.shield.up) { s.shield.timer -= dt; if (s.shield.timer <= 0) { s.shield.up = true; bus.emit('shield.up', { id: s.id }, { quiet: true }); } }
  }
  for (const b of [...world.withTag('bullet')]) {
    for (const s of ships) {
      if (!world.entities.has(s.id) || s.tags.faction === b.tags.faction) continue;
      if (s.invuln > 0) continue;
      const hit = resolveHit(b, s);
      if (!hit) continue;
      world.remove(b);
      applyHit(game, s, hit, b);
      break;
    }
  }
  // debris drifts down and expires
  for (const d of [...world.withTag('debris')]) {
    d.vy += 20 * dt; d.y += d.vy * dt; d.x += d.vx * dt; d.spin += d.spinV * dt; d.life -= dt;
    if (d.y > FIELD.h + 40 || d.life <= 0) { world.remove(d); bus.emit('debris.lost', { comp: d.tags.comp }, { quiet: true }); }
  }
}

function resolveHit(b, s) {
  const dShip = Math.hypot(b.x - s.x, b.y - s.y);
  if (s.shield && s.shield.up && dShip <= s.shield.radius + b.r) return { kind: 'shield' };
  if (dShip > s.r + 40 + b.r) return null; // broad phase: components sit within ~40 of the hull centre at most sizes
  let best = null, bestD = Infinity;
  for (const k of s.children) {
    if (k.tags.slot === 'augment') continue; // no hitbox
    const dk = Math.hypot(b.x - k.x, b.y - k.y);
    if (dk > k.r + b.r) continue;
    if (k.tags.slot === 'armor' && !inBlockArc(b, s, k)) continue;
    if (dk < bestD) { bestD = dk; best = k; }
  }
  if (best) return { kind: 'component', comp: best };
  if (dShip <= s.r + b.r) return { kind: 'base' };
  return null;
}
// armor blocks shots arriving from the direction it faces (ship forward, with the arc centred on it)
function inBlockArc(b, s, k) {
  const fx = Math.sin(s.heading), fy = -Math.cos(s.heading);
  const sp = Math.hypot(b.vx, b.vy) || 1; const ix = -b.vx / sp, iy = -b.vy / sp; // direction the shot came from
  const cos = fx * ix + fy * iy; const half = ((k.tags.blockArcDeg || 120) / 2) * Math.PI / 180;
  return cos >= Math.cos(half);
}

function applyHit(game, s, hit, b) {
  const bus = game.bus, dmg = b.tags.damage || 0, god = s.tags.player && game.debugFlags.god;
  if (hit.kind === 'shield') {
    s.shield.up = false; s.shield.timer = s.shield.gen.tags.recharge || 5;
    bus.emit('shield.hit', { id: s.id, absorbed: dmg }, { quiet: true }); return;
  }
  if (god) { s.flash = 0.05; return; }
  if (hit.kind === 'component') {
    const k = hit.comp; k.tags.durability -= dmg; k.flash = 0.08;
    const transfer = dmg * COMBAT.transfer; s.tags.durability -= transfer;
    bus.emit('hit', { ship: s.id, comp: k.tags.comp, dmg, transfer: +transfer.toFixed(1), left: Math.max(0, +k.tags.durability.toFixed(1)) }, { quiet: true });
    if (k.tags.durability <= 0) destroyComponent(game, s, k);
  } else {
    s.tags.durability -= dmg; s.flash = 0.08;
    bus.emit('hit', { ship: s.id, comp: 'base', dmg, left: Math.max(0, +s.tags.durability.toFixed(1)) }, { quiet: true });
  }
  if (s.tags.durability <= 0) destroyShip(game, s);
}

export function destroyComponent(game, s, k) {
  const i = s.children.indexOf(k); if (i >= 0) s.children.splice(i, 1);
  game.world.remove(k);
  game.bus.emit('component.destroyed', { ship: s.id, comp: k.tags.comp, slot: k.tags.slot });
  if (k.tags.slot === 'weapon' && k.tags.pair) { // surviving twin of a doubled weapon regains full damage
    const twin = s.children.find(o => o.tags.node === k.tags.node && o.tags.slot === 'weapon'); if (twin) twin.tags.damage *= 2;
  }
}

export function destroyShip(game, s) {
  const world = game.world, bus = game.bus;
  if (s.tags.player) { bus.emit('player.death', { x: +s.x.toFixed(0), y: +s.y.toFixed(0) }); game.onPlayerDeath(); return; }
  for (const k of s.children) {
    if (k.tags.slot === 'augment' || k.tags.slot === 'drop') continue; // intangible parts do not survive as debris in v0
    world.add({ x: k.x, y: k.y, vx: s.rng.range(-25, 25), vy: s.rng.range(-20, 20), spin: k.heading, spinV: s.rng.range(-1.5, 1.5),
      life: COMBAT.debrisLife, r: Math.max(k.r, 12), def: k.def, mirrored: k.mirrored, scale: s.compScale,
      tags: { debris: 1, comp: k.tags.comp, slot: k.tags.slot, durability: k.tags.durability, maxDurability: k.tags.maxDurability } });
  }
  bus.emit('ship.destroyed', { id: s.id, base: s.tags.base, debris: s.children.filter(k => k.tags.slot !== 'augment' && k.tags.slot !== 'drop').length, boss: s.tags.boss });
  s.children.length = 0; removeShip(world, s);
}

export function drawDebris(c, d) {
  c.save(); c.translate(d.x, d.y); c.rotate(d.spin); c.scale(d.mirrored ? -d.scale : d.scale, d.scale);
  c.globalAlpha = d.life < 2 ? Math.max(0.15, d.life / 2) : 0.85;
  c.fillStyle = '#b8c4d4'; c.strokeStyle = '#eef'; c.lineWidth = 1 / d.scale;
  const pts = d.def.shape; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
