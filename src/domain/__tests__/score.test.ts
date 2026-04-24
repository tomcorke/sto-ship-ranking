import { describe, expect, it } from "vite-plus/test";

import { computeFleetStats, scoreAll, scoreShip } from "../score.ts";
import { DEFAULT_CONFIG, type ScoringConfig } from "../scoringConfig.ts";
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

// Stable, zero-stdev fleet stats for tests that want a single-ship context.
// All z-scores evaluate to 0, so defense / mobility / power collapse to 0
// and do not perturb totals driven purely by structural slots.
const ZERO_STATS = computeFleetStats([makeShip()]);

describe("scoreShip", () => {
  it("returns a total and a category breakdown", () => {
    const ship = makeShip();
    const result = scoreShip(ship, ZERO_STATS);
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("categories");
    expect(typeof result.total).toBe("number");
    expect(Array.isArray(result.categories)).toBe(true);
  });

  it("includes all semantic categories in the breakdown", () => {
    const ship = makeShip();
    const keys = scoreShip(ship, ZERO_STATS).categories.map((c) => c.key);
    expect(keys).toContain("weapons");
    expect(keys).toContain("consoles");
    expect(keys).toContain("boffAbilities");
    expect(keys).toContain("trait");
    expect(keys).toContain("hangars");
    expect(keys).toContain("misc");
    expect(keys).toContain("cruiserCommands");
    expect(keys).toContain("scienceFeatures");
    expect(keys).toContain("defense");
    expect(keys).toContain("mobility");
    expect(keys).toContain("power");
  });

  it("gives more points when hangar count doubles", () => {
    const one = scoreShip(makeShip({ hangars: 1 }), ZERO_STATS);
    const two = scoreShip(makeShip({ hangars: 2 }), ZERO_STATS);
    expect(two.total).toBeGreaterThan(one.total);
    const oneHangar = one.categories.find((c) => c.key === "hangars")!;
    const twoHangar = two.categories.find((c) => c.key === "hangars")!;
    expect(twoHangar.points).toBeGreaterThan(oneHangar.points);
  });

  it("hangar scoring diminishes with each bay and caps at 3", () => {
    const get = (bays: number) =>
      scoreShip(makeShip({ hangars: bays }), ZERO_STATS).categories.find(
        (c) => c.key === "hangars",
      )!.points;

    const p0 = get(0);
    const p1 = get(1);
    const p2 = get(2);
    const p3 = get(3);
    const p4 = get(4);

    expect(p0).toBe(0);
    expect(p1).toBeCloseTo(DEFAULT_CONFIG.hangar.first, 5);
    expect(p2).toBeCloseTo(DEFAULT_CONFIG.hangar.first + DEFAULT_CONFIG.hangar.second, 5);
    expect(p3).toBeCloseTo(
      DEFAULT_CONFIG.hangar.first + DEFAULT_CONFIG.hangar.second + DEFAULT_CONFIG.hangar.thirdPlus,
      5,
    );
    // 4 bays should cap at 3-bay total.
    expect(p4).toBeCloseTo(p3, 5);

    // Increments are strictly diminishing (first > second > third).
    const delta1 = p1 - p0;
    const delta2 = p2 - p1;
    const delta3 = p3 - p2;
    expect(delta1).toBeGreaterThan(delta2);
    expect(delta2).toBeGreaterThan(delta3);
  });

  it("defense category moves with hull relative to fleet mean", () => {
    const avg = makeShip({ id: 1, hull: 50000 });
    const big = makeShip({ id: 2, hull: 100000 });
    const small = makeShip({ id: 3, hull: 20000 });
    const stats = computeFleetStats([avg, big, small]);

    const bigDef = scoreShip(big, stats).categories.find((c) => c.key === "defense")!.points;
    const smallDef = scoreShip(small, stats).categories.find((c) => c.key === "defense")!.points;

    expect(bigDef).toBeGreaterThan(0);
    expect(smallDef).toBeLessThan(0);
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
    const breakdown = scoreShip(ship, ZERO_STATS);
    expect(breakdown).toMatchSnapshot();
  });

  it("scoreShip with a zeroed config produces a total of 0", () => {
    const zeroed: ScoringConfig = {
      weapons: { fore: 0, aft: 0, dhcBonus: 0, expBonus: 0 },
      consoles: { tac: 0, eng: 0, sci: 0, universal: 0 },
      ability: { tac: 0, eng: 0, sci: 0, spec: 0, scale: 0 },
      hangar: { first: 0, second: 0, thirdPlus: 0 },
      trait: { damage: 0, utility: 0, cap: 0 },
      misc: { cloak: 0, flanking: 0, wingmen: 0, singularity: 0 },
      cruiserCommand: 0,
      sciFeature: {
        secondaryDeflector: 0,
        sensorAnalysis: 0,
        subsystemTargeting: 0,
        tacMode: 0,
      },
      defense: { hull: 0, shieldMod: 0, defenseHullMod: 0 },
      mobility: { turn: 0, impulseMod: 0, inertiaPenalty: 0 },
      power: { perPoint: 0 },
    };
    const ship = makeShip({
      hangars: 3,
      weapons: { total: 8, fore: 5, aft: 3, dhc: true, experimental: true },
      scienceFeatures: {
        secondaryDeflector: true,
        sensorAnalysis: true,
        subsystemTargeting: true,
        tacMode: true,
      },
    });
    const result = scoreShip(ship, ZERO_STATS, zeroed);
    expect(result.total).toBe(0);
    for (const cat of result.categories) expect(cat.points).toBe(0);
  });
});

describe("computeFleetStats", () => {
  it("computes mean and stdev per axis on a 3-ship fixture", () => {
    // Hulls: 30000, 60000, 90000 -> mean 60000, population variance =
    // ((−30k)^2 + 0 + (30k)^2) / 3 = (1.8e9) / 3 = 6e8 -> stdev ≈ 24494.897
    const ships = [
      makeShip({
        id: 1,
        hull: 30000,
        shieldMod: 0.8,
        mobility: { turn: 6, impulseMod: 0.15, inertia: 30 },
      }),
      makeShip({
        id: 2,
        hull: 60000,
        shieldMod: 1.0,
        mobility: { turn: 10, impulseMod: 0.2, inertia: 50 },
      }),
      makeShip({
        id: 3,
        hull: 90000,
        shieldMod: 1.2,
        mobility: { turn: 14, impulseMod: 0.25, inertia: 70 },
      }),
    ];
    const stats = computeFleetStats(ships);

    expect(stats.hull.mean).toBe(60000);
    expect(stats.hull.stdev).toBeCloseTo(24494.897, 2);
    expect(stats.shieldMod.mean).toBeCloseTo(1.0, 5);
    expect(stats.shieldMod.stdev).toBeCloseTo(Math.sqrt(0.08 / 3), 5);
    expect(stats.turn.mean).toBeCloseTo(10, 5);
    expect(stats.turn.stdev).toBeCloseTo(Math.sqrt(32 / 3), 5);
    expect(stats.inertia.mean).toBeCloseTo(50, 5);
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
