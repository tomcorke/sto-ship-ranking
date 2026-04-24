import { describe, expect, it } from "vite-plus/test";

import { scoreAll, scoreShip } from "../score.ts";
import type { Ship } from "../ship.ts";

function makeShip(overrides: Partial<Ship> = {}): Ship {
  const base: Ship = {
    id: 1,
    name: "Test Ship",
    releaseDate: "",
    year: 2024,
    month: 1,
    origSource: "",
    source: "",
    bundles: "",
    starterBundle: "",
    faction: "Federation",
    origin: "",
    family: "",
    masteryPackage: "",
    typeSimplified: "Cruiser",
    typeDetailed: "",
    career: "Eng",
    highestSeats: {
      tac: 2,
      eng: 3,
      sci: 1,
      uni: 1,
      int: 0,
      cmd: 0,
      pil: 0,
      tmp: 0,
      mw: 0,
      primarySpec: "",
    },
    maxAbility: { tac: 4, eng: 5, sci: 2, int: 0, cmd: 0, pil: 0, tmp: 0, mw: 0 },
    specCount: 1,
    specSeats: 1,
    specSlots: 3,
    defenseHullMod: 1,
    hull: 60000,
    shieldMod: 1,
    mobility: { turn: 8, impulseMod: 0.17, inertia: 40 },
    powerBonus: { weapons: 5, shields: 5, engines: 10, aux: 0 },
    boffs: [],
    weapons: { total: 8, fore: 4, aft: 4, dhc: true, experimental: false },
    hangars: 0,
    deviceSlots: 4,
    fleetModule: 1,
    consoles: { tac: 4, eng: 4, sci: 2, uni: 1 },
    cruiserCommands: { weapon: true, shield: true, engine: false, threat: false },
    scienceFeatures: {
      secondaryDeflector: false,
      subsystemTargeting: false,
      sensorAnalysis: false,
      tacMode: false,
    },
    miscFeatures: { singularity: false, cloak: false, flankingPct: 0, wingmen: false },
    trait: { name: "Test Trait", summary: "", url: "" },
    universalConsole: null,
    wikiUrl: "",
    xUpgrade: false,
  };
  return { ...base, ...overrides } as Ship;
}

describe("scoreShip", () => {
  it("returns a total and a category breakdown", () => {
    const ship = makeShip();
    const result = scoreShip(ship);
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("categories");
    expect(typeof result.total).toBe("number");
    expect(Array.isArray(result.categories)).toBe(true);
  });

  it("includes weapons, consoles, boffAbilities, trait, hangars, misc, cruiserCommands, and scienceFeatures categories", () => {
    const ship = makeShip();
    const keys = scoreShip(ship).categories.map((c) => c.key);
    // All eight semantic categories (weapons, consoles, boff abilities,
    // trait, hangars, misc features, cruiser commands, science features)
    // should always appear in the breakdown so the UI can render them
    // without ad-hoc null handling.
    expect(keys).toContain("weapons");
    expect(keys).toContain("consoles");
    expect(keys).toContain("boffAbilities");
    expect(keys).toContain("trait");
    expect(keys).toContain("hangars");
    expect(keys).toContain("misc");
    expect(keys).toContain("cruiserCommands");
    expect(keys).toContain("scienceFeatures");
  });

  it("gives more points when hangar count doubles", () => {
    const one = scoreShip(makeShip({ hangars: 1 }));
    const two = scoreShip(makeShip({ hangars: 2 }));
    expect(two.total).toBeGreaterThan(one.total);
    const oneHangar = one.categories.find((c) => c.key === "hangars")!;
    const twoHangar = two.categories.find((c) => c.key === "hangars")!;
    expect(twoHangar.points).toBeGreaterThan(oneHangar.points);
  });

  it("produces a stable category breakdown for a reference hand-built ship", () => {
    const ship = makeShip({
      id: 999,
      name: "Reference",
      hangars: 1,
      weapons: { total: 8, fore: 5, aft: 3, dhc: true, experimental: true },
      consoles: { tac: 5, eng: 3, sci: 3, uni: 2 },
      miscFeatures: { singularity: false, cloak: true, flankingPct: 50, wingmen: false },
      trait: {
        name: "Damage Boost",
        summary: "+critical damage on beam overload cooldown reduction",
        url: "",
      },
    });
    const breakdown = scoreShip(ship);
    expect(breakdown).toMatchSnapshot();
  });
});

describe("scoreAll", () => {
  it("returns one entry per ship, keyed by id", () => {
    const ships = [makeShip({ id: 1 }), makeShip({ id: 2 }), makeShip({ id: 3 })];
    const result = scoreAll(ships);
    expect(result.size).toBe(3);
    expect(result.get(1)).toBeDefined();
    expect(result.get(2)).toBeDefined();
    expect(result.get(3)).toBeDefined();
    expect(result.get(99)).toBeUndefined();
  });
});
