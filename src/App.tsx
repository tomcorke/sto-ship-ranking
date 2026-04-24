import { useEffect, useMemo, useRef, useState } from "react";
import { ships, scores } from "./data/shipsData.ts";
import { ActiveFilters, FiltersPanel } from "./components/Filters.tsx";
import { ShipTable } from "./components/ShipTable.tsx";
import { Comparison } from "./components/Comparison.tsx";
import { applyFilters, emptyFilters, uniqueValues } from "./domain/filters.ts";
import { deserialiseState, serialiseState } from "./domain/urlState.ts";

const DISCLAIMER_KEY = "sto-ship-ranking.disclaimer.dismissed";

export default function App() {
  const [filters, setFilters] = useState(emptyFilters);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(true);
  const hydrated = useRef(false);

  // Hydrate from hash + localStorage once on mount.
  useEffect(() => {
    const parsed = deserialiseState(window.location.hash);
    setFilters(parsed.filters);
    setSelected(parsed.selected);
    try {
      setDisclaimerDismissed(localStorage.getItem(DISCLAIMER_KEY) === "1");
    } catch {
      setDisclaimerDismissed(false);
    }
    hydrated.current = true;
  }, []);

  // Write back to the hash on state changes (replaceState, no history entries).
  useEffect(() => {
    if (!hydrated.current) return;
    const hash = serialiseState({ filters, selected });
    const url = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [filters, selected]);

  const filtered = useMemo(() => applyFilters(ships, filters), [filters]);

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
          Filter, compare, and rank Star Trek Online starships. Data: {ships.length} T6 ships from
          Fleffle's list.
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
          />
          <ShipTable
            ships={filtered}
            scores={scores}
            selected={selected}
            onToggleSelect={toggleSelect}
          />
        </div>
      </div>
    </main>
  );
}
