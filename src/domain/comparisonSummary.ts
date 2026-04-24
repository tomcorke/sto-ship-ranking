import type { RoleScoreCategory, ScoreBreakdown } from "./score.ts";
import type { Ship } from "./ship.ts";
import type { RoleView } from "./urlState.ts";

export interface CategoryDelta {
  key: string;
  label: string;
  delta: number;
}

export interface ComparisonSummary {
  winner: Ship;
  tied: boolean;
  leads: CategoryDelta[];
  trails: CategoryDelta[];
}

interface ScoreView {
  total: number;
  categories: { key: string; label: string; points: number }[];
}

// Resolve the score + categories for a given roleView. Falls back to the
// overall breakdown when roleView is "overall" or when a role overlay is
// not available (e.g. a config without the `roles` overlay).
function viewFor(bd: ScoreBreakdown, roleView: RoleView): ScoreView {
  if (roleView !== "overall" && bd.roles) {
    const rs = bd.roles[roleView];
    return {
      total: rs.total,
      categories: rs.categories as RoleScoreCategory[],
    };
  }
  return {
    total: bd.total,
    categories: bd.categories,
  };
}

// Produce a "why X wins" summary given an array of ships and their
// ScoreBreakdowns. Returns null when there are fewer than 2 ships to
// compare. Picks the ship with the highest total as winner; ties on
// total are broken by alphabetical name and flagged via `tied: true`.
//
// When roleView is non-overall the winner/leads/trails are computed over
// the role's weighted categories and total. Category keys match between
// role and overall breakdowns, so downstream lookups by key still work.
//
// For each category on the winner's breakdown, compares against the best
// runner-up's same category points. Top 3 positive deltas become leads;
// the single most negative delta (if any) becomes a trail.
export function summariseWinners(
  ships: Ship[],
  breakdowns: Map<number, ScoreBreakdown>,
  roleView: RoleView = "overall",
): ComparisonSummary | null {
  if (ships.length < 2) return null;

  const entries = ships
    .map((ship) => ({ ship, bd: breakdowns.get(ship.id) }))
    .filter((e): e is { ship: Ship; bd: ScoreBreakdown } => !!e.bd)
    .map((e) => ({ ship: e.ship, bd: e.bd, view: viewFor(e.bd, roleView) }));
  if (entries.length < 2) return null;

  const maxTotal = Math.max(...entries.map((e) => e.view.total));
  const topEntries = entries.filter((e) => e.view.total === maxTotal);
  const tied = topEntries.length > 1;
  // Stable tie-break: alphabetical on ship name.
  topEntries.sort((a, b) => a.ship.name.localeCompare(b.ship.name));
  const winner = topEntries[0];

  const runnerUps = entries.filter((e) => e.ship.id !== winner.ship.id);
  if (runnerUps.length === 0) return null;

  // Collect every category key/label that appears on the winner.
  const deltas: CategoryDelta[] = winner.view.categories.map((cat) => {
    // Best runner-up in this specific category (highest points).
    let bestOther = -Infinity;
    for (const r of runnerUps) {
      const rc = r.view.categories.find((c) => c.key === cat.key);
      const pts = rc?.points ?? 0;
      if (pts > bestOther) bestOther = pts;
    }
    if (bestOther === -Infinity) bestOther = 0;
    return {
      key: cat.key,
      label: cat.label,
      delta: cat.points - bestOther,
    };
  });

  const leads = deltas
    .filter((d) => d.delta > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  const negatives = deltas
    .filter((d) => d.delta < 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const trails = negatives.slice(0, 1);

  return {
    winner: winner.ship,
    tied,
    leads,
    trails,
  };
}
