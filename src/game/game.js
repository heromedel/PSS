import { FIELD } from '../engine/canvas.js';
import { World } from './world.js';

// Step-1 game: starfield, player placeholder with drag/keyboard movement, autofire. Enemies arrive in step 3.
export class Game {
  constructor({ screen, input, bus, rng, seedText, loop }) {
    Object.assign(this, { screen, input, bus, rng, seedText, loop });
    this.world = new World();
    this.player = { x: FIELD.w / 2, y: FIELD.h - 110, r: 18, speed: 520, fireRate: 6, fireAcc: 0, tags: { player: 1 } };
    this.world.add(this.player);
    this.stars = []; const sr = rng.fork();
    for (let i = 0; i < 140; i++) this.stars.push({ x: sr.range(0, FIELD.w), y: sr.range(0, FIELD.h), z: sr.range(0.2, 1) });
    this.debugFlags = { god: false, hitboxes: false, tags: false };
    bus.on('debug.flag', ({ flag, on }) => { this.debugFlags[flag] = on; });
    bus.emit('game.start', { seed: seedText, field: `${FIELD.w}x${FIELD.h}` });
  }

  update(dt) {
    const p = this.player, inp = this.input;
    // movement: drag-relative (touch) + keyboard
    const d = inp.consumeDrag();
    const k = inp.keyAxis();
    p.x += d.x + k.x * p.speed * dt;
    p.y += d.y + k.y * p.speed * dt;
    p.x = Math.max(p.r, Math.min(FIELD.w - p.r, p.x));
    p.y = Math.max(p.r, Math.min(FIELD.h - p.r, p.y));

    // autofire
    p.fireAcc += dt;
    const interval = 1 / p.fireRate;
    while (p.fireAcc >= interval) { p.fireAcc -= interval; this.spawnBullet(p.x, p.y - p.r, 0, -900); }

    // bullets
    for (const b of this.world.withTag('bullet')) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -20 || b.y > FIELD.h + 20 || b.x < -20 || b.x > FIELD.w + 20) this.world.remove(b);
    }

    // starfield scrolls downward (world moves past the player)
    for (const s of this.stars) { s.y += (60 + 260 * s.z) * dt; if (s.y > FIELD.h) { s.y -= FIELD.h; s.x = this.rng.range(0, FIELD.w); } }

    for (const t of inp.consumeTaps()) this.bus.emit('input.tap', { x: t.x, y: t.y, secondary: t.secondary });
  }

  spawnBullet(x, y, vx, vy) { this.world.add({ x, y, vx, vy, r: 3, tags: { bullet: 1, friendly: 1 } }); }

  render() {
    const c = this.screen.begin();
    // background
    c.fillStyle = '#05060a'; c.fillRect(0, 0, FIELD.w, FIELD.h);
    for (const s of this.stars) { c.fillStyle = `rgba(180,200,255,${0.25 + 0.6 * s.z})`; c.fillRect(s.x, s.y, 1 + s.z * 1.5, 1 + s.z * 3); }
    // slipstream zone marker (placeholder, step 6 makes it functional)
    c.strokeStyle = 'rgba(80,200,255,0.25)'; c.lineWidth = 2; c.setLineDash([8, 10]);
    c.strokeRect(FIELD.w / 2 - 90, FIELD.h - 46, 180, 40); c.setLineDash([]);
    // bullets
    c.fillStyle = '#9ff';
    for (const b of this.world.withTag('bullet')) c.fillRect(b.x - 2, b.y - 8, 4, 14);
    // player placeholder
    const p = this.player;
    c.save(); c.translate(p.x, p.y);
    c.fillStyle = '#4fd1c5'; c.beginPath(); c.moveTo(0, -22); c.lineTo(16, 16); c.lineTo(0, 8); c.lineTo(-16, 16); c.closePath(); c.fill();
    c.restore();
    if (this.debugFlags.hitboxes) { c.strokeStyle = '#f66'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke(); }
    // HUD side panels (placeholders for wave counter etc.)
    c.fillStyle = 'rgba(150,180,220,0.5)'; c.font = '14px ui-monospace, monospace';
    c.fillText('PSS v0.1', 14, 24); c.fillText('seed ' + this.seedText, 14, 44);
  }
}
