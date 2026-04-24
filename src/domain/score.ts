import {
  DEFAULT_CONFIG,
  ROLES,
  type FleetStatAxis,
  type FleetStats,
  type Role,
  type RoleWeights,
  type ScoringConfig,
} from "./scoringConfig.ts";
import type { Ship } from "./ship.ts";
import { suggestRole } from "./roleDetect.ts";
import { lookupTraitOverride, type TraitOverride } from "./traitOverrides.ts";

export interface RoleScoreCategory {
  key: string;
  label: string;
  points: number;
}

export interface RoleScore {
  role: Role;
  total: number;
  categories: RoleScoreCategory[];
}

export interface ScoreBreakdown {
  total: number;
  categories: {
    key: string;
    label: string;
    points: number;
    weight: number;
    detail: string;
  }[];
  // Present when the active config has a `roles` overlay. Scored by
  // applying the per-role multipliers over the existing category
  // `points`, so the per-category shape in each RoleScore mirrors the
  // overall breakdown with a reweighted scalar.
  roles?: Record<Role, RoleScore>;
  // Role derived from the ship's typeSimplified. Useful for surfacing a
  // "this is primarily a ..." hint even when the user is viewing the
  // overall ranking.
  suggestedRole?: Role;
  // The role where this ship scores highest after overlays are applied.
  // May differ from suggestedRole when a ship's structural strengths do
  // not match its nominal class.
  bestRole?: Role;
}

// Trait keyword banks. Kept inline because the weights (not the keywords)
// are the tuning surface for now; a curated per-trait override table is
// planned for a later branch.
const TRAIT_KEYWORDS_DAMAGE = [
  "damage",
  "critical",
  "crit",
  "fire at will",
  "beam overload",
  "scatter volley",
  "cannon",
  "torpedo",
  "proc",
  "weapon haste",
  "cat1",
  "cat2",
  "directed energy",
  "+dmg",
];

const TRAIT_KEYWORDS_UTILITY = [
  "cooldown",
  "heal",
  "temporary hp",
  "shield regen",
  "shield cap",
  "control",
  "hold",
  "immunity",
  "resist",
  "duration",
  "haste",
  "power level",
  "subsystem",
  "epg",
  "ctrlx",
  "recharge",
];

