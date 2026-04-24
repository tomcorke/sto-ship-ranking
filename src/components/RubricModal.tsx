import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  DEFAULT_CONFIG,
  DEFAULT_ROLE_WEIGHTS,
  ROLES,
  type Role,
  type RoleWeights,
  type ScoringConfig,
} from "../domain/scoringConfig.ts";

interface Props {
  open: boolean;
  config: ScoringConfig;
  onChange: (next: ScoringConfig) => void;
  onClose: () => void;
}

type TabId = "overview" | "weights" | "roles";

// The 11 top-level category keys mirrored from RoleWeights. Single
// source of truth for the overlay axes surfaced in the Weights and
// Roles tabs.
const CATEGORY_KEYS = [
  "weapons",
  "consoles",
  "boffAbilities",
  "trait",
  "hangars",
  "misc",
  "cruiserCommands",
  "scienceFeatures",
  "defense",
  "mobility",
  "power",
] as const satisfies readonly (keyof RoleWeights)[];

type CategoryKey = (typeof CATEGORY_KEYS)[number];

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  weapons: "Weapons",
  consoles: "Consoles",
  boffAbilities: "BOff abilities",
  trait: "Starship trait",
  hangars: "Hangars",
  misc: "Misc features",
  cruiserCommands: "Cruiser commands",
  scienceFeatures: "Science features",
  defense: "Defense",
  mobility: "Mobility",
  power: "Power bonus",
};

const CATEGORY_DESCRIPTION: Record<CategoryKey, string> = {
  weapons: "Fore and aft weapon slots; DHC and experimental bonuses.",
  consoles: "Tac, Eng, Sci, and Universal console counts.",
  boffAbilities: "Highest-tier Tac/Eng/Sci abilities plus specialisation depth.",
  trait: "Starship trait scored for damage, utility, and survivability keywords.",
  hangars: "Pet bays with diminishing returns after the second.",
  misc: "Cloak, flanking, wingmen, and singularity specials.",
  cruiserCommands: "Weapon, shield, engine, and threat auras for the fleet.",
  scienceFeatures: "Secondary deflector, sensor analysis, subsystem targeting, tac mode.",
  defense: "Z-scored hull, shield modifier, and defense/hull mod.",
  mobility: "Z-scored turn rate and impulse mod; inertia applied as a penalty.",
  power: "Z-scored sum of weapons/shield/engine/aux power bonuses.",
};

const ROLE_LABEL: Record<Role, string> = {
  dps: "DPS",
  tank: "Tank",
  sci: "Sci",
  support: "Support",
};

function valueOf(overlay: RoleWeights | undefined, key: CategoryKey): number {
  const v = overlay?.[key];
  return typeof v === "number" ? v : 1;
}

function withOverlayValue(
  overlay: RoleWeights | undefined,
  key: CategoryKey,
  value: number,
): RoleWeights {
  return { ...overlay, [key]: value };
}

