import { FIELD } from '../engine/canvas.js';
import { World } from './world.js';
import { assembleShip, syncChildren, drawShip, removeShip, activeWing, shipSpeed } from './ships.js';
import { PATTERNS } from './systems/patterns.js';
import { updateWeapons } from './systems/weapons.js';
import { BASES } from '../content/bases.js';
import { updateCombat, initShield, drawDebris, COMBAT } from './systems/combat.js';
import { Recorder } from '../debug/recorder.js';

export const STARTER_BUILD = { wingA: 'wing_starter', gun: 'weapon_starter', bay: 'util_salvage_bay' };
export const EXAMPLE_BUILDS = {
  piranha: { wingA: 'wing_diver', gun: 'weapon_pebble' },
  mantis: { wingA: 'wing_hover', gunA: 'weapon_slant', nose: 'armor_nose_plate', gen: 'shield_bubble' },
  drone_pod: { rocket: 'wing_sweep', gun: 'weapon_fan', drop: 'drop_basic' },
};

export class Game {
  constructor({ screen, input, bus, rng, seedText, loop }) {
    Object.assign(this, { screen, input, bus, rng, seedText, loop });
    this.world = new World();
    this.playerBuild = { ...STARTER_BUILD }; this.playerRng = rng.fork();
    this.spawnPlayer();
    this.respawnTimer = 0; this.deaths = 0;
    this.recorder = new Recorder(this);
    this.stars = []; const sr = rng.fork();
    for (let i = 0; i < 140; i++) this.stars.push({ x: sr.range(0, FIELD.w), y: sr.range(0, FIELD.h), z: sr.range(0.2, 1) });
    this.debugFlags = { god: false, hitboxes: false, tags: false, enemyFire: true };
    this.inspected = null;
    bus.on('debug.flag', ({ flag, on }) => { this.debugFlags[flag] = on; if (flag === 'tags' && !on) this.inspected = null; });
    bus.emit('game.start', { seed: seedText, field: `${FIELD.w}x${FIELD.h}` });
  }

  spawnPlayer() {
    this.player = assembleShip(this.world, 'starter_hull', this.playerBuild, { x: FIELD.w / 2, y: FIELD.h - 110, heading: 0, rng: this.playerRng });
    this.player.tags.player = 1; this.player.invuln = COMBAT.invulnTime; initShield(this.player);
  }
  onPlayerDeath() { this.deaths++; this.player.dead = true; this.respawnTimer = COMBAT.respawnDelay; }

  // inputs for this tick: live, or from a replay
  gatherInput() {
    const rep = this.recorder.inputsFor(this.loop.tick); if (rep) return rep;
    const d = this.input.consumeDrag(), k = this.input.keyAxis();
    const inp = { dx: d.x, dy: d.y, kx: k.x, ky: k.y, taps: this.input.consumeTaps() };
    this.recorder.record(this.loop.tick, inp); return inp;
  }

  update(dt) {
    const inp = this.gatherInput();
    let p = this.player;
    if (p.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) { this.spawnPlayer(); p = this.player; this.bus.emit('player.respawn', { deaths: this.deaths }); }
    }
    if (!p.dead) {
      const sp = shipSpeed(p);
      p.x += inp.dx + inp.kx * sp * dt; p.y += inp.dy + inp.ky * sp * dt;
      p.x = Math.max(p.r, Math.min(FIELD.w - p.r, p.x)); p.y = Math.max(p.r, Math.min(FIELD.h - p.r, p.y));
      syncChildren(p);
      updateWeapons(this, p, dt);
    }

    for (const s of this.world.withTag('ship')) {
      if (s === p) continue;
      this.updateEnemy(s, dt);
    }

