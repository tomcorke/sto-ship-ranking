import type { Ship } from "./ship.ts";

export interface Filters {
  search: string;
  factions: Set<string>;
  sources: Set<string>;
  shipTypes: Set<string>;
  careers: Set<string>;
  hangarsOnly: boolean;
  cloakOnly: boolean;
}

export const emptyFilters = (): Filters => ({
  search: "",
  factions: new Set(),
  sources: new Set(),
  shipTypes: new Set(),
  careers: new Set(),
  hangarsOnly: false,
  cloakOnly: false,
});

export function uniqueValues<T>(ships: Ship[], pick: (s: Ship) => T): T[] {
  const seen = new Set<T>();
  for (const s of ships) {
    const v = pick(s);
    if (v !== undefined && v !== null && v !== ("" as unknown as T)) seen.add(v);
  }
  return [...seen].sort((a, b) => String(a).localeCompare(String(b)));
}

export function applyFilters(ships: Ship[], f: Filters): Ship[] {
  const q = f.search.trim().toLowerCase();
  return ships.filter((s) => {
    if (q && !s.name.toLowerCase().includes(q)) return false;
    if (f.factions.size > 0 && !f.factions.has(s.faction)) return false;
    if (f.sources.size > 0 && !f.sources.has(s.source)) return false;
    if (f.shipTypes.size > 0 && !f.shipTypes.has(s.typeSimplified)) return false;
    if (f.careers.size > 0 && !f.careers.has(s.career || "")) return false;
    if (f.hangarsOnly && s.hangars <= 0) return false;
    if (f.cloakOnly && !s.miscFeatures.cloak) return false;
    return true;
  });
}
