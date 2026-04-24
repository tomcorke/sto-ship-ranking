import { describe, expect, it } from "vite-plus/test";

import { applyFilters, emptyFilters } from "../filters.ts";
import type { Ship } from "../ship.ts";

function makeShip(overrides: Partial<Ship> = {}): Ship {
  const base: Ship = {
    id: 1,
    name: "Defiant",
    releaseDate: "",
    year: 2024,
    month: 1,
    origSource: "",
    source: "C Store",
    bundles: "",
    starterBundle: "",
    faction: "Federation",
    origin: "",
    family: "",
    masteryPackage: "",
    typeSimplified: "Escort",
    typeDetailed: "",
    career: "Tac",
    highestSeats: {
      tac: 3,
      eng: 1,
      sci: 1,
      uni: 0,
      int: 0,
      cmd: 0,
      pil: 0,
      tmp: 0,
      mw: 0,
      primarySpec: "",
    },
    maxAbility: { tac: 5, eng: 2, sci: 2, int: 0, cmd: 0, pil: 0, tmp: 0, mw: 0 },
    specCount: 0,
    specSeats: 0,
    specSlots: 0,
    defenseHullMod: 1,
    hull: 40000,
    shieldMod: 1,
    mobility: { turn: 16, impulseMod: 0.22, inertia: 70 },
    powerBonus: { weapons: 15, shields: 0, engines: 5, aux: 0 },
    boffs: [],
    weapons: { total: 8, fore: 5, aft: 3, dhc: true, experimental: false },
    hangars: 0,
    deviceSlots: 3,
    fleetModule: 0,
    consoles: { tac: 5, eng: 3, sci: 2, uni: 0 },
    cruiserCommands: { weapon: false, shield: false, engine: false, threat: false },
    scienceFeatures: {
      secondaryDeflector: false,
      subsystemTargeting: false,
      sensorAnalysis: false,
      tacMode: false,
    },
    miscFeatures: { singularity: false, cloak: false, flankingPct: 0, wingmen: false },
    trait: null,
    universalConsole: null,
    wikiUrl: "",
    xUpgrade: false,
  };
  return { ...base, ...overrides } as Ship;
}

describe("applyFilters", () => {
  const ships: Ship[] = [
    makeShip({ id: 1, name: "Defiant", faction: "Federation", hangars: 0 }),
    makeShip({ id: 2, name: "Negh'Var", faction: "Klingon", hangars: 0 }),
    makeShip({ id: 3, name: "Scimitar", faction: "Romulan", hangars: 1 }),
    makeShip({ id: 4, name: "Vengeance", faction: "Federation", hangars: 2 }),
  ];

  it("returns all ships for empty filters", () => {
    const result = applyFilters(ships, emptyFilters(), new Set());
    expect(result).toHaveLength(ships.length);
  });

  it("matches names case-insensitively and ignores leading/trailing whitespace in the query", () => {
    const f = emptyFilters();
    f.search = "  DEFIANT  ";
    const result = applyFilters(ships, f, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Defiant");
  });

  it("filters by the faction Set", () => {
    const f = emptyFilters();
    f.factions = new Set(["Federation"]);
    const result = applyFilters(ships, f, new Set());
    expect(result.map((s) => s.id).sort((a, b) => a - b)).toEqual([1, 4]);
  });

  it("hangarsOnly excludes ships with no hangar bays", () => {
    const f = emptyFilters();
    f.hangarsOnly = true;
    const result = applyFilters(ships, f, new Set());
    expect(result.map((s) => s.id).sort((a, b) => a - b)).toEqual([3, 4]);
  });

  it("combines two filters with AND semantics", () => {
    const f = emptyFilters();
    f.factions = new Set(["Federation"]);
    f.hangarsOnly = true;
    const result = applyFilters(ships, f, new Set());
    expect(result.map((s) => s.id)).toEqual([4]);
  });

  it("ownedMode=owned returns only ships whose id is in the owned set", () => {
    const f = emptyFilters();
    f.ownedMode = "owned";
    const result = applyFilters(ships, f, new Set([2, 4]));
    expect(result.map((s) => s.id).sort((a, b) => a - b)).toEqual([2, 4]);
  });

  it("ownedMode=not-owned returns only ships whose id is absent from the owned set", () => {
    const f = emptyFilters();
    f.ownedMode = "not-owned";
    const result = applyFilters(ships, f, new Set([2, 4]));
    expect(result.map((s) => s.id).sort((a, b) => a - b)).toEqual([1, 3]);
  });
});
