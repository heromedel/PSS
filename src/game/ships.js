// Ship assembly: a base entity plus child component entities placed at its nodes.
// build = { nodeId: componentId }. Mirrored nodes produce two component entities sharing a `pair` id.
import { BASES } from '../content/bases.js';
import { COMPONENTS } from '../content/components.js';

export function assembleShip(world, baseId, build, { x, y, heading = 0, faction, rng } = {}) {
  const def = BASES[baseId]; if (!def) throw new Error('unknown base ' + baseId);
  // augments first: they scale the base before anything is placed
  const mult = { baseSize: 1, durability: 1, fireRate: 1 }; let boss = 0;
  for (const node of def.nodes) {
    const cdef = COMPONENTS[build[node.id]]; if (!cdef || cdef.slot !== 'augment') continue;
    mult.baseSize *= cdef.tags.baseSizeMult || 1; mult.durability *= cdef.tags.durabilityMult || 1; mult.fireRate *= cdef.tags.fireRateMult || 1;
    if (cdef.tags.boss) boss = 1;
  }
  const baseSize = def.baseSize * mult.baseSize, compSizing = def.compSizing, compScale = baseSize * compSizing; // compSizing is relative to the base
  const durability = Math.round(def.durability * mult.durability);
  const ship = world.add({
    x, y, heading, r: shapeRadius(def.shape) * baseSize, baseSize, compSizing, compScale,
    children: [], def, rng, wingSteps: [], stepIndex: 0,
    tags: { ship: 1, base: baseId, faction: faction || def.faction, durability, maxDurability: durability, baseSize, compSizing, boss: boss || undefined },
  });
  for (const node of def.nodes) {
    const compId = build[node.id]; if (!compId) continue;
    const cdef = COMPONENTS[compId]; if (!cdef) throw new Error('unknown component ' + compId);
    if (cdef.slot !== node.slot) throw new Error(`${compId} (${cdef.slot}) does not fit node ${node.id} (${node.slot})`);
    const positions = (node.mirror && node.x !== 0) ? [[node.x, node.y, false], [-node.x, node.y, true]] : [[node.x, node.y, false]];
    const pairId = positions.length > 1 ? node.id : undefined;
    for (const [lx, ly, mirrored] of positions) {
      const comp = world.add({
        x, y, parent: ship, localX: lx * baseSize, localY: ly * baseSize, mirrored, def: cdef,
        r: shapeRadius(cdef.shape) * compScale,
        tags: { component: 1, comp: compId, slot: node.slot, node: node.id, pair: pairId,
                faction: faction || def.faction, durability: cdef.durability, maxDurability: cdef.durability, ...cdef.tags },
      });
      if (node.slot === 'weapon') {
        if (pairId) comp.tags.damage = (comp.tags.damage || 0) / 2; // doubled weapons: half damage each
        comp.tags.fireRate = (comp.tags.fireRate || 0) * mult.fireRate;
      }
      ship.children.push(comp);
    }
    // one wing step per node (a mirrored pair is a single step)
    if (node.slot === 'wing' && cdef.tags.pattern) ship.wingSteps.push(ship.children[ship.children.length - 1]);
  }
  syncChildren(ship);
  return ship;
}

export function activeWing(ship) { return ship.wingSteps.length ? ship.wingSteps[ship.stepIndex % ship.wingSteps.length] : null; }
export function shipSpeed(ship) {
  const w = activeWing(ship); if (w) return w.tags.speed;
  let s = 0; for (const k of ship.children) if (k.tags.slot === 'wing') s = Math.max(s, k.tags.speed || 0); return s || 200;
}

// Place child components in world space from the parent's position and heading.
export function syncChildren(ship) {
  const c = Math.cos(ship.heading), s = Math.sin(ship.heading);
  for (const k of ship.children) {
    k.x = ship.x + k.localX * c - k.localY * s;
    k.y = ship.y + k.localX * s + k.localY * c;
    k.heading = ship.heading;
  }
}

export function removeShip(world, ship) { for (const k of ship.children) world.remove(k); world.remove(ship); }

function shapeRadius(shape) { let m = 0; for (const [x, y] of shape) m = Math.max(m, Math.hypot(x, y)); return m; }

// Placeholder rendering: slot-coloured polygons. Replaced by vector art routines later.
const SLOT_COLORS = { wing: '#f0a84a', weapon: '#ff6b6b', armor: '#9aa7b8', shield: '#6fd3ff', augment: '#c084fc', utility: '#4fd1c5', drop: '#ffe066' };
export function drawShip(c, ship, flags = {}) {
  const def = ship.def, scale = ship.baseSize;
  c.save(); c.translate(ship.x, ship.y); c.rotate(ship.heading); c.scale(scale, scale);
  c.fillStyle = ship.tags.faction === 'player' ? '#2f6f8f' : '#7a3b4f';
  c.strokeStyle = ship.tags.faction === 'player' ? '#9fe' : '#f9b';
  c.lineWidth = 1.5 / scale;
  poly(c, def.shape); c.fill(); c.stroke();
  c.restore();
  for (const k of ship.children) drawComponent(c, k, ship.compScale);
  if (flags.hitboxes) {
    c.strokeStyle = '#f66'; c.beginPath(); c.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#fa6'; for (const k of ship.children) { c.beginPath(); c.arc(k.x, k.y, k.r, 0, Math.PI * 2); c.stroke(); }
  }
}
export function drawComponent(c, k, sizing) {
  c.save(); c.translate(k.x, k.y); c.rotate(k.heading); c.scale(k.mirrored ? -sizing : sizing, sizing);
  c.fillStyle = SLOT_COLORS[k.tags.slot] || '#fff'; c.globalAlpha = 0.9;
  c.lineWidth = 1 / sizing; c.strokeStyle = '#000';
  poly(c, k.def.shape); c.fill(); c.stroke();
  c.restore();
}
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