export function RubricModal({ open, config, onChange, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  // Open / close the native <dialog> in sync with the prop. Using
  // showModal gives us focus-trap + ESC + backdrop behaviour for free.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Native dialog closes via ESC or its own API fire a `close` event; we
  // forward that to onClose so the parent state stays in sync.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => onClose();
    el.addEventListener("close", handler);
    return () => el.removeEventListener("close", handler);
  }, [onClose]);

  // Click on the backdrop (outside the dialog content) closes the modal.
  const onDialogClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      dialogRef.current?.close();
    }
  };

  const updateOverall = (key: CategoryKey, value: number) => {
    onChange({
      ...config,
      overall: withOverlayValue(config.overall, key, value),
    });
  };

  const updateRole = (role: Role, key: CategoryKey, value: number) => {
    const nextRoles = {
      ...(config.roles ?? DEFAULT_ROLE_WEIGHTS),
    };
    nextRoles[role] = withOverlayValue(nextRoles[role], key, value);
    onChange({ ...config, roles: nextRoles });
  };

  const resetOverall = () => {
    onChange({ ...config, overall: { ...DEFAULT_CONFIG.overall! } });
  };

  const resetRole = (role: Role) => {
    const nextRoles = { ...(config.roles ?? DEFAULT_ROLE_WEIGHTS) };
    nextRoles[role] = { ...DEFAULT_ROLE_WEIGHTS[role] };
    onChange({ ...config, roles: nextRoles });
  };

  const resetAllRoles = () => {
    onChange({
      ...config,
      roles: {
        dps: { ...DEFAULT_ROLE_WEIGHTS.dps },
        tank: { ...DEFAULT_ROLE_WEIGHTS.tank },
        sci: { ...DEFAULT_ROLE_WEIGHTS.sci },
        support: { ...DEFAULT_ROLE_WEIGHTS.support },
      },
    });
  };

  return (
    <dialog className="rubric-modal" ref={dialogRef} onClick={onDialogClick}>
      <div className="rubric-modal-inner" onClick={(e) => e.stopPropagation()}>
        <header className="rubric-modal-head">
          <h2>Scoring rubric</h2>
          <button
            type="button"
            className="rubric-close"
            aria-label="Close scoring rubric"
            onClick={() => dialogRef.current?.close()}
          >
            ×
          </button>
        </header>

        <div className="rubric-tabs" role="tablist" aria-label="Rubric sections">
          {(["overview", "weights", "roles"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={`rubric-tab ${tab === id ? "active" : ""}`}
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {id === "overview" ? "Overview" : id === "weights" ? "Weights" : "Roles"}
            </button>
          ))}
        </div>

        <div className="rubric-body">
          {tab === "overview" && <OverviewTab config={config} />}
          {tab === "weights" && (
            <WeightsTab config={config} onChange={updateOverall} onReset={resetOverall} />
          )}
          {tab === "roles" && (
            <RolesTab
              config={config}
              onChange={updateRole}
              onResetRole={resetRole}
              onResetAll={resetAllRoles}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}

function OverviewTab({ config }: { config: ScoringConfig }) {
  return (
    <div className="rubric-overview">
      <p>
        Each ship is scored by summing eleven category points. The Weights tab scales each
        category's contribution overall; the Roles tab layers per-role overlays so DPS, Tank, Sci,
        and Support rankings reshape the same points into role-specific totals.
      </p>
      <table className="rubric-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Default</th>
            <th>Current</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORY_KEYS.map((k) => {
            const def = valueOf(DEFAULT_CONFIG.overall, k);
            const cur = valueOf(config.overall, k);
            const changed = Math.abs(def - cur) > 1e-9;
            return (
              <tr key={k}>
                <td>{CATEGORY_LABEL[k]}</td>
                <td>{def.toFixed(2)}</td>
                <td className={changed ? "rubric-changed" : ""}>{cur.toFixed(2)}</td>
                <td className="rubric-desc">{CATEGORY_DESCRIPTION[k]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WeightsTab({
  config,
  onChange,
  onReset,
}: {
  config: ScoringConfig;
  onChange: (key: CategoryKey, value: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="rubric-weights">
      <p className="rubric-lead">
        Overall category multipliers. 1.0 is the default weight; 0 disables a category entirely.
      </p>
      <div className="rubric-slider-grid">
        {CATEGORY_KEYS.map((k) => (
          <WeightSlider
            key={k}
            label={CATEGORY_LABEL[k]}
            value={valueOf(config.overall, k)}
            onChange={(v) => onChange(k, v)}
          />
        ))}
      </div>
      <div className="rubric-actions">
        <button type="button" className="rubric-btn secondary" onClick={onReset}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

function RolesTab({
  config,
  onChange,
  onResetRole,
  onResetAll,
}: {
  config: ScoringConfig;
  onChange: (role: Role, key: CategoryKey, value: number) => void;
  onResetRole: (role: Role) => void;
  onResetAll: () => void;
}) {
  const [activeRole, setActiveRole] = useState<Role>("dps");
  const overlay = (config.roles ?? DEFAULT_ROLE_WEIGHTS)[activeRole];

  return (
    <div className="rubric-roles">
      <div className="rubric-role-switch" role="tablist" aria-label="Role to edit">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            className={`rubric-tab ${activeRole === r ? "active" : ""}`}
            aria-selected={activeRole === r}
            onClick={() => setActiveRole(r)}
          >
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>
      <p className="rubric-lead">
        Per-category multiplier applied to the {ROLE_LABEL[activeRole]} role total. Unset categories
        default to 1.0.
      </p>
      <div className="rubric-slider-grid">
        {CATEGORY_KEYS.map((k) => (
          <WeightSlider
            key={k}
            label={CATEGORY_LABEL[k]}
            value={valueOf(overlay, k)}
            onChange={(v) => onChange(activeRole, k, v)}
          />
        ))}
      </div>
      <div className="rubric-actions">
        <button
          type="button"
          className="rubric-btn secondary"
          onClick={() => onResetRole(activeRole)}
        >
          Reset {ROLE_LABEL[activeRole]}
        </button>
        <button type="button" className="rubric-btn secondary" onClick={onResetAll}>
          Reset all roles
        </button>
      </div>
    </div>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  // Allow the number input to drive any value the user types, but
  // clamp into the slider's visible 0..3 range for the range input.
  return (
    <label className="rubric-slider">
      <span className="rubric-slider-label">{label}</span>
      <input
        type="range"
        min={0}
        max={3}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} weight`}
      />
      <input
        type="number"
        min={0}
        max={10}
        step={0.05}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="rubric-slider-number"
        aria-label={`${label} weight numeric`}
      />
    </label>
  );
}
