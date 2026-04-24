import { useEffect, useMemo, useRef, useState } from "react";
import { loadDataset, type Dataset } from "./data/shipsData.ts";
import { ActiveFilters, FiltersPanel } from "./components/Filters.tsx";
import { ShipTable } from "./components/ShipTable.tsx";
import { Comparison } from "./components/Comparison.tsx";
import { RubricModal } from "./components/RubricModal.tsx";
import { applyFilters, uniqueValues } from "./domain/filters.ts";
import { loadOwned, saveOwned } from "./domain/ownership.ts";
import { computeRanking } from "./domain/ranking.ts";
import { loadConfig, saveConfig } from "./domain/configPersistence.ts";
import { scoreAll } from "./domain/score.ts";
import type { ScoreBreakdown } from "./domain/score.ts";
import type { ScoringConfig } from "./domain/scoringConfig.ts";
import { deserialiseState, serialiseState, type RoleView } from "./domain/urlState.ts";

const DISCLAIMER_KEY = "sto-ship-ranking.disclaimer.dismissed";

const readDisclaimerDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) === "1";
  } catch {
    return false;
  }
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; dataset: Dataset }
  | { status: "error"; error: Error };

export default function App() {
  const [filters, setFilters] = useState(() => deserialiseState(window.location.hash).filters);
  const [selected, setSelected] = useState<Set<number>>(
    () => deserialiseState(window.location.hash).selected,
  );
  const [roleView, setRoleView] = useState<RoleView>(
    () => deserialiseState(window.location.hash).roleView,
  );
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(readDisclaimerDismissed);
  const [owned, setOwned] = useState<Set<number>>(loadOwned);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [retryToken, setRetryToken] = useState(0);
  const [config, setConfig] = useState<ScoringConfig>(() => loadConfig());
  const [rubricOpen, setRubricOpen] = useState(false);
  const rubricTriggerRef = useRef<HTMLButtonElement>(null);

  // Persist config edits immediately; no debounce needed - writes are
  // small and saving-per-keystroke is fine for localStorage.
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // Kick off dataset load on mount / retry.
  useEffect(() => {
    let cancelled = false;
    setLoadState({ status: "loading" });
    loadDataset().then(
      (dataset) => {
        if (!cancelled) setLoadState({ status: "ready", dataset });
      },
      (err: unknown) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          setLoadState({ status: "error", error });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  // Write back to the hash on state changes (replaceState, no history entries).
  useEffect(() => {
    const hash = serialiseState({ filters, selected, roleView });
    const url = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [filters, selected, roleView]);

  const ships = loadState.status === "ready" ? loadState.dataset.ships : [];
  // Scores are derived from the current config so weight edits re-rank
  // the table live. Recomputing against the full fleet keeps z-scored
  // categories (defense / mobility / power) stable across edits.
  const scores = useMemo<Map<number, ScoreBreakdown>>(
    () => (ships.length > 0 ? scoreAll(ships, config) : new Map()),
    [ships, config],
  );

  const filtered = useMemo(() => applyFilters(ships, filters, owned), [ships, filters, owned]);

  const factions = useMemo(() => uniqueValues(ships, (s) => s.faction), [ships]);
  const sources = useMemo(() => uniqueValues(ships, (s) => s.source), [ships]);
  const shipTypes = useMemo(() => uniqueValues(ships, (s) => s.typeSimplified), [ships]);
  const careers = useMemo(() => uniqueValues(ships, (s) => s.career || ""), [ships]);
  const releaseYears = useMemo(() => {
    const seen = new Set<string>();
    for (const s of ships) {
      if (s.year != null) seen.add(String(s.year));
    }
    return [...seen].sort((a, b) => Number(b) - Number(a));
  }, [ships]);

  const selectedShips = useMemo(() => ships.filter((s) => selected.has(s.id)), [ships, selected]);

  // Rank and percent-of-top are computed against the current filtered set
  // under the active role view, so Comparison can show the same numbers
  // that ShipTable shows for any ship the user has selected.
  const { rankMap, percentMap } = useMemo(
    () => computeRanking(filtered, scores, roleView),
    [filtered, scores, roleView],
  );

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleOwned = (id: number) => {
    setOwned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveOwned(next);
      return next;
    });
  };

  const dismissDisclaimer = () => {
    setDisclaimerDismissed(true);
    try {
      localStorage.setItem(DISCLAIMER_KEY, "1");
    } catch {
      // ignore quota / privacy-mode errors
    }
  };

  const isReady = loadState.status === "ready";
  const shipCountLabel = isReady ? `${ships.length} T6 ships.` : "Loading ships...";

  return (
    <main className="app">
      <header>
        <h1>STO Ship Ranking</h1>
        <p>
          Filter, compare, and rank Star Trek Online starships. {shipCountLabel} Data courtesy of{" "}
          <a
            href="https://docs.google.com/spreadsheets/d/1SSsxWmE8Oz35D6MvLheFNUfhWerHNkUGOGtjxLlrTuA/edit"
            target="_blank"
            rel="noreferrer noopener"
          >
            Fleffle's T6 Ship List v2
          </a>{" "}
          (maintained by @vanderben).
        </p>
      </header>

      {!disclaimerDismissed && (
        <div className="disclaimer" role="note">
          <span>
            Scores are a rough heuristic - use as a starting point, not a verdict. Click the (?)
            next to the Score column for the rubric breakdown.
          </span>
          <button
            type="button"
            className="disclaimer-close"
            onClick={dismissDisclaimer}
            aria-label="Dismiss disclaimer"
          >
            ×
          </button>
        </div>
      )}

      {loadState.status === "loading" && (
        <div className="loading" role="status" aria-live="polite">
          Loading ships...
        </div>
      )}

      {loadState.status === "error" && (
        <div className="loading loading-error" role="alert">
          <p>Failed to load ship data: {loadState.error.message}</p>
          <button type="button" onClick={() => setRetryToken((t) => t + 1)}>
            Retry
          </button>
        </div>
      )}

      {isReady && (
        <div className="layout">
          <FiltersPanel
            filters={filters}
            factions={factions}
            sources={sources}
            shipTypes={shipTypes}
            careers={careers}
            releaseYears={releaseYears}
            onChange={setFilters}
            totalMatching={filtered.length}
            totalAll={ships.length}
          />

          <div className="main-col">
            <ActiveFilters filters={filters} onChange={setFilters} />
            <Comparison
              ships={selectedShips}
              scores={scores}
              onRemove={toggleSelect}
              onClear={() => setSelected(new Set())}
              owned={owned}
              onToggleOwned={toggleOwned}
              roleView={roleView}
              rankMap={rankMap}
              percentMap={percentMap}
            />
            <ShipTable
              ships={filtered}
              scores={scores}
              selected={selected}
              onToggleSelect={toggleSelect}
              owned={owned}
              onToggleOwned={toggleOwned}
              roleView={roleView}
              onRoleViewChange={setRoleView}
              onOpenRubric={() => setRubricOpen(true)}
              rubricTriggerRef={rubricTriggerRef}
            />
          </div>
        </div>
      )}

      <RubricModal
        open={rubricOpen}
        config={config}
        onChange={setConfig}
        onClose={() => {
          setRubricOpen(false);
          // Return focus to the trigger so keyboard users land back
          // where they were before opening the modal.
          rubricTriggerRef.current?.focus();
        }}
      />

      <footer className="app-footer">
        <p>
          Ship stats aggregated from{" "}
          <a
            href="https://docs.google.com/spreadsheets/d/1SSsxWmE8Oz35D6MvLheFNUfhWerHNkUGOGtjxLlrTuA/edit"
            target="_blank"
            rel="noreferrer noopener"
          >
            Fleffle's T6 Ship List v2
          </a>
          , a community-maintained catalogue by @vanderben. All credit for the underlying data goes
          to Fleffle and contributors. This site is an unofficial visualisation tool and is not
          affiliated with Cryptic Studios, Perfect World, or Star Trek Online.
        </p>
      </footer>
    </main>
  );
}
