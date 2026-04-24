// Single-source weight surface for the scoring rubric. Every numeric
// constant consumed by `scoreShip` must live here so that downstream
// inspection UIs and future tuning branches can introspect and override
// weights without touching the scoring body.

// Role overlays let us project a ship's category points onto a
// role-specific axis (DPS / Tank / Sci / Support). Missing keys default
// to 1.0 - the overlay is sparse so you only specify multipliers where
// you want to diverge from the baseline.
export type Role = "dps" | "tank" | "sci" | "support";
export const ROLES: readonly Role[] = ["dps", "tank", "sci", "support"];

// Category-key-addressed multipliers. Keys mirror the `key` strings
// emitted by scoreShip (weapons, consoles, boffAbilities, trait,
// hangars, misc, cruiserCommands, scienceFeatures, defense, mobility,
// power). Anything unset defaults to 1.0 when applied.
export interface RoleWeights {
  weapons?: number;
  consoles?: number;
  boffAbilities?: number;
  trait?: number;
  hangars?: number;
  misc?: number;
  cruiserCommands?: number;
  scienceFeatures?: number;
  defense?: number;
  mobility?: number;
  power?: number;
}

export interface ScoringConfig {
  weapons: { fore: number; aft: number; dhcBonus: number; expBonus: number };
  consoles: { tac: number; eng: number; sci: number; universal: number };
  ability: { tac: number; eng: number; sci: number; spec: number; scale: number };
  hangar: { first: number; second: number; thirdPlus: number };
  trait: { damage: number; utility: number; cap: number };
  misc: { cloak: number; flanking: number; wingmen: number; singularity: number };
  cruiserCommand: number;
  sciFeature: {
    secondaryDeflector: number;
    sensorAnalysis: number;
    subsystemTargeting: number;
    tacMode: number;
  };
  defense: { hull: number; shieldMod: number; defenseHullMod: number };
  mobility: { turn: number; impulseMod: number; inertiaPenalty: number };
  power: { perPoint: number };
  roles?: Record<Role, RoleWeights>;
}

// First-pass heuristic role overlays. These are deliberately rough; a
// later tuning pass will revise them. They apply on top of the existing
// category totals so a ship's overall score is unchanged - roles just
// reshape which categories count how much for each role.
export const DEFAULT_ROLE_WEIGHTS: Record<Role, RoleWeights> = {
  dps: {
    weapons: 1.3,
    consoles: 1.4,
    trait: 1.3,
    misc: 1.2,
    boffAbilities: 1.1,
    defense: 0.6,
    mobility: 0.9,
    scienceFeatures: 0.3,
    cruiserCommands: 0.6,
    hangars: 0.8,
    power: 1.0,
  },
  tank: {
    defense: 1.8,
    cruiserCommands: 2.0,
    boffAbilities: 1.1,
    consoles: 0.9,
    weapons: 0.7,
    trait: 0.9,
    misc: 0.8,
    mobility: 0.7,
    scienceFeatures: 0.5,
    hangars: 1.0,
    power: 1.0,
  },
  sci: {
    scienceFeatures: 2.2,
    consoles: 1.1,
    boffAbilities: 1.3,
    trait: 1.1,
    weapons: 0.6,
    defense: 0.9,
    mobility: 1.0,
    cruiserCommands: 0.4,
    misc: 0.7,
    hangars: 0.8,
    power: 1.1,
  },
  support: {
    boffAbilities: 1.4,
    cruiserCommands: 1.6,
    trait: 1.2,
    consoles: 1.0,
    hangars: 1.3,
    defense: 1.1,
    mobility: 1.0,
    misc: 0.9,
    weapons: 0.7,
    scienceFeatures: 1.0,
    power: 1.1,
  },
};

export const DEFAULT_CONFIG: ScoringConfig = {
  weapons: { fore: 1.5, aft: 1.0, dhcBonus: 0.5, expBonus: 0.5 },
  consoles: { tac: 1.0, eng: 1.0, sci: 1.0, universal: 1.3 },
  ability: { tac: 1.1, eng: 0.9, sci: 0.9, spec: 1.0, scale: 0.5 },
  hangar: { first: 2.2, second: 1.2, thirdPlus: 0.6 },
  trait: { damage: 1.2, utility: 1.0, cap: 4 },
  misc: { cloak: 1.5, flanking: 1.0, wingmen: 1.0, singularity: 0.5 },
  cruiserCommand: 0.5,
  sciFeature: {
    secondaryDeflector: 2.0,
    sensorAnalysis: 1.5,
    subsystemTargeting: 0.75,
    tacMode: 0.5,
  },
  defense: { hull: 0.6, shieldMod: 0.6, defenseHullMod: 0.4 },
  mobility: { turn: 0.5, impulseMod: 0.3, inertiaPenalty: 0.2 },
  power: { perPoint: 0.25 },
  roles: DEFAULT_ROLE_WEIGHTS,
};

// Precomputed per-dimension mean/stdev across the fleet. Passed into
// `scoreShip` so z-scored categories (defense / mobility / power) stay
// stable regardless of which subset of ships is being ranked.
export interface FleetStatAxis {
  mean: number;
  stdev: number;
}

export interface FleetStats {
  hull: FleetStatAxis;
  shieldMod: FleetStatAxis;
  defenseHullMod: FleetStatAxis;
  turn: FleetStatAxis;
  impulseMod: FleetStatAxis;
  inertia: FleetStatAxis;
  powerBonusTotal: FleetStatAxis;
}
