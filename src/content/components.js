// Component definitions. `tags` is the gameplay data systems read. `shape` is a nose-up placeholder polygon.
export const COMPONENTS = {
  // wings
  wing_diver: { id: 'wing_diver', name: 'Diver Wing', slot: 'wing',
    tags: { speed: 220, enter: 'sideslide', tell: 'brieflift', pattern: 'dive' },
    durability: 15, shape: [[0, -10], [12, 6], [12, 12], [-2, 12], [-4, 2]] },
  wing_starter: { id: 'wing_starter', name: 'Starter Fin', slot: 'wing',
    tags: { speed: 520 }, durability: 20, shape: [[0, -12], [10, 8], [10, 14], [-2, 14], [-3, 0]] },
  // weapons
  weapon_pebble: { id: 'weapon_pebble', name: 'Pebble Shot', slot: 'weapon',
    tags: { fire: 'single', fireRate: 0.5, velocity: 180, damage: 15 },
    durability: 10, shape: [[-4, -10], [4, -10], [4, 8], [-4, 8]] },
  weapon_starter: { id: 'weapon_starter', name: 'Starter Blaster', slot: 'weapon',
    tags: { fire: 'single', fireRate: 6, velocity: 900, damage: 8 },
    durability: 20, shape: [[-4, -12], [4, -12], [4, 8], [-4, 8]] },
  // augments
  aug_shield_bubble: { id: 'aug_shield_bubble', name: 'Shield Bubble', slot: 'augment',
    tags: { shield: 1, fullstop: 1, style: 'EnergyBubble', recharge: 5 },
    durability: 10, shape: [[-6, -6], [6, -6], [6, 6], [-6, 6]] },
  // utility (player only)
  util_salvage_bay: { id: 'util_salvage_bay', name: 'Salvage Bay', slot: 'utility',
    tags: { beamRange: 260, towSlow: 0.45, fieldRadius: 70 },
    durability: 20, shape: [[-7, -4], [7, -4], [5, 8], [-5, 8]] },
};
