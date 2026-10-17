import { FIELD } from '../engine/canvas.js';
import { World } from './world.js';
import { assembleShip, syncChildren, drawShip, removeShip } from './ships.js';

export const STARTER_BUILD = { wingA: 'wing_starter', gun: 'weapon_starter', bay: 'util_salvage_bay' };

export class Game {
  constructor({ screen, input, bus, rng, seedText, loop }) {
    Object.assign(this, { screen, input, bus, rng, seedText, loop });
    this.world = new World();
    this.player = assembleShip(this.world, 'starter_hull', STARTER_BUILD, { x: FIELD.w / 2, y: FIELD.h - 110, heading: 0 });
    this.player.tags.player = 1; this.player.fireAcc = 0;
    this.stars = []; const sr = rng.fork();
    for (let i = 0; i < 140; i++) this.stars.push({ x: sr.range(0, FIELD.w), y: sr.range(0, FIELD.h), z: sr.range(0.2, 1) });
    this.debugFlags = { god: false, hitboxes: false, tags: false };
    this.inspected = null;
    bus.on('debug.flag', ({ flag, on }) => { this.debugFlags[flag] = on; if (flag === 'tags' && !on) this.inspected = null; });
    bus.emit('game.start', { seed: seedText, field: `${FIELD.w}x${FIELD.h}` });
  }

  // derived stats from components
  playerSpeed() { let s = 0; for (const k of this.player.children) if (k.tags.slot === 'wing') s = Math.max(s, k.tags.speed || 0); return s || 300; }

  update(dt) {
    const p = this.player, inp = this.input;
    const d = inp.consumeDrag(), k = inp.keyAxis(), sp = this.playerSpeed();
    p.x += d.x + k.x * sp * dt; p.y += d.y + k.y * sp * dt;
    p.x = Math.max(p.r, Math.min(FIELD.w - p.r, p.x)); p.y = Math.max(p.r, Math.min(FIELD.h - p.r, p.y));
    syncChildren(p);

    // autofire from each weapon component
    for (const w of p.children) {
      if (w.tags.slot !== 'weapon') continue;
      w.fireAcc = (w.fireAcc || 0) + dt; const interval = 1 / w.tags.fireRate;
      while (w.fireAcc >= interval) { w.fireAcc -= interval; this.spawnBullet(w.x, w.y - 10, 0, -w.tags.velocity, w.tags.damage, 'player'); }
    }

    for (const b of this.world.withTag('bullet')) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -20 || b.y > FIELD.h + 20 || b.x < -20 || b.x > FIELD.w + 20) this.world.remove(b);
    }
    for (const s of this.stars) { s.y += (60 + 260 * s.z) * dt; if (s.y > FIELD.h) { s.y -= FIELD.h; s.x = this.rng.range(0, FIELD.w); } }

    for (const t of inp.consumeTaps()) {
      if (this.debugFlags.tags) { this.inspected = this.pickAt(t.x, t.y); this.bus.emit('debug.inspect', { id: this.inspected?.id, what: this.inspected?.tags.comp || this.inspected?.tags.base }); continue; }
      this.bus.emit('input.tap', { x: t.x, y: t.y, secondary: t.secondary });
    }
  }

  // nearest entity by distance relative to its radius wins, so components can be picked over their base
  pickAt(x, y) {
    let best = null, bestScore = Infinity;
    for (const e of this.world.all()) {
      if (e.r == null || e.tags.bullet) continue;
      const rr = Math.max(e.r, 14), dd = Math.hypot(e.x - x, e.y - y);
      if (dd > rr) continue;
      const score = dd / rr; if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  spawnBullet(x, y, vx, vy, damage, faction) { this.world.add({ x, y, vx, vy, r: 3, tags: { bullet: 1, faction, damage } }); }

  // admin: drop an example enemy on the field (stationary until wings get patterns in step 3)
  spawnTestShip(baseId = 'piranha', build = { wingA: 'wing_diver', gun: 'weapon_pebble', aug: 'aug_shield_bubble' }) {
    const s = assembleShip(this.world, baseId, build, { x: this.rng.range(200, FIELD.w - 200), y: this.rng.range(120, 300), heading: Math.PI });
    this.bus.emit('spawn', { base: baseId, id: s.id, parts: s.children.length });
    return s;
  }
  clearEnemies() { for (const s of [...this.world.withTag('ship')]) if (s !== this.player) removeShip(this.world, s); }

  render() {
    const c = this.screen.begin();
    c.fillStyle = '#05060a'; c.fillRect(0, 0, FIELD.w, FIELD.h);
    for (const s of this.stars) { c.fillStyle = `rgba(180,200,255,${0.25 + 0.6 * s.z})`; c.fillRect(s.x, s.y, 1 + s.z * 1.5, 1 + s.z * 3); }
    c.strokeStyle = 'rgba(80,200,255,0.25)'; c.lineWidth = 2; c.setLineDash([8, 10]);
    c.strokeRect(FIELD.w / 2 - 90, FIELD.h - 46, 180, 40); c.setLineDash([]);
    c.fillStyle = '#9ff';
    for (const b of this.world.withTag('bullet')) c.fillRect(b.x - 2, b.y - 8, 4, 14);
    for (const s of this.world.withTag('ship')) drawShip(c, s, this.debugFlags);
    if (this.inspected && this.world.entities.has(this.inspected.id)) {
      const e = this.inspected; c.strokeStyle = '#ff0'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, Math.max(e.r, 14) + 4, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = 'rgba(150,180,220,0.5)'; c.font = '14px ui-monospace, monospace';
    c.fillText('PSS v0.2', 14, 24); c.fillText('seed ' + this.seedText, 14, 44);
  }
}
