// Base definitions. Shapes are nose-up polygons in local units (roughly pixels at baseSize 1).
// Nodes: slot type, local position, mirror (spawns a mirrored pair when x != 0), id for build maps.
// Enemies are rotated 180° at render/sim time so their nose points down the field.
export const BASES = {
  starter_hull: {
    id: 'starter_hull', name: 'Starter Hull', faction: 'player',
    durability: 100, baseSize: 1.0, compSizing: 1.0,
    shape: [[0, -26], [14, 10], [8, 20], [-8, 20], [-14, 10]],
    nodes: [
      { id: 'wingA', slot: 'wing', x: 14, y: 8, mirror: true },
      { id: 'gun', slot: 'weapon', x: 0, y: -14 },
      { id: 'bay', slot: 'utility', x: 0, y: 14 },
      { id: 'aug', slot: 'augment', x: 0, y: 2 },
    ],
  },
  piranha: {
    id: 'piranha', name: 'Piranha', faction: 'enemy',
    durability: 25, baseSize: 1.0, compSizing: 0.75,
    shape: [[0, -30], [9, -6], [9, 18], [0, 26], [-9, 18], [-9, -6]],
    nodes: [
      { id: 'wingA', slot: 'wing', x: 10, y: 10, mirror: true },
      { id: 'gun', slot: 'weapon', x: 0, y: -22 },
      { id: 'aug', slot: 'augment', x: 0, y: 18 },
    ],
  },
};
