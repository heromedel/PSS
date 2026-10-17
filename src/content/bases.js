// Base definitions. Shapes are nose-up polygons in local units (pixels at baseSize 1).
// Nodes: slot type, local position, mirror (spawns a mirrored pair when x != 0), id for build maps.
// Enemies are rotated 180° so their nose points down the field.
export const BASES = {
  starter_hull: {
    id: 'starter_hull', name: 'Starter Hull', faction: 'player',
    durability: 100, baseSize: 1.0, compSizing: 1.0, cost: 0,
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
  mantis: {
    id: 'mantis', name: 'Mantis', faction: 'enemy',
    durability: 60, baseSize: 1.2, compSizing: 0.9,
    shape: [[0, -24], [18, -14], [30, 4], [22, 20], [-22, 20], [-30, 4], [-18, -14]],
    nodes: [
      { id: 'wingA', slot: 'wing', x: 24, y: 12, mirror: true },
      { id: 'gunA', slot: 'weapon', x: 16, y: -10, mirror: true },
      { id: 'nose', slot: 'armor', x: 0, y: -28 },
      { id: 'gen', slot: 'shield', x: 0, y: 6 },
      { id: 'aug', slot: 'augment', x: 0, y: 16 },
    ],
  },
  drone_pod: {
    id: 'drone_pod', name: 'Drone Pod', faction: 'enemy',
    durability: 15, baseSize: 0.9, compSizing: 0.6,
    shape: [[0, -16], [11, -11], [16, 0], [11, 11], [0, 16], [-11, 11], [-16, 0], [-11, -11]],
    nodes: [
      { id: 'rocket', slot: 'wing', x: 0, y: 16 },
      { id: 'gun', slot: 'weapon', x: 0, y: -16 },
      { id: 'drop', slot: 'drop', x: 0, y: 0 },
    ],
  },
};
