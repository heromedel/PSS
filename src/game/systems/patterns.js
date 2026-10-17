// Wing movement patterns. Each pattern is {init(ship, ctx), update(ship, dt, ctx) -> true when its cycle completes}.
// Ships cycle through their wing steps in node order; the next pattern starts from wherever the ship is.
import { FIELD } from '../../engine/canvas.js';

const MARGIN = 50;
function moveToward(ship, tx, ty, speed, dt) {
  const dx = tx - ship.x, dy = ty - ship.y, d = Math.hypot(dx, dy);
  if (d <= speed * dt) { ship.x = tx; ship.y = ty; return true; }
  ship.x += dx / d * speed * dt; ship.y += dy / d * speed * dt; return false;
}
function holdY(ship, ctx) { if (ship.holdY == null) ship.holdY = ctx.rng.range(110, 260); return ship.holdY; }
function reenterTop(ship, ctx) { ship.x = ctx.rng.range(MARGIN + 60, FIELD.w - MARGIN - 60); ship.y = -ship.r - 30; }

export const PATTERNS = {
  // hold a row and strafe side to side; cycle = one full out-and-back pass
  hold_strafe: {
    init(ship, ctx) { ship.p = { phase: 'enter', dir: ctx.rng.chance(0.5) ? 1 : -1, turns: 0 }; },
    update(ship, dt, ctx) {
      const sp = ctx.speed, p = ship.p, hy = holdY(ship, ctx);
      if (p.phase === 'enter') { if (moveToward(ship, ship.x, hy, sp, dt)) p.phase = 'strafe'; return false; }
      ship.x += p.dir * sp * dt;
      if (ship.x > FIELD.w - MARGIN - ship.r) { ship.x = FIELD.w - MARGIN - ship.r; p.dir = -1; p.turns++; }
      if (ship.x < MARGIN + ship.r) { ship.x = MARGIN + ship.r; p.dir = 1; p.turns++; }
      if (p.turns >= 2) { p.turns = 0; return true; }
      return false;
    },
  },
  // slide sideways until over the player, brief lift (tell), rush down, re-enter from the top
  dive: {
    init(ship, ctx) { ship.p = { phase: ship.y < 0 ? 'enter' : 'align', t: 0 }; },
    update(ship, dt, ctx) {
      const sp = ctx.speed, p = ship.p, hy = holdY(ship, ctx), player = ctx.player;
      switch (p.phase) {
        case 'enter': if (moveToward(ship, ship.x, hy, sp, dt)) p.phase = 'align'; return false;
        case 'align': {
          const dx = player.x - ship.x;
          if (Math.abs(dx) < 16) { p.phase = 'tell'; p.t = 0; p.y0 = ship.y; ctx.bus.emit('pattern.tell', { id: ship.id, kind: 'brieflift' }, { quiet: true }); }
          else ship.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt);
          return false;
        }
        case 'tell': p.t += dt; ship.y = p.y0 - 28 * Math.sin(Math.min(1, p.t / 0.35) * Math.PI); if (p.t >= 0.35) { p.phase = 'dive'; ship.y = p.y0; } return false;
        case 'dive': ship.y += sp * 3.2 * dt; if (ship.y > FIELD.h + ship.r + 20) { reenterTop(ship, ctx); p.phase = 'return'; } return false;
        case 'return': if (moveToward(ship, ship.x, hy, sp, dt)) { p.phase = 'align'; return true; } return false;
      }
      return false;
    },
  },
  // cross the field on a sine wave, exit the far side, re-enter from the top
  sweep: {
    init(ship, ctx) {
      const dir = ship.x < FIELD.w / 2 ? 1 : -1;
      ship.p = { phase: ship.y < 0 ? 'enter' : 'sweep', dir, t: 0, baseY: holdY(ship, ctx) + 40, amp: ctx.rng.range(40, 90) };
    },
    update(ship, dt, ctx) {
      const sp = ctx.speed, p = ship.p;
      if (p.phase === 'enter') { if (moveToward(ship, ship.x, p.baseY, sp, dt)) { p.phase = 'sweep'; p.t = 0; } return false; }
      p.t += dt; ship.x += p.dir * sp * dt; ship.y = p.baseY + Math.sin(p.t * 2.2) * p.amp;
      if ((p.dir > 0 && ship.x > FIELD.w + ship.r + 20) || (p.dir < 0 && ship.x < -ship.r - 20)) {
        reenterTop(ship, ctx); p.dir = ship.x < FIELD.w / 2 ? 1 : -1; p.phase = 'enter'; p.baseY = holdY(ship, ctx) + 40; return true;
      }
      return false;
    },
  },
};
