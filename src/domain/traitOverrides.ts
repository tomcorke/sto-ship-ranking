// Curated starship trait override table.
//
// Keyword scanning of `ship.trait.summary` is a crude heuristic: e.g.
// "Super Charged Weapons" and "Emergency Weapon Cycle" score almost
// identically under keyword matching, despite a large build-impact gap
// in the wider STO community. This table lets us hand-score named
// traits against explicit {damage, utility, survivability} axes, with
// the keyword scanner kept as a fallback for uncovered traits.

import overrides from "../../data/trait-overrides.json" with { type: "json" };

export interface TraitOverride {
  damage: number;
  utility: number;
  survivability?: number;
  tags?: string[];
  note?: string;
}

const MAP: ReadonlyMap<string, TraitOverride> = new Map(
  Object.entries(overrides as Record<string, TraitOverride>),
);

export function lookupTraitOverride(name: string | undefined): TraitOverride | null {
  if (!name) return null;
  return MAP.get(name) ?? null;
}

export function allOverrideNames(): string[] {
  return [...MAP.keys()];
}
