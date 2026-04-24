import { useState } from "react";
import type { Ship } from "../domain/ship.ts";
import type { ScoreBreakdown } from "../domain/score.ts";
import type { Role } from "../domain/scoringConfig.ts";
import { summariseWinners } from "../domain/comparisonSummary.ts";
import type { RoleView } from "../domain/urlState.ts";

interface Props {
  ships: Ship[];
  scores: Map<number, ScoreBreakdown>;
  onRemove: (id: number) => void;
  onClear: () => void;
  owned: Set<number>;
  onToggleOwned: (id: number) => void;
  roleView: RoleView;
  rankMap: Map<number, number>;
  percentMap: Map<number, number>;
}

const ROLE_SHORT: Record<Role, string> = {
  dps: "DPS",
  tank: "TNK",
  sci: "SCI",
  support: "SUP",
};

const ROLE_LONG: Record<Role, string> = {
  dps: "DPS",
  tank: "Tank",
  sci: "Sci",
  support: "Support",
};

interface ScoreView {
  total: number;
  categories: { key: string; label: string; points: number }[];
}

// Resolve the score + categories for the active role tab. Falls back to
// the overall breakdown when roleView is "overall" or when a role overlay
// is missing (e.g. configs without the `roles` overlay).
function viewFor(bd: ScoreBreakdown | undefined, roleView: RoleView): ScoreView {
  if (!bd) return { total: 0, categories: [] };
  if (roleView !== "overall" && bd.roles) {
    const rs = bd.roles[roleView];
    return { total: rs.total, categories: rs.categories };
  }
  return { total: bd.total, categories: bd.categories };
}

const COLLAPSED_KEY = "sto-ship-ranking.comparison.collapsed";