// Stem reduction: crude but enough to dedupe "heal" / "healing",
// "damage" / "+dmg", "crit" / "critical" without pulling in a real
// stemmer. Applied before matching so the final count is per-stem.
function stem(kw: string): string {
  const base = kw.toLowerCase().replace(/\s+/g, " ").trim();
  if (base === "crit" || base === "critical") return "crit";
  if (base === "+dmg" || base === "damage") return "damage";
  if (base === "heal") return "heal";
  // strip trailing "s" / "ing" / "ed" to fold simple inflections
  return base.replace(/(ing|ed|s)$/i, "");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasKeyword(summary: string, kw: string): boolean {
  // Word-boundary match, case-insensitive. Falls back to substring for
  // keywords that contain non-word chars like "+dmg" where \b would not
  // sit against a `+`.
  const hasWordChar = /\w/.test(kw);
  if (!hasWordChar) return summary.toLowerCase().includes(kw.toLowerCase());
  const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
  return re.test(summary);
}

function countStems(summary: string, keywords: readonly string[]): number {
  const hits = new Set<string>();
  for (const kw of keywords) {
    if (hasKeyword(summary, kw)) hits.add(stem(kw));
  }
  return hits.size;
}

function traitScore(summary: string, config: ScoringConfig): { damage: number; utility: number } {
  const cap = config.trait.cap;
  const damage = Math.min(countStems(summary, TRAIT_KEYWORDS_DAMAGE), cap);
  const utility = Math.min(countStems(summary, TRAIT_KEYWORDS_UTILITY), cap);
  return { damage, utility };
}

export type TraitScoreSource = "curated" | "keyword" | "none";

interface TraitScoreResult {
  points: number;
  detail: string;
  source: TraitScoreSource;
}

function scoreTraitFromOverride(override: TraitOverride, config: ScoringConfig): TraitScoreResult {
  const cap = config.trait.cap;
  const dmg = Math.min(override.damage, cap);
  const util = Math.min(override.utility, cap);
  const surv = Math.min(override.survivability ?? 0, cap);
  // Survivability has no dedicated axis weight yet. Price it at the
  // midpoint between damage and utility weights so a well-rounded
  // survivability-leaning trait still lands near a pure damage/utility
  // pick of the same magnitude.
  const survWeight = (config.trait.damage + config.trait.utility) / 2;
  // Spec note lists this as `damage * 0.5`; we keep that shape but treat
  // the 0.5 coefficient as an explicit midpoint-weighting so the config
  // knobs still drive the score.
  const points = dmg * config.trait.damage + util * config.trait.utility + surv * survWeight;
  const detail = `curated: dmg=${dmg.toFixed(1)} util=${util.toFixed(1)} surv=${surv.toFixed(1)}`;
  return { points, detail, source: "curated" };
}

function scoreTraitFromKeywords(summary: string, config: ScoringConfig): TraitScoreResult {
  const { damage, utility } = traitScore(summary, config);
  const points = damage * config.trait.damage + utility * config.trait.utility;
  return {
    points,
    detail: `keyword: dmg ${damage}, util ${utility}`,
    source: "keyword",
  };
}

export function scoreTrait(ship: Ship, config: ScoringConfig): TraitScoreResult {
  if (!ship.trait) return { points: 0, detail: "none", source: "none" };
  const override = lookupTraitOverride(ship.trait.name);
  if (override) return scoreTraitFromOverride(override, config);
  return scoreTraitFromKeywords(ship.trait.summary, config);
}

// --- Fleet statistics ---------------------------------------------------

function meanStdev(values: number[]): FleetStatAxis {
  if (values.length === 0) return { mean: 0, stdev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
  return { mean, stdev: Math.sqrt(variance) };
}

export function computeFleetStats(ships: Ship[]): FleetStats {
  return {
    hull: meanStdev(ships.map((s) => s.hull)),
    shieldMod: meanStdev(ships.map((s) => s.shieldMod)),
    defenseHullMod: meanStdev(ships.map((s) => s.defenseHullMod)),
    turn: meanStdev(ships.map((s) => s.mobility.turn)),
    impulseMod: meanStdev(ships.map((s) => s.mobility.impulseMod)),
    inertia: meanStdev(ships.map((s) => s.mobility.inertia)),
    powerBonusTotal: meanStdev(
      ships.map(
        (s) =>
          s.powerBonus.weapons + s.powerBonus.shields + s.powerBonus.engines + s.powerBonus.aux,
      ),
    ),
  };
}

function z(value: number, axis: FleetStatAxis): number {
  if (axis.stdev === 0) return 0;
  const raw = (value - axis.mean) / axis.stdev;
  // Clamp to [-2, 2] so extreme outliers do not swing totals.
  if (raw > 2) return 2;
  if (raw < -2) return -2;
  return raw;
}

// --- Scoring ------------------------------------------------------------

export function scoreShip(
  ship: Ship,
  stats: FleetStats,
  config: ScoringConfig = DEFAULT_CONFIG,
): ScoreBreakdown {
  const cats: ScoreBreakdown["categories"] = [];

  // Weapons ---------------------------------------------------------------
  const w = ship.weapons;
  const weaponPts =
    w.fore * config.weapons.fore +
    w.aft * config.weapons.aft +
    (w.dhc ? config.weapons.dhcBonus : 0) +
    (w.experimental ? config.weapons.expBonus : 0);
  cats.push({
    key: "weapons",
    label: "Weapons",
    points: weaponPts,
    weight: 1,
    detail: `${w.fore}F/${w.aft}A${w.dhc ? " +DHC" : ""}${w.experimental ? " +Exp" : ""}`,
  });

  // Consoles --------------------------------------------------------------
  const c = ship.consoles;
  const consolePts =
    c.tac * config.consoles.tac +
    c.eng * config.consoles.eng +
    c.sci * config.consoles.sci +
    c.uni * config.consoles.universal;
  cats.push({
    key: "consoles",
    label: "Consoles",
    points: consolePts,
    weight: 1,
    detail: `${c.tac}T/${c.eng}E/${c.sci}S/${c.uni}U`,
  });

  // BOff abilities --------------------------------------------------------
  const a = ship.maxAbility;
  const specPool = a.int + a.cmd + a.pil + a.tmp + a.mw;
  const abilityRaw =
    a.tac * config.ability.tac +
    a.eng * config.ability.eng +
    a.sci * config.ability.sci +
    specPool * config.ability.spec;
  const abilityPts = abilityRaw * config.ability.scale;
  cats.push({
    key: "boffAbilities",
    label: "BOff abilities",
    points: abilityPts,
    weight: config.ability.scale,
    detail:
      `Tac ${a.tac}/Eng ${a.eng}/Sci ${a.sci}` +
      (ship.specCount > 0 ? `, ${ship.specCount} spec${ship.specCount > 1 ? "s" : ""}` : ""),
  });

  // Trait -----------------------------------------------------------------
  // Curated override table runs first; fall back to keyword scanning for
  // traits we have not hand-scored. See traitOverrides.ts.
  const traitResult = scoreTrait(ship, config);
  cats.push({
    key: "trait",
    label: "Starship trait",
    points: traitResult.points,
    weight: 1,
    detail: traitResult.detail,
  });

  // Hangars (diminishing returns, capped at 3 bays) ----------------------
  const bays = Math.min(ship.hangars, 3);
  let hangarPts = 0;
  if (bays >= 1) hangarPts += config.hangar.first;
  if (bays >= 2) hangarPts += config.hangar.second;
  if (bays >= 3) hangarPts += config.hangar.thirdPlus;
  cats.push({
    key: "hangars",
    label: "Hangars",
    points: hangarPts,
    weight: 1,
    detail: ship.hangars > 0 ? `${ship.hangars} bay${ship.hangars > 1 ? "s" : ""}` : "none",
  });

  // Misc features ---------------------------------------------------------
  const mf = ship.miscFeatures;
  const flankingMult = mf.flankingPct >= 50 ? 2 : mf.flankingPct > 0 ? 1 : 0;
  const miscPts =
    (mf.cloak ? config.misc.cloak : 0) +
    flankingMult * config.misc.flanking +
    (mf.wingmen ? config.misc.wingmen : 0) +
    (mf.singularity ? config.misc.singularity : 0);
  cats.push({
    key: "misc",
    label: "Misc features",
    points: miscPts,
    weight: 1,
    detail:
      [
        mf.cloak ? "cloak" : null,
        mf.flankingPct > 0 ? `flank ${mf.flankingPct}%` : null,
        mf.wingmen ? "wingmen" : null,
        mf.singularity ? "singularity" : null,
      ]
        .filter(Boolean)
        .join(", ") || "none",
  });

  // Cruiser commands ------------------------------------------------------
  const cc = ship.cruiserCommands;
  const ccCount =
    (cc.weapon ? 1 : 0) + (cc.shield ? 1 : 0) + (cc.engine ? 1 : 0) + (cc.threat ? 1 : 0);
  cats.push({
    key: "cruiserCommands",
    label: "Cruiser commands",
    points: ccCount * config.cruiserCommand,
    weight: config.cruiserCommand,
    detail: ccCount > 0 ? `${ccCount} aura${ccCount > 1 ? "s" : ""}` : "none",
  });

  // Science features ------------------------------------------------------
  const sf = ship.scienceFeatures;
  const sciPts =
    (sf.secondaryDeflector ? config.sciFeature.secondaryDeflector : 0) +
    (sf.sensorAnalysis ? config.sciFeature.sensorAnalysis : 0) +
    (sf.subsystemTargeting ? config.sciFeature.subsystemTargeting : 0) +
    (sf.tacMode ? config.sciFeature.tacMode : 0);
  const sciFeatureKeys = [
    sf.secondaryDeflector ? "sec.def" : null,
    sf.sensorAnalysis ? "sensor" : null,
    sf.subsystemTargeting ? "subsys" : null,
    sf.tacMode ? "tac-mode" : null,
  ].filter(Boolean);
  cats.push({
    key: "scienceFeatures",
    label: "Science features",
    points: sciPts,
    weight: 1,
    detail: sciFeatureKeys.length > 0 ? sciFeatureKeys.join(", ") : "none",
  });

  // Defense (z-scored) ----------------------------------------------------
  const zHull = z(ship.hull, stats.hull);
  const zShield = z(ship.shieldMod, stats.shieldMod);
  const zDefMod = z(ship.defenseHullMod, stats.defenseHullMod);
  const defensePts =
    zHull * config.defense.hull +
    zShield * config.defense.shieldMod +
    zDefMod * config.defense.defenseHullMod;
  cats.push({
    key: "defense",
    label: "Defense",
    points: defensePts,
    weight: 1,
    detail: `hull z${zHull.toFixed(2)}, shld z${zShield.toFixed(2)}, defMod z${zDefMod.toFixed(2)}`,
  });

  // Mobility (z-scored; inertia inverted) --------------------------------
  const zTurn = z(ship.mobility.turn, stats.turn);
  const zImp = z(ship.mobility.impulseMod, stats.impulseMod);
  const zInertia = z(ship.mobility.inertia, stats.inertia);
  const mobilityPts =
    zTurn * config.mobility.turn +
    zImp * config.mobility.impulseMod -
    zInertia * config.mobility.inertiaPenalty;
  cats.push({
    key: "mobility",
    label: "Mobility",
    points: mobilityPts,
    weight: 1,
    detail: `turn z${zTurn.toFixed(2)}, imp z${zImp.toFixed(2)}, inert z${zInertia.toFixed(2)}`,
  });

  // Power bonus (z-scored total across 4 subsystems) --------------------
  const pb = ship.powerBonus;
  const pbTotal = pb.weapons + pb.shields + pb.engines + pb.aux;
  const zPower = z(pbTotal, stats.powerBonusTotal);
  const powerPts = zPower * config.power.perPoint;
  cats.push({
    key: "power",
    label: "Power bonus",
    points: powerPts,
    weight: 1,
    detail: `w${pb.weapons}/s${pb.shields}/e${pb.engines}/a${pb.aux} (z${zPower.toFixed(2)})`,
  });

  const total = cats.reduce((s, c) => s + c.points, 0);
  const breakdown: ScoreBreakdown = {
    total: Math.round(total * 10) / 10,
    categories: cats,
  };

  if (config.roles) {
    const roles: Record<Role, RoleScore> = {} as Record<Role, RoleScore>;
    for (const role of ROLES) {
      const overlay = config.roles[role];
      const roleCats: RoleScoreCategory[] = cats.map((c) => ({
        key: c.key,
        label: c.label,
        points: c.points * multiplierFor(overlay, c.key),
      }));
      const roleTotal = roleCats.reduce((s, c) => s + c.points, 0);
      roles[role] = {
        role,
        total: Math.round(roleTotal * 10) / 10,
        categories: roleCats,
      };
    }
    breakdown.roles = roles;
    breakdown.suggestedRole = suggestRole(ship.typeSimplified);
    // argmax across roles; ties resolve to whichever role hits the max
    // first in ROLES order, which keeps behaviour deterministic.
    let best: Role = ROLES[0];
    for (const role of ROLES) {
      if (roles[role].total > roles[best].total) best = role;
    }
    breakdown.bestRole = best;
  }

  return breakdown;
}

function multiplierFor(overlay: RoleWeights, key: string): number {
  // Category keys map 1:1 to RoleWeights fields. Any key we do not
  // recognise (or an overlay that omits the key) falls back to 1.0 so
  // totals stay neutral for unspecified axes.
  const v = (overlay as Record<string, number | undefined>)[key];
  return typeof v === "number" ? v : 1;
}

export function scoreAll(
  ships: Ship[],
  config: ScoringConfig = DEFAULT_CONFIG,
): Map<number, ScoreBreakdown> {
  const stats = computeFleetStats(ships);
  const m = new Map<number, ScoreBreakdown>();
  for (const s of ships) m.set(s.id, scoreShip(s, stats, config));
  return m;
}
