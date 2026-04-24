import { describe, expect, it } from "vite-plus/test";

import { summariseWinners } from "../comparisonSummary.ts";
import type { ScoreBreakdown } from "../score.ts";
import type { Ship } from "../ship.ts";

function makeShip(id: number, name: string): Ship {
  return {
    id,
    name,
    releaseDate: "",
    year: null,
    month: null,
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
      tac: 0,
      eng: 0,
      sci: 0,
      uni: 0,
      int: 0,
      cmd: 0,
      pil: 0,
      tmp: 0,
      mw: 0,
      primarySpec: "",
    },
    maxAbility: { tac: 0, eng: 0, sci: 0, int: 0, cmd: 0, pil: 0, tmp: 0, mw: 0 },
    specCount: 0,
    specSeats: 0,
    specSlots: 0,
    defenseHullMod: 0,
    hull: 0,
    shieldMod: 0,
    mobility: { turn: 0, impulseMod: 0, inertia: 0 },
    powerBonus: { weapons: 0, shields: 0, engines: 0, aux: 0 },
    boffs: [],
    weapons: { total: 0, fore: 0, aft: 0, dhc: false, experimental: false },
    hangars: 0,
    deviceSlots: 0,
    fleetModule: 0,
    consoles: { tac: 0, eng: 0, sci: 0, uni: 0 },
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
}

function makeBreakdown(
  total: number,
  cats: { key: string; label: string; points: number }[],
): ScoreBreakdown {
  return {
    total,
    categories: cats.map((c) => ({ ...c, weight: 1, detail: "" })),
  };
}

describe("summariseWinners", () => {
  it("returns null when only 1 ship is provided", () => {
    const ship = makeShip(1, "Solo");
    const scores = new Map([
      [1, makeBreakdown(100, [{ key: "weapons", label: "Weapons", points: 10 }])],
    ]);
    expect(summariseWinners([ship], scores)).toBeNull();
  });

  it("returns null when given no ships", () => {
    expect(summariseWinners([], new Map())).toBeNull();
  });

  it("picks the top-total ship as winner and lists top 3 leads by absolute delta", () => {
    const a = makeShip(1, "Alpha");
    const b = makeShip(2, "Bravo");
    const scores = new Map([
      [
        1,
        makeBreakdown(100, [
          { key: "weapons", label: "Weapons", points: 30 },
          { key: "defense", label: "Defense", points: 20 },
          { key: "mobility", label: "Mobility", points: 15 },
          { key: "trait", label: "Starship trait", points: 10 },
          { key: "hangars", label: "Hangars", points: 5 },
        ]),
      ],
      [
        2,
        makeBreakdown(50, [
          { key: "weapons", label: "Weapons", points: 10 },
          { key: "defense", label: "Defense", points: 15 },
          { key: "mobility", label: "Mobility", points: 5 },
          { key: "trait", label: "Starship trait", points: 8 },
          { key: "hangars", label: "Hangars", points: 3 },
        ]),
      ],
    ]);
    const summary = summariseWinners([a, b], scores);
    expect(summary).not.toBeNull();
    expect(summary!.winner.id).toBe(1);
    expect(summary!.tied).toBe(false);
    // Expected deltas: weapons +20, defense +5, mobility +10, trait +2, hangars +2.
    // Top 3 by abs(delta): weapons (20), mobility (10), defense (5).
    expect(summary!.leads.map((l) => l.key)).toEqual(["weapons", "mobility", "defense"]);
    expect(summary!.leads[0].delta).toBe(20);
    expect(summary!.leads[1].delta).toBe(10);
    expect(summary!.leads[2].delta).toBe(5);
    expect(summary!.trails).toEqual([]);
  });

  it("reports trailing category when winner has a negative delta", () => {
    const a = makeShip(1, "Alpha");
    const b = makeShip(2, "Bravo");
    const scores = new Map([
      [
        1,
        makeBreakdown(50, [
          { key: "weapons", label: "Weapons", points: 30 },
          { key: "mobility", label: "Mobility", points: -5 },
        ]),
      ],
      [
        2,
        makeBreakdown(20, [
          { key: "weapons", label: "Weapons", points: 10 },
          { key: "mobility", label: "Mobility", points: 10 },
        ]),
      ],
    ]);
    const summary = summariseWinners([a, b], scores);
    expect(summary!.winner.id).toBe(1);
    expect(summary!.leads.map((l) => l.key)).toEqual(["weapons"]);
    expect(summary!.trails.map((t) => t.key)).toEqual(["mobility"]);
    expect(summary!.trails[0].delta).toBe(-15);
  });

  it("marks tied flag and picks alphabetically-first ship when totals tie", () => {
    const bravo = makeShip(1, "Bravo");
    const alpha = makeShip(2, "Alpha");
    const scores = new Map([
      [1, makeBreakdown(50, [{ key: "weapons", label: "Weapons", points: 30 }])],
      [2, makeBreakdown(50, [{ key: "weapons", label: "Weapons", points: 25 }])],
    ]);
    const summary = summariseWinners([bravo, alpha], scores);
    expect(summary).not.toBeNull();
    expect(summary!.tied).toBe(true);
    expect(summary!.winner.name).toBe("Alpha");
  });

  it("sorts leads by absolute delta descending", () => {
    const a = makeShip(1, "Alpha");
    const b = makeShip(2, "Bravo");
    const scores = new Map([
      [
        1,
        makeBreakdown(100, [
          { key: "a", label: "A", points: 10 },
          { key: "b", label: "B", points: 50 },
          { key: "c", label: "C", points: 25 },
          { key: "d", label: "D", points: 5 },
        ]),
      ],
      [
        2,
        makeBreakdown(0, [
          { key: "a", label: "A", points: 0 },
          { key: "b", label: "B", points: 0 },
          { key: "c", label: "C", points: 0 },
          { key: "d", label: "D", points: 0 },
        ]),
      ],
    ]);
    const summary = summariseWinners([a, b], scores);
    expect(summary!.leads.map((l) => l.key)).toEqual(["b", "c", "a"]);
    expect(summary!.leads[0].delta).toBeGreaterThan(summary!.leads[1].delta);
    expect(summary!.leads[1].delta).toBeGreaterThan(summary!.leads[2].delta);
  });
});
