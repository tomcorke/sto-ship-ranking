import { useState, type CSSProperties } from "react";
import type { Ship } from "../domain/ship.ts";
import type { ScoreBreakdown } from "../domain/score.ts";
import { ROLES, type Role } from "../domain/scoringConfig.ts";
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

interface RoleStripeCell {
  role: Role;
  value: number;
  // Position in [0, 1] across the selected ships; used for shading. 0.5
  // when there is no spread.
  shade: number;
  best: boolean;
}

function buildRoleStripes(
  ships: Ship[],
  scores: Map<number, ScoreBreakdown>,
): Map<number, RoleStripeCell[]> {
  // min/max across the SELECTED ships per role, so the stripe shows
  // relative standing within the comparison (not the full fleet).
  const minByRole: Record<Role, number> = {
    dps: Infinity,
    tank: Infinity,
    sci: Infinity,
    support: Infinity,
  };
  const maxByRole: Record<Role, number> = {
    dps: -Infinity,
    tank: -Infinity,
    sci: -Infinity,
    support: -Infinity,
  };
  for (const s of ships) {
    const bd = scores.get(s.id);
    if (!bd?.roles) continue;
    for (const r of ROLES) {
      const v = bd.roles[r].total;
      if (v < minByRole[r]) minByRole[r] = v;
      if (v > maxByRole[r]) maxByRole[r] = v;
    }
  }
  const out = new Map<number, RoleStripeCell[]>();
  for (const s of ships) {
    const bd = scores.get(s.id);
    const cells: RoleStripeCell[] = ROLES.map((r) => {
      const v = bd?.roles?.[r].total ?? 0;
      const lo = minByRole[r];
      const hi = maxByRole[r];
      const spread = hi - lo;
      const shade = spread > 0 && Number.isFinite(lo) ? (v - lo) / spread : 0.5;
      return { role: r, value: v, shade, best: bd?.bestRole === r };
    });
    out.set(s.id, cells);
  }
  return out;
}

function RoleStripe({ cells }: { cells: RoleStripeCell[] }) {
  return (
    <div className="role-stripe" role="group" aria-label="Role scores">
      {cells.map((c) => (
        <span
          key={c.role}
          className={`role-stripe-cell ${c.best ? "best" : ""}`}
          data-role={c.role}
          title={`${ROLE_LONG[c.role]}: ${c.value.toFixed(1)}${c.best ? " (best)" : ""}`}
          style={{ "--role-shade": c.shade } as CSSProperties}
        >
          <span className="role-stripe-label">{ROLE_SHORT[c.role]}</span>
          <span className="role-stripe-val">{c.value.toFixed(0)}</span>
        </span>
      ))}
    </div>
  );
}

const COLLAPSED_KEY = "sto-ship-ranking.comparison.collapsed";
const COMPACT_THRESHOLD = 5;

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

interface Row {
  key: string;
  label: string;
  values: (number | string)[];
  numeric: boolean;
  higherBetter: boolean;
  muted?: boolean;
  subrow?: boolean;
  total?: boolean;
}

interface Section {
  title: string;
  rows: Row[];
}

