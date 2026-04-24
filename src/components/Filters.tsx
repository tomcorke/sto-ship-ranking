import { emptyFilters, type Filters } from "../domain/filters.ts";

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

function removeFrom(set: Set<string>, v: string): Set<string> {
  const n = new Set(set);
  n.delete(v);
  return n;
}

function countActive(f: Filters): number {
  let n = 0;
  if (f.factions.size > 0) n += f.factions.size;
  if (f.careers.size > 0) n += f.careers.size;
  if (f.sources.size > 0) n += f.sources.size;
  if (f.shipTypes.size > 0) n += f.shipTypes.size;
  if (f.search.trim()) n += 1;
  if (f.hangarsOnly) n += 1;
  if (f.cloakOnly) n += 1;
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
  const activeCount = countActive(filters);
  return (
    <aside className="filters">
      <div className="filters-header">
        <h2>Filters</h2>
        <span className="count">
          {totalMatching} / {totalAll}
        </span>
      </div>

      {activeCount > 0 && (
        <div className="filters-summary">
          <span>
            {activeCount} filter{activeCount === 1 ? "" : "s"} active
          </span>
          <button type="button" className="link clear-all" onClick={() => onChange(emptyFilters())}>
            Clear all
          </button>
        </div>
      )}

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

interface ActiveFiltersProps {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export function ActiveFilters({ filters, onChange }: ActiveFiltersProps) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  for (const v of filters.factions) {
    chips.push({
      key: `faction:${v}`,
      label: v || "-",
      onRemove: () => onChange({ ...filters, factions: removeFrom(filters.factions, v) }),
    });
  }
  for (const v of filters.careers) {
    chips.push({
      key: `career:${v}`,
      label: v || "-",
      onRemove: () => onChange({ ...filters, careers: removeFrom(filters.careers, v) }),
    });
  }
  for (const v of filters.sources) {
    chips.push({
      key: `source:${v}`,
      label: v || "-",
      onRemove: () => onChange({ ...filters, sources: removeFrom(filters.sources, v) }),
    });
  }
  for (const v of filters.shipTypes) {
    chips.push({
      key: `type:${v}`,
      label: v || "-",
      onRemove: () => onChange({ ...filters, shipTypes: removeFrom(filters.shipTypes, v) }),
    });
  }
  if (filters.search.trim()) {
    chips.push({
      key: `search`,
      label: `search: ${filters.search}`,
      onRemove: () => onChange({ ...filters, search: "" }),
    });
  }
  if (filters.hangarsOnly) {
    chips.push({
      key: `hangarsOnly`,
      label: "hangars only",
      onRemove: () => onChange({ ...filters, hangarsOnly: false }),
    });
  }
  if (filters.cloakOnly) {
    chips.push({
      key: `cloakOnly`,
      label: "cloak only",
      onRemove: () => onChange({ ...filters, cloakOnly: false }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="active-filters" aria-label="Active filters">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          className="active-chip"
          onClick={c.onRemove}
          aria-label={`Remove ${c.label}`}
        >
          {c.label} <span aria-hidden="true">×</span>
        </button>
      ))}
    </div>
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
        {values.map((v) => {
          const on = selected.has(v);
          return (
            <button
              key={v}
              type="button"
              className={`chip ${on ? "chip-on" : ""}`}
              aria-pressed={on}
              onClick={() => onToggle(v)}
            >
              {v || "-"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
