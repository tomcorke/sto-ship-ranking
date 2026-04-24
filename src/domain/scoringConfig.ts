// Single-source weight surface for the scoring rubric. Every numeric
// constant consumed by `scoreShip` must live here so that downstream
// inspection UIs and future tuning branches can introspect and override
// weights without touching the scoring body.

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
}

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