const readCollapsed = (): boolean => {
  try {
    const v = localStorage.getItem(COLLAPSED_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
};

const writeCollapsed = (v: boolean) => {
  try {
    localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
  } catch {
    // ignore quota / privacy-mode errors
  }
};

export function Comparison({
  ships,
  scores,
  onRemove,
  onClear,
  owned,
  onToggleOwned,
  roleView,
  rankMap,
  percentMap,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  if (ships.length === 0) {
    return null;
  }

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      writeCollapsed(next);
      return next;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission may be denied; silently ignore.
    }
  };

  const summary = ships.length >= 2 ? summariseWinners(ships, scores, roleView) : null;

  return (
    <section className={`comparison ${collapsed ? "is-collapsed" : "is-expanded"}`}>
      <div className="comparison-header">
        <button
          type="button"
          className="comparison-toggle"
          aria-expanded={!collapsed}
          onClick={toggleCollapsed}
        >
          <span className="caret" aria-hidden="true">
            {collapsed ? "▸" : "▾"}
          </span>
          <span className="comparison-toggle-label">Comparison ({ships.length})</span>
          <span className="comparison-toggle-hint">
            {collapsed ? "show details" : "hide details"}
          </span>
        </button>
        <div className="comparison-chips" role="list">
          {ships.map((s) => (
            <span className="comp-chip" key={s.id} role="listitem" data-faction={s.faction}>
              <span className="comp-chip-name" title={s.name}>
                {s.name}
              </span>
              <button
                type="button"
                className="comp-chip-remove"
                onClick={() => onRemove(s.id)}
                aria-label={`Remove ${s.name} from comparison`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="comparison-actions">
          <button type="button" className="secondary" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button type="button" className="secondary" onClick={onClear}>
            Clear all
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <CompactTable
            ships={ships}
            scores={scores}
            owned={owned}
            onToggleOwned={onToggleOwned}
            onRemove={onRemove}
            roleView={roleView}
            rankMap={rankMap}
            percentMap={percentMap}
          />
          {summary && (
            <p className="why-wins">
              <strong>{summary.winner.name}</strong>
              {summary.tied ? " (tied on total)" : ""}
              {summary.leads.length > 0 ? (
                <>
                  {" "}
                  leads on{" "}
                  {summary.leads.map((l, i) => (
                    <span key={l.key}>
                      {i > 0 ? ", " : ""}
                      <strong>{l.label}</strong> ({formatDelta(l.delta)})
                    </span>
                  ))}
                </>
              ) : (
                " has the top total"
              )}
              {summary.trails.length > 0 && (
                <>
                  ; trails on <strong>{summary.trails[0].label}</strong> (
                  {formatDelta(summary.trails[0].delta)})
                </>
              )}
              .
            </p>
          )}
        </>
      )}
    </section>
  );
}

function CompactTable({
  ships,
  scores,
  owned,
  onToggleOwned,
  onRemove,
  roleView,
  rankMap,
  percentMap,
}: {
  ships: Ship[];
  scores: Map<number, ScoreBreakdown>;
  owned: Set<number>;
  onToggleOwned: (id: number) => void;
  onRemove: (id: number) => void;
  roleView: RoleView;
  rankMap: Map<number, number>;
  percentMap: Map<number, number>;
}) {
  const breakdowns = ships.map((s) => scores.get(s.id));
  // Category lookup pulls from the active role overlay when roleView is
  // non-overall (so DPS lights up Weapons, Tank lights up Defense, etc.);
  // falls back to overall categories when no overlay is present.
  const catPoints = (bd: ScoreBreakdown | undefined, key: string): number => {
    const view = viewFor(bd, roleView);
    return view.categories.find((c) => c.key === key)?.points ?? 0;
  };

  const rowData = ships.map((s, i) => {
    const bd = breakdowns[i];
    const bestRole = bd?.bestRole;
    const bestRoleScore = bestRole && bd?.roles ? bd.roles[bestRole].total : 0;
    return {
      ship: s,
      bd,
      total: viewFor(bd, roleView).total,
      weapons: catPoints(bd, "weapons"),
      consoles: catPoints(bd, "consoles"),
      boff: catPoints(bd, "boffAbilities"),
      trait: catPoints(bd, "trait"),
      hangars: catPoints(bd, "hangars"),
      defense: catPoints(bd, "defense"),
      mobility: catPoints(bd, "mobility"),
      bestRole,
      bestRoleScore,
    };
  });

  const numericCols = [
    "total",
    "weapons",
    "consoles",
    "boff",
    "trait",
    "hangars",
    "defense",
    "mobility",
  ] as const;

  // Winner highlighting only makes sense when comparing 2+ ships.
  const colMax = new Map<string, number>();
  for (const col of numericCols) {
    colMax.set(col, Math.max(...rowData.map((r) => r[col])));
  }
  const isWinner = (col: (typeof numericCols)[number], value: number): boolean => {
    if (ships.length < 2) return false;
    const max = colMax.get(col) ?? 0;
    if (max === 0) return false;
    const allEqual = rowData.every((r) => r[col] === value);
    if (allEqual) return false;
    return value === max;
  };

  return (
    <div className="comparison-compact-wrap">
      <table className="comparison-compact">
        <thead>
          <tr>
            <th className="compact-actions-col" aria-label="Actions"></th>
            <th className="compact-name-col">Ship</th>
            <th className="rank-col" title="Rank within current view">
              #
            </th>
            <th className="percent-col" title="Percent of top-ranked ship's score">
              %
            </th>
            <th>Score</th>
            <th>Wpn</th>
            <th>Con</th>
            <th>BOff</th>
            <th>Trait</th>
            <th>Hngr</th>
            <th>Def</th>
            <th>Mob</th>
            <th>Role</th>
            <th>Faction</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {rowData.map((r) => {
            const s = r.ship;
            const ownedNow = owned.has(s.id);
            return (
              <tr key={s.id} data-faction={s.faction}>
                <td className="compact-actions-col">
                  <button
                    type="button"
                    className="owned-toggle"
                    aria-pressed={ownedNow}
                    aria-label={ownedNow ? `Unmark ${s.name} as owned` : `Mark ${s.name} as owned`}
                    onClick={() => onToggleOwned(s.id)}
                  >
                    {ownedNow ? "★" : "☆"}
                  </button>
                  <button
                    type="button"
                    className="link"
                    onClick={() => onRemove(s.id)}
                    aria-label={`Remove ${s.name}`}
                  >
                    ×
                  </button>
                </td>
                <td className="compact-name-col" title={s.name}>
                  <span className="ship-name">{s.name}</span>
                  {s.wikiUrl && (
                    <a
                      href={s.wikiUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ship-wiki-link"
                      aria-label={`${s.name} on stowiki`}
                    >
                      ↗
                    </a>
                  )}
                </td>
                <td className="rank-col">{rankMap.get(s.id) ?? ""}</td>
                <td className="percent-col">
                  {r.bd ? `${(percentMap.get(s.id) ?? 0).toFixed(1)}%` : ""}
                </td>
                <td className={isWinner("total", r.total) ? "winner total" : "total"}>
                  {r.total.toFixed(1)}
                </td>
                <td className={isWinner("weapons", r.weapons) ? "winner" : ""}>
                  {r.weapons.toFixed(1)}
                </td>
                <td className={isWinner("consoles", r.consoles) ? "winner" : ""}>
                  {r.consoles.toFixed(1)}
                </td>
                <td className={isWinner("boff", r.boff) ? "winner" : ""}>{r.boff.toFixed(1)}</td>
                <td className={isWinner("trait", r.trait) ? "winner" : ""}>{r.trait.toFixed(1)}</td>
                <td className={isWinner("hangars", r.hangars) ? "winner" : ""}>
                  {r.hangars.toFixed(1)}
                </td>
                <td className={isWinner("defense", r.defense) ? "winner" : ""}>
                  {r.defense.toFixed(1)}
                </td>
                <td className={isWinner("mobility", r.mobility) ? "winner" : ""}>
                  {r.mobility.toFixed(1)}
                </td>
                <td className="role-badge-cell">
                  {r.bestRole ? (
                    <span
                      className="role-badge"
                      data-role={r.bestRole}
                      title={`Best role: ${ROLE_LONG[r.bestRole]} (${r.bestRoleScore.toFixed(1)})`}
                    >
                      <span className="role-badge-label">{ROLE_SHORT[r.bestRole]}</span>
                      <span className="role-badge-val">{r.bestRoleScore.toFixed(0)}</span>
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{s.faction}</td>
                <td>{s.typeSimplified}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDelta(v: number): string {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}${Math.abs(v).toFixed(1)}`;
}
