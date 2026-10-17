// Component definitions. `tags` is the gameplay data systems read. `shape` is a nose-up placeholder polygon.
// Wings: speed + pattern. Weapons: fire pattern, fireRate (shots/s), velocity, damage, bypass (0..1 how well it gets
// around front-mounted parts, priced by the economy). Armor: local hitbox blocker. Shield: ship-wide energy hitbox.
// Augment: multipliers applied at assembly, no hitbox. Utility: player tools. Drop: loot table.
export const COMPONENTS = {
  // wings
  wing_starter: { id: 'wing_starter', name: 'Starter Fin', slot: 'wing',
    tags: { speed: 520 }, durability: 20, shape: [[0, -12], [10, 8], [10, 14], [-2, 14], [-3, 0]] },
  wing_hover: { id: 'wing_hover', name: 'Hover Vane', slot: 'wing',
    tags: { speed: 140, pattern: 'hold_strafe' }, durability: 15, shape: [[0, -8], [14, 4], [14, 10], [0, 12], [-3, 2]] },
  wing_diver: { id: 'wing_diver', name: 'Diver Wing', slot: 'wing',
    tags: { speed: 220, pattern: 'dive', tell: 'brieflift' }, durability: 15, shape: [[0, -10], [12, 6], [12, 12], [-2, 12], [-4, 2]] },
  wing_sweep: { id: 'wing_sweep', name: 'Sweep Blade', slot: 'wing',
    tags: { speed: 260, pattern: 'sweep' }, durability: 12, shape: [[0, -14], [8, 2], [16, 14], [2, 10], [-2, 0]] },
  // weapons
  weapon_starter: { id: 'weapon_starter', name: 'Starter Blaster', slot: 'weapon',
    tags: { fire: 'single', fireRate: 6, velocity: 900, damage: 8, bypass: 0 },
    durability: 20, shape: [[-4, -12], [4, -12], [4, 8], [-4, 8]] },
  weapon_pebble: { id: 'weapon_pebble', name: 'Pebble Shot', slot: 'weapon',
    tags: { fire: 'single', fireRate: 0.5, velocity: 180, damage: 15, bypass: 0 },
    durability: 10, shape: [[-4, -10], [4, -10], [4, 8], [-4, 8]] },
  weapon_fan: { id: 'weapon_fan', name: 'Fan Spitter', slot: 'weapon',
    tags: { fire: 'spread', count: 3, spreadDeg: 22, fireRate: 0.4, velocity: 220, damage: 6, bypass: 0.3 },
    durability: 12, shape: [[-7, -8], [7, -8], [5, 8], [-5, 8]] },
  weapon_slant: { id: 'weapon_slant', name: 'Slant Cannon', slot: 'weapon',
    tags: { fire: 'diagonal', angleDeg: 35, fireRate: 0.8, velocity: 300, damage: 10, bypass: 0.8 },
    durability: 12, shape: [[-6, -10], [6, -4], [6, 8], [-6, 8]] },
  // armor
  armor_nose_plate: { id: 'armor_nose_plate', name: 'Nose Plate', slot: 'armor',
    tags: { blockArcDeg: 110 }, durability: 40, shape: [[-16, -4], [0, -10], [16, -4], [16, 4], [-16, 4]] },
  // shields (generator component; hitbox is ship-wide, see combat)
  shield_bubble: { id: 'shield_bubble', name: 'Shield Bubble', slot: 'shield',
    tags: { fullstop: 1, style: 'EnergyBubble', recharge: 5, radiusMult: 1.35 },
    durability: 10, shape: [[-6, -6], [6, -6], [6, 6], [-6, 6]] },
  // augments (no hitbox; multipliers applied at assembly)
  aug_hull_reinforce: { id: 'aug_hull_reinforce', name: 'Hull Reinforcement', slot: 'augment',
    tags: { durabilityMult: 1.5 }, durability: 10, shape: [[-6, -5], [6, -5], [6, 5], [-6, 5]] },
  aug_boss: { id: 'aug_boss', name: 'Boss Core', slot: 'augment',
    tags: { baseSizeMult: 1.8, durabilityMult: 4, fireRateMult: 1.4, boss: 1 }, durability: 10, shape: [[0, -7], [7, 0], [0, 7], [-7, 0]] },
  // utility (player only)
  util_salvage_bay: { id: 'util_salvage_bay', name: 'Salvage Bay', slot: 'utility',
    tags: { beamRange: 260, towSlow: 0.45, fieldRadius: 70 },
    durability: 20, shape: [[-7, -4], [7, -4], [5, 8], [-5, 8]] },
  // drops
  drop_basic: { id: 'drop_basic', name: 'Scrap Cache', slot: 'drop',
    tags: { scrapChance: 0.5, scrapMax: 2 }, durability: 5, shape: [[-4, -4], [4, -4], [4, 4], [-4, 4]] },
};
export function componentsForSlot(slot) { return Object.values(COMPONENTS).filter(c => c.slot === slot); }
