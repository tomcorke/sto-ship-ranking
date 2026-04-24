import { emptyFilters, type Filters } from "../domain/filters.ts";
import type { OwnedMode } from "../domain/ownership.ts";

interface Props {
  filters: Filters;
  factions: string[];
  sources: string[];
  shipTypes: string[];
  careers: string[];
  releaseYears: string[];
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
  if (f.releaseYears.size > 0) n += f.releaseYears.size;
  if (f.search.trim()) n += 1;
  if (f.hangarsOnly) n += 1;
  if (f.cloakOnly) n += 1;
  if (f.ownedMode !== "all") n += 1;
  return n;
}

const OWNED_MODE_OPTIONS: { value: OwnedMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "not-owned", label: "Not owned" },
];

export function FiltersPanel({
  filters,
  factions,
  sources,
  shipTypes,
  careers,
  releaseYears,
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

      <ChipGroup
        label="Year"
        values={releaseYears}
        selected={filters.releaseYears}
        onToggle={(v) => onChange({ ...filters, releaseYears: toggleIn(filters.releaseYears, v) })}
      />

      <ExclusiveChipGroup
        label="Owned"
        options={OWNED_MODE_OPTIONS}
        value={filters.ownedMode}
        onChange={(v) => onChange({ ...filters, ownedMode: v })}
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
  for (const v of filters.releaseYears) {
    chips.push({
      key: `year:${v}`,
      label: v || "-",
      onRemove: () => onChange({ ...filters, releaseYears: removeFrom(filters.releaseYears, v) }),
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
  if (filters.ownedMode === "owned") {
    chips.push({
      key: `ownedMode`,
      label: "Owned only",
      onRemove: () => onChange({ ...filters, ownedMode: "all" }),
    });
  } else if (filters.ownedMode === "not-owned") {
    chips.push({
      key: `ownedMode`,
      label: "Not owned",
      onRemove: () => onChange({ ...filters, ownedMode: "all" }),
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

interface ExclusiveChipGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function ExclusiveChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: ExclusiveChipGroupProps<T>) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="chips" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const on = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              className={`chip ${on ? "chip-on" : ""}`}
              aria-checked={on}
              aria-pressed={on}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