export function Comparison({
  ships,
  scores,
  onRemove,
  onClear,
  owned,
  onToggleOwned,
  roleView: _roleView,
}: Props) {
  // roleView is threaded through but not directly consumed in Comparison
  // today - the role stripe shows all four roles regardless of the
  // selected tab. Kept in props to keep the contract consistent and to
  // avoid unused-arg churn if the stripe later wants to highlight the
  // active tab.
  void _roleView;
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

  const compact = ships.length >= COMPACT_THRESHOLD;
  const summary = summariseWinners(ships, scores);

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
          <span>Comparison ({ships.length})</span>
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
          {compact ? (
            <CompactTable
              ships={ships}
              scores={scores}
              owned={owned}
              onToggleOwned={onToggleOwned}
              onRemove={onRemove}
            />
          ) : (
            <FullTable
              ships={ships}
              scores={scores}
              owned={owned}
              onToggleOwned={onToggleOwned}
              onRemove={onRemove}
            />
          )}
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

function FullTable({
  ships,
  scores,
  owned,
  onToggleOwned,
  onRemove,
}: {
  ships: Ship[];
  scores: Map<number, ScoreBreakdown>;
  owned: Set<number>;
  onToggleOwned: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const sections = buildSections(ships, scores);
  const stripes = buildRoleStripes(ships, scores);
  return (
    <div className="comparison-table-wrap">
      <table className="comparison-table">
        <thead>
          <tr>
            <th className="label-col">Category</th>
            {ships.map((s) => {
              const isOwned = owned.has(s.id);
              const cells = stripes.get(s.id);
              return (
                <th key={s.id}>
                  <div className="comp-ship-head">
                    <span>{s.name}</span>
                    <button
                      type="button"
                      className="owned-toggle"
                      aria-pressed={isOwned}
                      aria-label={isOwned ? `Unmark ${s.name} as owned` : `Mark ${s.name} as owned`}
                      onClick={() => onToggleOwned(s.id)}
                    >
                      {isOwned ? "★" : "☆"}
                    </button>
                    <button
                      type="button"
                      className="link"
                      onClick={() => onRemove(s.id)}
                      aria-label={`Remove ${s.name}`}
                    >
                      ×
                    </button>
                  </div>
                  {cells && <RoleStripe cells={cells} />}
                </th>
              );
            })}
          </tr>
        </thead>
        {sections.map((section) => (
          <SectionBody key={section.title} section={section} shipCount={ships.length} />
        ))}
      </table>
    </div>
  );
}

function CompactTable({
  ships,
  scores,
  owned,
  onToggleOwned,
  onRemove,
}: {
  ships: Ship[];
  scores: Map<number, ScoreBreakdown>;
  owned: Set<number>;
  onToggleOwned: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const breakdowns = ships.map((s) => scores.get(s.id));
  const catPoints = (bd: ScoreBreakdown | undefined, key: string): number =>
    bd?.categories.find((c) => c.key === key)?.points ?? 0;

  const rowData = ships.map((s, i) => {
    const bd = breakdowns[i];
    const bestRole = bd?.bestRole;
    const bestRoleScore = bestRole && bd?.roles ? bd.roles[bestRole].total : 0;
    return {
      ship: s,
      bd,
      total: bd?.total ?? 0,
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

  const colMax = new Map<string, number>();
  for (const col of numericCols) {
    colMax.set(col, Math.max(...rowData.map((r) => r[col])));
  }
  const isWinner = (col: (typeof numericCols)[number], value: number): boolean => {
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
                  {s.name}
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

function SectionBody({ section, shipCount }: { section: Section; shipCount: number }) {
  return (
    <tbody>
      <tr className="section-head">
        <th colSpan={shipCount + 1}>{section.title}</th>
      </tr>
      {section.rows.map((row) => (
        <ComparisonRow key={row.key} row={row} />
      ))}
    </tbody>
  );
}

function ComparisonRow({ row }: { row: Row }) {
  const winners = pickWinners(row);
  const numericValues = row.values.filter((v): v is number => typeof v === "number");
  const maxAbs = numericValues.length > 0 ? Math.max(...numericValues.map(Math.abs)) : 0;

  const trClass = [row.total ? "total" : "", row.muted ? "muted" : "", row.subrow ? "subrow" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <tr className={trClass}>
      <th scope="row">{row.label}</th>
      {row.values.map((v, j) => {
        const isWinner = row.numeric && winners.has(j);
        if (row.numeric && typeof v === "number") {
          const width = maxAbs > 0 ? (Math.abs(v) / maxAbs) * 100 : 0;
          const fillColor = v < 0 ? "var(--neg)" : "var(--pos)";
          return (
            <td key={j} className={isWinner ? "winner" : ""}>
              <div className="cell-bar">
                <span
                  className="cell-bar-fill"
                  style={{ width: `${width}%`, background: fillColor }}
                />
                <span className="cell-bar-val">{formatNumber(v, row.key)}</span>
              </div>
            </td>
          );
        }
        return (
          <td key={j} className={isWinner ? "winner" : ""}>
            {typeof v === "number" ? formatNumber(v, row.key) : v || "-"}
          </td>
        );
      })}
    </tr>
  );
}

function buildSections(ships: Ship[], scores: Map<number, ScoreBreakdown>): Section[] {
  const breakdowns = ships.map((s) => scores.get(s.id));
  const scoreValues = breakdowns.map((b) => b?.total ?? 0);

  const compKeys: string[] = [];
  const compLabels = new Map<string, string>();
  for (const bd of breakdowns) {
    if (!bd) continue;
    for (const c of bd.categories) {
      if (!compLabels.has(c.key)) {
        compLabels.set(c.key, c.label);
        compKeys.push(c.key);
      }
    }
  }

  const componentRows: Row[] = compKeys.map((k) => {
    const values = breakdowns.map((bd) => {
      const c = bd?.categories.find((x) => x.key === k);
      if (!c) return 0;
      return c.points;
    });
    return {
      key: `score-${k}`,
      label: compLabels.get(k) ?? k,
      values,
      numeric: true,
      higherBetter: true,
      muted: true,
      subrow: true,
    };
  });

  const scoreSection: Section = {
    title: "Score",
    rows: [
      {
        key: "score",
        label: "Total score",
        values: scoreValues,
        numeric: true,
        higherBetter: true,
        total: true,
      },
      ...componentRows,
    ],
  };

  const offenseSection: Section = {
    title: "Offense",
    rows: [
      numRow(
        "weaponsFore",
        "Weapons fore",
        ships.map((s) => s.weapons.fore),
        true,
      ),
      numRow(
        "weaponsAft",
        "Weapons aft",
        ships.map((s) => s.weapons.aft),
        true,
      ),
      textRow(
        "dhc",
        "DHC",
        ships.map((s) => (s.weapons.dhc ? "yes" : "")),
      ),
      textRow(
        "exp",
        "Experimental",
        ships.map((s) => (s.weapons.experimental ? "yes" : "")),
      ),
    ],
  };

  const defenseSection: Section = {
    title: "Defense",
    rows: [
      numRow(
        "hull",
        "Hull",
        ships.map((s) => s.hull),
        true,
      ),
      numRow(
        "shieldMod",
        "Shield mod",
        ships.map((s) => s.shieldMod),
        true,
      ),
      numRow(
        "hullMod",
        "Hull mod",
        ships.map((s) => s.defenseHullMod),
        true,
      ),
    ],
  };

  const mobilitySection: Section = {
    title: "Mobility",
    rows: [
      numRow(
        "turn",
        "Turn rate",
        ships.map((s) => s.mobility.turn),
        true,
      ),
      numRow(
        "inertia",
        "Inertia",
        ships.map((s) => s.mobility.inertia),
        true,
      ),
      numRow(
        "impulseMod",
        "Impulse mod",
        ships.map((s) => s.mobility.impulseMod),
        true,
      ),
    ],
  };

  const slotsSection: Section = {
    title: "Slots",
    rows: [
      numRow(
        "consolesT",
        "Consoles T",
        ships.map((s) => s.consoles.tac),
        true,
      ),
      numRow(
        "consolesE",
        "Consoles E",
        ships.map((s) => s.consoles.eng),
        true,
      ),
      numRow(
        "consolesS",
        "Consoles S",
        ships.map((s) => s.consoles.sci),
        true,
      ),
      numRow(
        "consolesU",
        "Consoles U",
        ships.map((s) => s.consoles.uni),
        true,
      ),
      numRow(
        "abilityTac",
        "Abilities Tac",
        ships.map((s) => s.maxAbility.tac),
        true,
      ),
      numRow(
        "abilityEng",
        "Abilities Eng",
        ships.map((s) => s.maxAbility.eng),
        true,
      ),
      numRow(
        "abilitySci",
        "Abilities Sci",
        ships.map((s) => s.maxAbility.sci),
        true,
      ),
      numRow(
        "specSlots",
        "Spec slots",
        ships.map((s) => s.specSlots),
        true,
      ),
      numRow(
        "hangars",
        "Hangars",
        ships.map((s) => s.hangars),
        true,
      ),
    ],
  };

  const featuresSection: Section = {
    title: "Features",
    rows: [
      textRow(
        "cloak",
        "Cloak",
        ships.map((s) => (s.miscFeatures.cloak ? "yes" : "")),
      ),
      numRow(
        "flanking",
        "Flanking %",
        ships.map((s) => s.miscFeatures.flankingPct),
        true,
      ),
      textRow(
        "trait",
        "Starship trait",
        ships.map((s) => s.trait?.name ?? ""),
      ),
      textRow(
        "uniConsole",
        "Universal console",
        ships.map((s) => s.universalConsole?.name ?? ""),
      ),
    ],
  };

  const identitySection: Section = {
    title: "Identity",
    rows: [
      textRow(
        "faction",
        "Faction",
        ships.map((s) => s.faction),
      ),
      textRow(
        "type",
        "Type",
        ships.map((s) => s.typeSimplified),
      ),
      textRow(
        "source",
        "Source",
        ships.map((s) => s.source),
      ),
      textRow(
        "career",
        "Career",
        ships.map((s) => s.career || ""),
      ),
    ],
  };

  return [
    scoreSection,
    offenseSection,
    defenseSection,
    mobilitySection,
    slotsSection,
    featuresSection,
    identitySection,
  ];
}

function numRow(key: string, label: string, values: number[], higherBetter: boolean): Row {
  return { key, label, values, numeric: true, higherBetter };
}

function textRow(key: string, label: string, values: string[]): Row {
  return { key, label, values, numeric: false, higherBetter: true };
}

function pickWinners(row: Row): Set<number> {
  if (!row.numeric) return new Set();
  const nums = row.values.map((v) => (typeof v === "number" ? v : 0));
  const allZero = nums.every((n) => n === 0);
  if (allZero) return new Set();
  const extreme = row.higherBetter ? Math.max(...nums) : Math.min(...nums);
  const out = new Set<number>();
  nums.forEach((n, i) => {
    if (n === extreme) out.add(i);
  });
  if (out.size === nums.length) return new Set();
  return out;
}

function formatNumber(v: number, key: string): string {
  if (key === "hull") return v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v);
  if (key === "score") return v.toFixed(1);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2);
}

function formatDelta(v: number): string {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}${Math.abs(v).toFixed(1)}`;
}
