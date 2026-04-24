import type { Ship } from "../domain/ship.ts";
import type { ScoreBreakdown } from "../domain/score.ts";

interface Props {
  ships: Ship[];
  scores: Map<number, ScoreBreakdown>;
  onRemove: (id: number) => void;
  onClear: () => void;
  owned: Set<number>;
  onToggleOwned: (id: number) => void;
}

interface Row {
  key: string;
  label: string;
  // Values per ship. Numbers used for winner highlighting; strings just display.
  values: (number | string)[];
  numeric: boolean;
  // Higher is better when true, lower when false. Ignored if !numeric.
  higherBetter: boolean;
  // Secondary rows shown in a muted style (e.g. score components).
  muted?: boolean;
}

export function Comparison({ ships, scores, onRemove, onClear, owned, onToggleOwned }: Props) {
  if (ships.length === 0) {
    return (
      <section className="comparison empty">
        <h2>Comparison</h2>
        <p>Tick ships in the table to compare them here.</p>
      </section>
    );
  }

  const rows = buildRows(ships, scores);
  const winners = rows.map((r) => pickWinners(r));

  return (
    <section className="comparison">
      <div className="comparison-header">
        <h2>Comparison ({ships.length})</h2>
        <button type="button" className="secondary" onClick={onClear}>
          Clear all
        </button>
      </div>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="label-col">Category</th>
              {ships.map((s) => {
                const isOwned = owned.has(s.id);
                return (
                  <th key={s.id}>
                    <div className="comp-ship-head">
                      <span>{s.name}</span>
                      <button
                        type="button"
                        className="owned-toggle"
                        aria-pressed={isOwned}
                        aria-label={
                          isOwned ? `Unmark ${s.name} as owned` : `Mark ${s.name} as owned`
                        }
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
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.key}
                className={row.key === "score" ? "total" : row.muted ? "muted" : ""}
              >
                <th scope="row">{row.label}</th>
                {row.values.map((v, j) => {
                  const isWinner = row.numeric && winners[i].has(j);
                  return (
                    <td key={j} className={isWinner ? "winner" : ""}>
                      {typeof v === "number" ? formatNumber(v, row.key) : v || "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildRows(ships: Ship[], scores: Map<number, ScoreBreakdown>): Row[] {
  const breakdowns = ships.map((s) => scores.get(s.id));
  const scoreValues = breakdowns.map((b) => b?.total ?? 0);

  // Derive a union of component keys across all selected ships so every
  // ship's breakdown lines up under the same label.
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
      label: `  · ${compLabels.get(k) ?? k}`,
      values,
      numeric: true,
      higherBetter: true,
      muted: true,
    };
  });

  const rows: Row[] = [
    {
      key: "score",
      label: "Total score",
      values: scoreValues,
      numeric: true,
      higherBetter: true,
    },
    ...componentRows,
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
      "hangars",
      "Hangars",
      ships.map((s) => s.hangars),
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
  ];

  return rows;
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
