import { useEffect, useMemo, useState } from "react";
import { ships, scores } from "./data/shipsData.ts";
import { ActiveFilters, FiltersPanel } from "./components/Filters.tsx";
import { ShipTable } from "./components/ShipTable.tsx";
import { Comparison } from "./components/Comparison.tsx";
import { applyFilters, uniqueValues } from "./domain/filters.ts";
import { loadOwned, saveOwned } from "./domain/ownership.ts";
import { deserialiseState, serialiseState } from "./domain/urlState.ts";

const DISCLAIMER_KEY = "sto-ship-ranking.disclaimer.dismissed";

const readDisclaimerDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) === "1";
  } catch {
    return false;
  }
};

export default function App() {
  const [filters, setFilters] = useState(() => deserialiseState(window.location.hash).filters);
  const [selected, setSelected] = useState<Set<number>>(
    () => deserialiseState(window.location.hash).selected,
  );
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(readDisclaimerDismissed);
  const [owned, setOwned] = useState<Set<number>>(loadOwned);

  // Write back to the hash on state changes (replaceState, no history entries).
  useEffect(() => {
    const hash = serialiseState({ filters, selected });
    const url = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [filters, selected]);

  const filtered = useMemo(() => applyFilters(ships, filters, owned), [filters, owned]);

  const factions = useMemo(() => uniqueValues(ships, (s) => s.faction), []);
  const sources = useMemo(() => uniqueValues(ships, (s) => s.source), []);
  const shipTypes = useMemo(() => uniqueValues(ships, (s) => s.typeSimplified), []);
  const careers = useMemo(() => uniqueValues(ships, (s) => s.career || ""), []);

  const selectedShips = useMemo(() => ships.filter((s) => selected.has(s.id)), [selected]);

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

  return (
    <main className="app">
      <header>
        <h1>STO Ship Ranking</h1>
        <p>
          Filter, compare, and rank Star Trek Online starships. {ships.length} T6 ships. Data
          courtesy of{" "}
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
            Scores are a rough heuristic - use as a starting point, not a verdict. Click the Score
            column header for the rubric breakdown.
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

      <div className="layout">
        <FiltersPanel
          filters={filters}
          factions={factions}
          sources={sources}
          shipTypes={shipTypes}
          careers={careers}
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
          />
          <ShipTable
            ships={filtered}
            scores={scores}
            selected={selected}
            onToggleSelect={toggleSelect}
            owned={owned}
            onToggleOwned={toggleOwned}
          />
        </div>
      </div>

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
