import { describe, expect, it } from "vite-plus/test";

import { computeRanking, scoreFor } from "../ranking.ts";
import type { ScoreBreakdown } from "../score.ts";

function bd(total: number, roles?: Partial<ScoreBreakdown["roles"]>): ScoreBreakdown {
  return {
    total,
    categories: [],
    roles: roles as ScoreBreakdown["roles"],
  } as unknown as ScoreBreakdown;
}

describe("computeRanking", () => {
  it("ranks ships by descending overall score", () => {
    const ships = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const scores = new Map<number, ScoreBreakdown>([
      [1, bd(50)],
      [2, bd(100)],
      [3, bd(75)],
    ]);
    const { rankMap, percentMap, topScore } = computeRanking(ships, scores, "overall");
    expect(rankMap.get(2)).toBe(1);
    expect(rankMap.get(3)).toBe(2);
    expect(rankMap.get(1)).toBe(3);
    expect(topScore).toBe(100);
    expect(percentMap.get(2)).toBe(100);
    expect(percentMap.get(3)).toBe(75);
    expect(percentMap.get(1)).toBe(50);
  });

  it("uses role total when roleView is a role", () => {
    const ships = [{ id: 1 }, { id: 2 }];
    const scores = new Map<number, ScoreBreakdown>([
      [
        1,
        bd(50, {
          dps: { role: "dps", total: 90, categories: [] },
          tank: { role: "tank", total: 10, categories: [] },
          sci: { role: "sci", total: 10, categories: [] },
          support: { role: "support", total: 10, categories: [] },
        }),
      ],
      [
        2,
        bd(100, {
          dps: { role: "dps", total: 20, categories: [] },
          tank: { role: "tank", total: 95, categories: [] },
          sci: { role: "sci", total: 10, categories: [] },
          support: { role: "support", total: 10, categories: [] },
        }),
      ],
    ]);
    const dpsRanking = computeRanking(ships, scores, "dps");
    expect(dpsRanking.rankMap.get(1)).toBe(1);
    expect(dpsRanking.rankMap.get(2)).toBe(2);
    expect(dpsRanking.percentMap.get(1)).toBe(100);
    expect(dpsRanking.percentMap.get(2)).toBeCloseTo((20 / 90) * 100, 5);

    const tankRanking = computeRanking(ships, scores, "tank");
    expect(tankRanking.rankMap.get(2)).toBe(1);
    expect(tankRanking.rankMap.get(1)).toBe(2);
  });

  it("handles empty ship set", () => {
    const { rankMap, percentMap, topScore } = computeRanking([], new Map(), "overall");
    expect(rankMap.size).toBe(0);
    expect(percentMap.size).toBe(0);
    expect(topScore).toBe(0);
  });

  it("handles zero top score without dividing by zero", () => {
    const ships = [{ id: 1 }, { id: 2 }];
    const scores = new Map<number, ScoreBreakdown>([
      [1, bd(0)],
      [2, bd(0)],
    ]);
    const { percentMap, topScore } = computeRanking(ships, scores, "overall");
    expect(topScore).toBe(0);
    expect(percentMap.get(1)).toBe(0);
    expect(percentMap.get(2)).toBe(0);
  });
});

describe("scoreFor", () => {
  it("returns total for overall view", () => {
    expect(scoreFor(bd(42), "overall")).toBe(42);
  });

  it("falls back to total when role data missing", () => {
    expect(scoreFor(bd(42), "dps")).toBe(42);
  });

  it("returns 0 for undefined breakdown", () => {
    expect(scoreFor(undefined, "overall")).toBe(0);
  });
});
