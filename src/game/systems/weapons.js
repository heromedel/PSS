// Fire patterns. Forward vector for heading h is (sin h, -cos h): heading 0 fires up, PI fires down.
export function fireWeapon(game, ship, w) {
  const t = w.tags, h = ship.heading, muzzle = 10 * ship.compScale;
  const fx = Math.sin(h), fy = -Math.cos(h);
  const x = w.x + fx * muzzle, y = w.y + fy * muzzle;
  const shots = [];
  if (t.fire === 'spread') {
    const n = t.count || 3, step = (t.spreadDeg || 20) * Math.PI / 180;
    for (let i = 0; i < n; i++) shots.push(h + (i - (n - 1) / 2) * step);
  } else if (t.fire === 'diagonal') {
    const a = (t.angleDeg || 35) * Math.PI / 180;
    // a mirrored weapon leans outward: left copy fires left, right copy fires right; a single one fires both ways
    if (w.tags.pair) shots.push(h + (w.mirrored ? a : -a)); else shots.push(h - a, h + a);
  } else shots.push(h);
  for (const a of shots) game.spawnBullet(x, y, Math.sin(a) * t.velocity, -Math.cos(a) * t.velocity, t.damage, ship.tags.faction, { bypass: t.bypass || 0, owner: w.id });
}
// Advance a ship's weapons by dt; fires whenever a weapon's accumulator crosses its interval.
export function updateWeapons(game, ship, dt, { enabled = true } = {}) {
  for (const w of ship.children) {
    if (w.tags.slot !== 'weapon' || !w.tags.fireRate) continue;
    w.fireAcc = (w.fireAcc || 0) + dt; const interval = 1 / w.tags.fireRate;
    if (!enabled) { w.fireAcc = Math.min(w.fireAcc, interval); continue; }
    while (w.fireAcc >= interval) { w.fireAcc -= interval; fireWeapon(game, ship, w); }
  }
}
