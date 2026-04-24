import { useMemo, useState } from "react";
import type { Ship } from "../domain/ship.ts";
import type { ScoreBreakdown } from "../domain/score.ts";

type SortKey =
  | "score"
  | "name"
  | "faction"
  | "typeSimplified"
  | "weapons"
  | "consoles"
  | "hangars"
  | "hull";

interface Props {
  ships: Ship[];
  scores: Map<number, ScoreBreakdown>;
  selected: Set<number>;
  onToggleSelect: (id: number) => void;
  owned: Set<number>;
  onToggleOwned: (id: number) => void;
}

export function ShipTable({
  ships,
  scores,
  selected,
  onToggleSelect,
  owned,
  onToggleOwned,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...ships];
    arr.sort((a, b) => {
      const v = compare(a, b, sortKey, scores);
      return sortDir === "asc" ? v : -v;
    });
    return arr;
  }, [ships, sortKey, sortDir, scores]);

  const clickSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(k === "name" || k === "faction" ? "asc" : "desc");
    }
  };

  return (
    <div className="table-wrap">
      <table className="ship-table">
        <thead>
          <tr>
            <th className="sel-col" aria-label="select" />
            <th className="owned-col" aria-label="Owned" title="Owned">
              <span aria-hidden="true">★</span>
            </th>
            <Th label="Score" k="score" cur={sortKey} dir={sortDir} on={clickSort} />
            <Th
              label="Name"
              k="name"
              cur={sortKey}
              dir={sortDir}
              on={clickSort}
              className="name-col"
            />
            <Th label="Faction" k="faction" cur={sortKey} dir={sortDir} on={clickSort} />
            <Th label="Type" k="typeSimplified" cur={sortKey} dir={sortDir} on={clickSort} />
            <Th label="Wpns" k="weapons" cur={sortKey} dir={sortDir} on={clickSort} />
            <Th label="Cons" k="consoles" cur={sortKey} dir={sortDir} on={clickSort} />
            <Th label="Hangars" k="hangars" cur={sortKey} dir={sortDir} on={clickSort} />
            <Th label="Hull" k="hull" cur={sortKey} dir={sortDir} on={clickSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const score = scores.get(s.id);
            const isSel = selected.has(s.id);
            const isOwned = owned.has(s.id);
            return (
              <tr
                key={s.id}
                data-faction={s.faction}
                data-owned={isOwned}
                className={isSel ? "row-selected" : ""}
                onClick={() => onToggleSelect(s.id)}
              >
                <td className="sel-col">
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => onToggleSelect(s.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="owned-col">
                  <button
                    type="button"
                    className="owned-toggle"
                    aria-pressed={isOwned}
                    aria-label={isOwned ? "Unmark as owned" : "Mark as owned"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleOwned(s.id);
                    }}
                  >
                    {isOwned ? "★" : "☆"}
                  </button>
                </td>
                <td className="score">{score?.total.toFixed(1) ?? "-"}</td>
                <td className="name-col">
                  <span className="ship-name">{s.name}</span>
                  {s.wikiUrl && (
                    <a
                      className="wiki-link"
                      href={s.wikiUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      wiki
                    </a>
                  )}
                </td>
                <td>{s.faction}</td>
                <td>{s.typeSimplified}</td>
                <td>
                  {s.weapons.fore}/{s.weapons.aft}
                  {s.weapons.dhc ? " D" : ""}
                </td>
                <td>
                  {s.consoles.tac}/{s.consoles.eng}/{s.consoles.sci}/{s.consoles.uni}
                </td>
                <td>{s.hangars || ""}</td>
                <td>{s.hull ? (s.hull / 1000).toFixed(1) + "k" : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ThProps {
  label: string;
  k: SortKey;
  cur: SortKey;
  dir: "asc" | "desc";
  on: (k: SortKey) => void;
  className?: string;
}

function Th({ label, k, cur, dir, on, className }: ThProps) {
  const active = cur === k;
  const ariaSort: "ascending" | "descending" | "none" = active
    ? dir === "asc"
      ? "ascending"
      : "descending"
    : "none";
  const classes = ["sortable", active ? "active" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <th className={classes} aria-sort={ariaSort}>
      <button type="button" className="sort-btn" onClick={() => on(k)}>
        {label}
        {active ? (dir === "asc" ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
}

function compare(a: Ship, b: Ship, key: SortKey, scores: Map<number, ScoreBreakdown>): number {
  switch (key) {
    case "score":
      return (scores.get(a.id)?.total ?? 0) - (scores.get(b.id)?.total ?? 0);
    case "name":
      return a.name.localeCompare(b.name);
    case "faction":
      return a.faction.localeCompare(b.faction);
    case "typeSimplified":
      return a.typeSimplified.localeCompare(b.typeSimplified);
    case "weapons":
      return a.weapons.total - b.weapons.total;
    case "consoles":
      return (
        a.consoles.tac +
        a.consoles.eng +
        a.consoles.sci +
        a.consoles.uni -
        (b.consoles.tac + b.consoles.eng + b.consoles.sci + b.consoles.uni)
      );
    case "hangars":
      return a.hangars - b.hangars;
    case "hull":
      return a.hull - b.hull;
  }
}
