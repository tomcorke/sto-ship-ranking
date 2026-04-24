import { useMemo, useState, type RefObject } from "react";
import type { Ship } from "../domain/ship.ts";
import type { ScoreBreakdown } from "../domain/score.ts";
import { ROLES, type Role } from "../domain/scoringConfig.ts";
import { suggestRole } from "../domain/roleDetect.ts";
import type { RoleView } from "../domain/urlState.ts";
import { computeRanking, scoreFor as rankingScoreFor } from "../domain/ranking.ts";

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
  roleView: RoleView;
  onRoleViewChange: (v: RoleView) => void;
  onOpenRubric?: () => void;
  rubricTriggerRef?: RefObject<HTMLButtonElement>;
}

const ROLE_LABEL: Record<RoleView, string> = {
  overall: "Overall",
  dps: "DPS",
  tank: "Tank",
  sci: "Sci",
  support: "Support",
};

const SCORE_HEADER: Record<RoleView, string> = {
  overall: "Score",
  dps: "DPS Score",
  tank: "Tank Score",
  sci: "Sci Score",
  support: "Support Score",
};

const ROLE_VIEWS: RoleView[] = ["overall", ...ROLES];

// Pick the total that should be ranked by when a role tab is active.
// Falls back to overall total when role data is missing (e.g. config
// without the roles overlay).
const scoreFor = rankingScoreFor;

export function ShipTable({
  ships,
  scores,
  selected,
  onToggleSelect,
  owned,
  onToggleOwned,
  roleView,
  onRoleViewChange,
  onOpenRubric,
  rubricTriggerRef,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...ships];
    arr.sort((a, b) => {
      const v = compare(a, b, sortKey, scores, roleView);
      return sortDir === "asc" ? v : -v;
    });
    return arr;
  }, [ships, sortKey, sortDir, scores, roleView]);

  // Rank + percent are computed from the filtered ship set under the current
  // role view, independent of the currently-selected sort. This means rank 1
  // is always the top-scoring ship in what the user is looking at, and
  // percentages recompute automatically when filters or the role tab change.
  const { rankMap, percentMap } = useMemo(
    () => computeRanking(ships, scores, roleView),
    [ships, scores, roleView],
  );

  const clickSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(k === "name" || k === "faction" ? "asc" : "desc");
    }
  };

  return (
    <div className="table-wrap">
      <div className="role-tabs-bar">
        <div className="role-tabs" role="tablist" aria-label="Role view">
          {ROLE_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              className={`role-tab ${roleView === v ? "active" : ""}`}
              aria-pressed={roleView === v}
              data-role={v}
              onClick={() => onRoleViewChange(v)}
            >
              {ROLE_LABEL[v]}
            </button>
          ))}
        </div>
        {onOpenRubric && (
          <button
            type="button"
            ref={rubricTriggerRef}
            className="rubric-bar-btn"
            onClick={onOpenRubric}
            title="Open scoring rubric - view and edit how scores are calculated"
          >
            Scoring rubric
          </button>
        )}
      </div>
      <table className="ship-table">
        <thead>
          <tr>
            <th className="sel-col" aria-label="select" />
            <th className="owned-col" aria-label="Owned" title="Owned">
              <span aria-hidden="true">★</span>
            </th>
            <th className="rank-col" scope="col" title="Rank within current view">
              #
            </th>
            <th className="percent-col" scope="col" title="Percent of top-ranked ship's score">
              %
            </th>
            <Th
              label={SCORE_HEADER[roleView]}
              k="score"
              cur={sortKey}
              dir={sortDir}
              on={clickSort}
            />
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
            const suggested: Role = score?.suggestedRole ?? suggestRole(s.typeSimplified);
            const aligned = roleView !== "overall" && roleView === suggested;
            const cellValue = scoreFor(score, roleView);
            const classes = [isSel ? "row-selected" : "", aligned ? "role-aligned" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <tr
                key={s.id}
                data-faction={s.faction}
                data-owned={isOwned}
                className={classes}
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
                <td className="rank-col">{rankMap.get(s.id) ?? ""}</td>
                <td className="percent-col">
                  {score ? `${(percentMap.get(s.id) ?? 0).toFixed(1)}%` : ""}
                </td>
                <td className="score">{score ? cellValue.toFixed(1) : "-"}</td>
                <td className="name-col">
                  <span className="ship-name">{s.name}</span>
                  {s.wikiUrl && (
                    <a
                      className="ship-wiki-link"
                      href={s.wikiUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`${s.name} on stowiki`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      ↗
                    </a>
                  )}
                </td>
                <td>{s.faction}</td>
                <td>
                  <span className="type-with-pip">
                    <span
                      className="role-pip"
                      data-role={suggested}
                      aria-label={`Suggested role: ${ROLE_LABEL[suggested]}`}
                      title={`Suggested role: ${ROLE_LABEL[suggested]}`}
                    >
                      {suggested.slice(0, 3).toUpperCase()}
                    </span>
                    {s.typeSimplified}
                  </span>
                </td>
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

function compare(
  a: Ship,
  b: Ship,
  key: SortKey,
  scores: Map<number, ScoreBreakdown>,
  roleView: RoleView,
): number {
  switch (key) {
    case "score":
      return scoreFor(scores.get(a.id), roleView) - scoreFor(scores.get(b.id), roleView);
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
