export type Career = "Tac" | "Eng" | "Sci" | "Uni" | "";
export type Spec = "Int" | "Cmd" | "Pil" | "Tmp" | "MW" | "";

export type BoffRank = 0 | 1 | 2 | 3 | 4;

export interface BoffStation {
  rank: BoffRank;
  career: Career;
  spec: Spec;
}

export interface HighestSeats {
  tac: number;
  eng: number;
  sci: number;
  uni: number;
  int: number;
  cmd: number;
  pil: number;
  tmp: number;
  mw: number;
  primarySpec: Spec;
}

export interface MaxAbilityCounts {
  tac: number;
  eng: number;
  sci: number;
  int: number;
  cmd: number;
  pil: number;
  tmp: number;
  mw: number;
}

export interface Weapons {
  total: number;
  fore: number;
  aft: number;
  dhc: boolean;
  experimental: boolean;
}

export interface Consoles {
  tac: number;
  eng: number;
  sci: number;
  uni: number;
}

export interface CruiserCommands {
  weapon: boolean;
  shield: boolean;
  engine: boolean;
  threat: boolean;
}

export interface ScienceFeatures {
  secondaryDeflector: boolean;
  subsystemTargeting: boolean;
  sensorAnalysis: boolean;
  tacMode: boolean;
}

export interface MiscFeatures {
  singularity: boolean;
  cloak: boolean;
  flankingPct: number;
  wingmen: boolean;
}

export interface Mobility {
  turn: number;
  impulseMod: number;
  inertia: number;
}

export interface PowerBonus {
  weapons: number;
  shields: number;
  engines: number;
  aux: number;
}

export interface Trait {
  name: string;
  summary: string;
  url: string;
}

export interface UniversalConsoleRef {
  name: string;
  url: string;
}

export interface Ship {
  id: number;
  name: string;
  releaseDate: string;
  year: number | null;
  month: number | null;
  origSource: string;
  source: string;
  bundles: string;
  starterBundle: string;
  faction: string;
  origin: string;
  family: string;
  masteryPackage: string;
  typeSimplified: string;
  typeDetailed: string;
  career: Career;
  highestSeats: HighestSeats;
  maxAbility: MaxAbilityCounts;
  specCount: number;
  specSeats: number;
  specSlots: number;
  defenseHullMod: number;
  hull: number;
  shieldMod: number;
  mobility: Mobility;
  powerBonus: PowerBonus;
  boffs: BoffStation[];
  weapons: Weapons;
  hangars: number;
  deviceSlots: number;
  fleetModule: number;
  consoles: Consoles;
  cruiserCommands: CruiserCommands;
  scienceFeatures: ScienceFeatures;
  miscFeatures: MiscFeatures;
  trait: Trait | null;
  universalConsole: UniversalConsoleRef | null;
  wikiUrl: string;
  xUpgrade: boolean;
}
