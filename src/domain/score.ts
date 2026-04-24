import type { Ship } from "./ship.ts";

export interface ScoreBreakdown {
  total: number;
  categories: {
    key: string;
    label: string;
    points: number;
    detail: string;
  }[];
}

// Universal consoles are worth more than career-locked slots.
const CONSOLE_WEIGHTS = { tac: 1.0, eng: 1.0, sci: 1.0, uni: 1.3 } as const;

// BOff ability count by career/spec, weighted. Tactical abilities weigh
// slightly more since DPS builds are the usual optimization target.
const ABILITY_WEIGHTS = {
  tac: 1.1,
  eng: 0.9,
  sci: 0.9,
  int: 1.0,
  cmd: 1.0,
  pil: 1.0,
  tmp: 1.0,
  mw: 1.05,
} as const;

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

function traitScore(summary: string): { damage: number; utility: number } {
  const s = summary.toLowerCase();
  let damage = 0;
  let utility = 0;
  for (const kw of TRAIT_KEYWORDS_DAMAGE) if (s.includes(kw)) damage += 1;
  for (const kw of TRAIT_KEYWORDS_UTILITY) if (s.includes(kw)) utility += 1;
  return { damage: Math.min(damage, 5), utility: Math.min(utility, 5) };
}

export function scoreShip(ship: Ship): ScoreBreakdown {
  const cats: ScoreBreakdown["categories"] = [];

  const w = ship.weapons;
  const weaponPts = w.fore * 1.5 + w.aft * 1.0 + (w.dhc ? 1.5 : 0) + (w.experimental ? 1.0 : 0);
  cats.push({
    key: "weapons",
    label: "Weapons",
    points: weaponPts,
    detail: `${w.fore}F/${w.aft}A${w.dhc ? " +DHC" : ""}${w.experimental ? " +Exp" : ""}`,
  });

  const c = ship.consoles;
  const consolePts =
    c.tac * CONSOLE_WEIGHTS.tac +
    c.eng * CONSOLE_WEIGHTS.eng +
    c.sci * CONSOLE_WEIGHTS.sci +
    c.uni * CONSOLE_WEIGHTS.uni;
  cats.push({
    key: "consoles",
    label: "Consoles",
    points: consolePts,
    detail: `${c.tac}T/${c.eng}E/${c.sci}S/${c.uni}U`,
  });

  const a = ship.maxAbility;
  const abilityPts =
    a.tac * ABILITY_WEIGHTS.tac +
    a.eng * ABILITY_WEIGHTS.eng +
    a.sci * ABILITY_WEIGHTS.sci +
    a.int * ABILITY_WEIGHTS.int +
    a.cmd * ABILITY_WEIGHTS.cmd +
    a.pil * ABILITY_WEIGHTS.pil +
    a.tmp * ABILITY_WEIGHTS.tmp +
    a.mw * ABILITY_WEIGHTS.mw;
  cats.push({
    key: "boffAbilities",
    label: "BOff abilities",
    points: abilityPts * 0.5,
    detail:
      `Tac ${a.tac}/Eng ${a.eng}/Sci ${a.sci}` +
      (ship.specCount > 0 ? `, ${ship.specCount} spec${ship.specCount > 1 ? "s" : ""}` : ""),
  });

  const trait = ship.trait ? traitScore(ship.trait.summary) : { damage: 0, utility: 0 };
  const traitPts = trait.damage * 1.2 + trait.utility * 1.0;
  cats.push({
    key: "trait",
    label: "Starship trait",
    points: traitPts,
    detail: ship.trait ? `dmg ${trait.damage}, util ${trait.utility}` : "none",
  });

  const hangarPts = ship.hangars * 3.0;
  if (ship.hangars > 0) {
    cats.push({
      key: "hangars",
      label: "Hangars",
      points: hangarPts,
      detail: `${ship.hangars} bay${ship.hangars > 1 ? "s" : ""}`,
    });
  } else {
    cats.push({
      key: "hangars",
      label: "Hangars",
      points: 0,
      detail: "none",
    });
  }

  const mf = ship.miscFeatures;
  const miscPts =
    (mf.cloak ? 1.0 : 0) +
    (mf.flankingPct >= 50 ? 2.0 : mf.flankingPct > 0 ? 1.0 : 0) +
    (mf.wingmen ? 1.5 : 0) +
    (mf.singularity ? 0.5 : 0);
  cats.push({
    key: "misc",
    label: "Misc features",
    points: miscPts,
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

  const cc = ship.cruiserCommands;
  const ccCount =
    (cc.weapon ? 1 : 0) + (cc.shield ? 1 : 0) + (cc.engine ? 1 : 0) + (cc.threat ? 1 : 0);
  cats.push({
    key: "cruiserCommands",
    label: "Cruiser commands",
    points: ccCount * 0.5,
    detail: ccCount > 0 ? `${ccCount} aura${ccCount > 1 ? "s" : ""}` : "none",
  });

  const sf = ship.scienceFeatures;
  const sciCount =
    (sf.secondaryDeflector ? 1 : 0) +
    (sf.subsystemTargeting ? 1 : 0) +
    (sf.sensorAnalysis ? 1 : 0) +
    (sf.tacMode ? 1 : 0);
  cats.push({
    key: "scienceFeatures",
    label: "Science features",
    points: sciCount * 0.75,
    detail: sciCount > 0 ? `${sciCount} feature${sciCount > 1 ? "s" : ""}` : "none",
  });

  const total = cats.reduce((s, c) => s + c.points, 0);
  return { total: Math.round(total * 10) / 10, categories: cats };
}

export function scoreAll(ships: Ship[]): Map<number, ScoreBreakdown> {
  const m = new Map<number, ScoreBreakdown>();
  for (const s of ships) m.set(s.id, scoreShip(s));
  return m;
}
