import { useMemo, useState } from "react";
import { ships, scores } from "./data/shipsData.ts";
import { FiltersPanel } from "./components/Filters.tsx";
import { ShipTable } from "./components/ShipTable.tsx";
import { Comparison } from "./components/Comparison.tsx";
import { applyFilters, emptyFilters, uniqueValues } from "./domain/filters.ts";

export default function App() {
  const [filters, setFilters] = useState(emptyFilters);
  const [selected, setSelected] = useState<Set<number>>(new Set());

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

  return (
    <main className="app">
      <header>
        <h1>STO Ship Ranking</h1>
        <p>
          Filter, compare, and rank Star Trek Online starships. Data: {ships.length} T6 ships from
          Fleffle's list.
        </p>
      </header>

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
