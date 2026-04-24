import type { ScoreBreakdown } from "./score.ts";
import type { Ship } from "./ship.ts";

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

// Produce a "why X wins" summary given an array of ships and their
// ScoreBreakdowns. Returns null when there are fewer than 2 ships to
// compare. Picks the ship with the highest total as winner; ties on
// total are broken by alphabetical name and flagged via `tied: true`.
//
// For each category on the winner's breakdown, compares against the best
// runner-up's same category points. Top 3 positive deltas become leads;
// the single most negative delta (if any) becomes a trail.
export function summariseWinners(
  ships: Ship[],
  breakdowns: Map<number, ScoreBreakdown>,
): ComparisonSummary | null {
  if (ships.length < 2) return null;

  const entries = ships
    .map((ship) => ({ ship, bd: breakdowns.get(ship.id) }))
    .filter((e): e is { ship: Ship; bd: ScoreBreakdown } => !!e.bd);
  if (entries.length < 2) return null;

  const maxTotal = Math.max(...entries.map((e) => e.bd.total));
  const topEntries = entries.filter((e) => e.bd.total === maxTotal);
  const tied = topEntries.length > 1;
  // Stable tie-break: alphabetical on ship name.
  topEntries.sort((a, b) => a.ship.name.localeCompare(b.ship.name));
  const winner = topEntries[0];

  const runnerUps = entries.filter((e) => e.ship.id !== winner.ship.id);
  if (runnerUps.length === 0) return null;

  // Collect every category key/label that appears on the winner.
  const deltas: CategoryDelta[] = winner.bd.categories.map((cat) => {
    // Best runner-up in this specific category (highest points).
    let bestOther = -Infinity;
    for (const r of runnerUps) {
      const rc = r.bd.categories.find((c) => c.key === cat.key);
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
