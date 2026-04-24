import { emptyFilters, type Filters } from "./filters.ts";

export interface UrlState {
  filters: Filters;
  selected: Set<number>;
}

function encodeSet(s: Set<string>): string {
  return [...s].join(",");
}

function decodeSet(raw: string): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(",").filter((v) => v.length > 0));
}

function encodeIdSet(s: Set<number>): string {
  return [...s].join(",");
}

function decodeIdSet(raw: string): Set<number> {
  if (!raw) return new Set();
  const out = new Set<number>();
  for (const v of raw.split(",")) {
    const n = Number(v);
    if (Number.isFinite(n)) out.add(n);
  }
  return out;
}

/**
 * Serialise filters + selected ids into a URL hash (without leading `#`).
 * Empty fields are omitted so the hash stays short.
 */
export function serialiseState({ filters, selected }: UrlState): string {
  const parts: string[] = [];
  if (filters.factions.size > 0) parts.push(`faction=${encodeSet(filters.factions)}`);
  if (filters.careers.size > 0) parts.push(`career=${encodeSet(filters.careers)}`);
  if (filters.sources.size > 0) parts.push(`source=${encodeSet(filters.sources)}`);
  if (filters.shipTypes.size > 0) parts.push(`type=${encodeSet(filters.shipTypes)}`);
  if (filters.search) parts.push(`search=${encodeURIComponent(filters.search)}`);
  if (filters.hangarsOnly) parts.push(`hangarsOnly=1`);
  if (filters.cloakOnly) parts.push(`cloakOnly=1`);
  if (filters.ownedMode === "owned") parts.push(`owned=owned`);
  else if (filters.ownedMode === "not-owned") parts.push(`owned=not-owned`);
  if (selected.size > 0) parts.push(`sel=${encodeIdSet(selected)}`);
  return parts.join("&");
}

/**
 * Parse a URL hash (with or without leading `#`) into filters + selected ids.
 * Unknown keys are ignored; missing keys fall back to defaults.
 */
export function deserialiseState(hash: string): UrlState {
  const filters = emptyFilters();
  const selected = new Set<number>();
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return { filters, selected };
  for (const pair of raw.split("&")) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    switch (key) {
      case "faction":
        filters.factions = decodeSet(value);
        break;
      case "career":
        filters.careers = decodeSet(value);
        break;
      case "source":
        filters.sources = decodeSet(value);
        break;
      case "type":
        filters.shipTypes = decodeSet(value);
        break;
      case "search":
        filters.search = decodeURIComponent(value);
        break;
      case "hangarsOnly":
        filters.hangarsOnly = value === "1";
        break;
      case "cloakOnly":
        filters.cloakOnly = value === "1";
        break;
      case "owned":
        if (value === "owned" || value === "not-owned") filters.ownedMode = value;
        else filters.ownedMode = "all";
        break;
      case "sel":
        for (const id of decodeIdSet(value)) selected.add(id);
        break;
    }
  }
  return { filters, selected };
}
