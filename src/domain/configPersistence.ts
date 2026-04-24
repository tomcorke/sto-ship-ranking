// Persistence helpers for user-edited scoring configs. The storage
// contract is deliberately simple: a full JSON blob under a single
// key, deep-merged onto DEFAULT_CONFIG at load time so future config
// additions never break older saved state.

import { DEFAULT_CONFIG, type ScoringConfig } from "./scoringConfig.ts";

export const CONFIG_STORAGE_KEY = "sto-ship-ranking.scoringConfig";

// Generic deep-merge: for plain object values, recurse; for anything
// else (numbers, arrays, null, undefined), the partial wins when it is
// defined, otherwise the default stands. We intentionally treat arrays
// as atomic so an override replaces the whole array.
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function mergeConfigDeep<T>(partial: unknown, defaults: T): T {
  if (partial === undefined || partial === null) return defaults;
  if (!isPlainObject(defaults) || !isPlainObject(partial)) {
    // For non-object defaults, a defined partial replaces the default.
    return partial as T;
  }
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const key of Object.keys(partial)) {
    const defVal = (defaults as Record<string, unknown>)[key];
    const partVal = (partial as Record<string, unknown>)[key];
    if (defVal === undefined) {
      // Unknown key - accept whatever the partial gives us.
      out[key] = partVal;
    } else {
      out[key] = mergeConfigDeep(partVal, defVal);
    }
  }
  return out as T;
}

export function loadConfig(): ScoringConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed: unknown = JSON.parse(raw);
    return mergeConfigDeep(parsed, DEFAULT_CONFIG);
  } catch {
    // Corrupt JSON, storage unavailable, or any other failure -> default.
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: ScoringConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Quota / privacy mode / SSR - fall through silently. The in-memory
    // state still updates so the session keeps the user's edits.
  }
}
