import type { Filters } from "../domain/filters.ts";

interface Props {
  filters: Filters;
  factions: string[];
  sources: string[];
  shipTypes: string[];
  careers: string[];
  onChange: (f: Filters) => void;
  totalMatching: number;
  totalAll: number;
}

function toggleIn(set: Set<string>, v: string): Set<string> {
  const n = new Set(set);
  if (n.has(v)) n.delete(v);
  else n.add(v);
  return n;
}

export function FiltersPanel({
  filters,
  factions,
  sources,
  shipTypes,
  careers,
  onChange,
  totalMatching,
  totalAll,
}: Props) {
  return (
    <aside className="filters">
      <div className="filters-header">
        <h2>Filters</h2>
        <span className="count">
          {totalMatching} / {totalAll}
        </span>
      </div>

      <label className="field">
        <span>Search</span>
        <input
          type="search"
          name="ship-search"
          value={filters.search}
          placeholder="Ship name..."
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </label>

      <ChipGroup
        label="Faction"
        values={factions}
        selected={filters.factions}
        onToggle={(v) => onChange({ ...filters, factions: toggleIn(filters.factions, v) })}
      />

      <ChipGroup
        label="Career"
        values={careers}
        selected={filters.careers}
        onToggle={(v) => onChange({ ...filters, careers: toggleIn(filters.careers, v) })}
      />

      <ChipGroup
        label="Source"
        values={sources}
        selected={filters.sources}
        onToggle={(v) => onChange({ ...filters, sources: toggleIn(filters.sources, v) })}
      />

      <ChipGroup
        label="Type"
        values={shipTypes}
        selected={filters.shipTypes}
        onToggle={(v) => onChange({ ...filters, shipTypes: toggleIn(filters.shipTypes, v) })}
      />

      <fieldset className="field checkboxes">
        <legend>Features</legend>
        <label>
          <input
            type="checkbox"
            checked={filters.hangarsOnly}
            onChange={(e) => onChange({ ...filters, hangarsOnly: e.target.checked })}
          />{" "}
          Hangars only
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.cloakOnly}
            onChange={(e) => onChange({ ...filters, cloakOnly: e.target.checked })}
          />{" "}
          Cloak only
        </label>
      </fieldset>
    </aside>
  );
}

interface ChipGroupProps {
  label: string;
  values: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}

function ChipGroup({ label, values, selected, onToggle }: ChipGroupProps) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="chips">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            className={`chip ${selected.has(v) ? "chip-on" : ""}`}
            onClick={() => onToggle(v)}
          >
            {v || "—"}
          </button>
        ))}
      </div>
    </div>
  );
}
