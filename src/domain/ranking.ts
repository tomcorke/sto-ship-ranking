import type { ScoreBreakdown } from "./score.ts";
import type { RoleView } from "./urlState.ts";

/**
 * Get the score used for ranking under a given role view.
 * Falls back to overall total when role data is missing.
 */
export function scoreFor(bd: ScoreBreakdown | undefined, roleView: RoleView): number {
  if (!bd) return 0;
  if (roleView === "overall") return bd.total;
  return bd.roles?.[roleView]?.total ?? bd.total;
}

export interface Ranking {
  /** Map from ship id to rank (1-indexed) in the score-sorted order. */
  rankMap: Map<number, number>;
  /** Map from ship id to percent of top ship's score (0-100). */
  percentMap: Map<number, number>;
  /** Top score in the set (0 if set is empty or all zero). */
  topScore: number;
}

/**
 * Compute rank and percent-of-top for a set of ships under the given role view.
 * Rank is derived from a stable descending score sort, independent of any
 * other sort the caller may apply. Percent is relative to the top score in
 * the same set.
 */
export function computeRanking<T extends { id: number }>(
  ships: T[],
  scores: Map<number, ScoreBreakdown>,
  roleView: RoleView,
): Ranking {
  const rankMap = new Map<number, number>();
  const percentMap = new Map<number, number>();

  if (ships.length === 0) {
    return { rankMap, percentMap, topScore: 0 };
  }

  const byScore = [...ships].sort(
    (a, b) => scoreFor(scores.get(b.id), roleView) - scoreFor(scores.get(a.id), roleView),
  );

  byScore.forEach((s, i) => {
    rankMap.set(s.id, i + 1);
  });

  const topScore = scoreFor(scores.get(byScore[0].id), roleView);
  for (const s of ships) {
    const v = scoreFor(scores.get(s.id), roleView);
    percentMap.set(s.id, topScore > 0 ? (v / topScore) * 100 : 0);
  }

  return { rankMap, percentMap, topScore };
}