    for (const b of this.world.withTag('bullet')) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -20 || b.y > FIELD.h + 20 || b.x < -20 || b.x > FIELD.w + 20) this.world.remove(b);
    }
    updateCombat(this, dt);
    for (const s of this.stars) { s.y += (60 + 260 * s.z) * dt; if (s.y > FIELD.h) { s.y -= FIELD.h; s.x = this.rng.range(0, FIELD.w); } }

    for (const t of inp.taps) {
      if (this.debugFlags.tags) { this.inspected = this.pickAt(t.x, t.y); this.bus.emit('debug.inspect', { id: this.inspected?.id, what: this.inspected?.tags.comp || this.inspected?.tags.base }); continue; }
      this.bus.emit('input.tap', { x: t.x, y: t.y, secondary: t.secondary });
    }
  }

  updateEnemy(s, dt) {
    if (!this.world.entities.has(s.id)) return;
    const wing = activeWing(s);
    const ctx = { player: this.player, rng: s.rng, bus: this.bus, speed: shipSpeed(s) };
    if (wing) {
      const pat = PATTERNS[wing.tags.pattern];
      if (s.patternOf !== wing) { s.patternOf = wing; pat.init(s, ctx); }
      if (pat.update(s, dt, ctx)) {
        if (s.wingSteps.length > 1) { s.stepIndex = (s.stepIndex + 1) % s.wingSteps.length; this.bus.emit('pattern.step', { id: s.id, step: s.stepIndex, pattern: activeWing(s).tags.pattern }); }
      }
    } else { s.y += 60 * dt; if (s.y > FIELD.h + s.r + 40) s.y = -s.r - 20; } // wingless: drift down
    syncChildren(s);
    const onScreen = s.y > 0 && s.y < FIELD.h && s.x > 0 && s.x < FIELD.w;
    updateWeapons(this, s, dt, { enabled: onScreen && this.debugFlags.enemyFire });
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

  spawnBullet(x, y, vx, vy, damage, faction, extra = {}) { this.world.add({ x, y, vx, vy, r: 3, tags: { bullet: 1, faction, damage, ...extra } }); }

  // spawn an enemy from a base id and build map; enters from the top at a random x
  spawnEnemy(baseId, build, opts = {}) {
    const x = opts.x ?? this.rng.range(160, FIELD.w - 160), y = opts.y ?? -60;
    const s = assembleShip(this.world, baseId, build, { x, y, heading: Math.PI, rng: this.rng.fork() });
    initShield(s);
    this.bus.emit('spawn', { base: baseId, id: s.id, parts: s.children.length, dur: s.tags.durability, size: +s.baseSize.toFixed(2) });
    return s;
  }
  spawnTestShip(baseId = 'piranha', build) { return this.runCommand('spawn', { base: baseId, build: build || EXAMPLE_BUILDS[baseId] || {} }); }
  clearEnemies() { return this.runCommand('clear', {}); }
  // admin commands are recorded so a replay reproduces them at the same tick
  runCommand(name, args, { fromReplay = false } = {}) {
    if (!fromReplay) this.recorder.command(this.loop.tick, name, args);
    switch (name) {
      case 'spawn': return this.spawnEnemy(args.base, args.build, args.opts || {});
      case 'clear': for (const s of [...this.world.withTag('ship')]) if (s !== this.player) removeShip(this.world, s); for (const b of [...this.world.withTag('bullet')]) this.world.remove(b); for (const d of [...this.world.withTag('debris')]) this.world.remove(d); return;
      case 'flag': this.debugFlags[args.flag] = args.on; return;
    }
  }

  render() {
    const c = this.screen.begin();
    c.fillStyle = '#05060a'; c.fillRect(0, 0, FIELD.w, FIELD.h);
    for (const s of this.stars) { c.fillStyle = `rgba(180,200,255,${0.25 + 0.6 * s.z})`; c.fillRect(s.x, s.y, 1 + s.z * 1.5, 1 + s.z * 3); }
    c.strokeStyle = 'rgba(80,200,255,0.25)'; c.lineWidth = 2; c.setLineDash([8, 10]);
    c.strokeRect(FIELD.w / 2 - 90, FIELD.h - 46, 180, 40); c.setLineDash([]);
    for (const b of this.world.withTag('bullet')) {
      if (b.tags.faction === 'player') { c.fillStyle = '#9ff'; c.fillRect(b.x - 2, b.y - 8, 4, 14); }
      else { c.fillStyle = '#ff7b7b'; c.beginPath(); c.arc(b.x, b.y, 4, 0, Math.PI * 2); c.fill(); }
    }
    for (const d of this.world.withTag('debris')) drawDebris(c, d);
    for (const s of this.world.withTag('ship')) drawShip(c, s, this.debugFlags);
    // player hull bar
    const p = this.player;
    if (!p.dead) {
      const w = 160, hp = Math.max(0, p.tags.durability / p.tags.maxDurability);
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(14, FIELD.h - 30, w, 10);
      c.fillStyle = hp > 0.5 ? '#4fd1c5' : hp > 0.25 ? '#f0a84a' : '#ff6b6b'; c.fillRect(14, FIELD.h - 30, w * hp, 10);
      c.fillStyle = 'rgba(150,180,220,0.7)'; c.font = '12px ui-monospace, monospace'; c.fillText(`hull ${Math.max(0, p.tags.durability | 0)}/${p.tags.maxDurability}`, 14, FIELD.h - 36);
    } else { c.fillStyle = '#ff6b6b'; c.font = '20px ui-monospace, monospace'; c.fillText('destroyed', FIELD.w / 2 - 50, FIELD.h / 2); }
    if (this.recorder.replay) { c.fillStyle = '#ff0'; c.font = '14px ui-monospace, monospace'; c.fillText('REPLAY', FIELD.w / 2 - 24, 24); }
    if (this.inspected && this.world.entities.has(this.inspected.id)) {
      const e = this.inspected; c.strokeStyle = '#ff0'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, Math.max(e.r, 14) + 4, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = 'rgba(150,180,220,0.5)'; c.font = '14px ui-monospace, monospace';
    c.fillText('PSS v0.4', 14, 24); c.fillText('seed ' + this.seedText, 14, 44);
  }
}
