const STORAGE_KEY = "sto-ship-ranking.owned";

export type OwnedMode = "all" | "owned" | "not-owned";

/**
 * Load the set of owned ship IDs from localStorage.
 * Tolerates missing, corrupt, or non-array data by returning an empty set.
 * Never throws.
 */
export function loadOwned(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const out = new Set<number>();
    for (const v of parsed) {
      if (typeof v === "number" && Number.isFinite(v)) out.add(v);
    }
    return out;
  } catch {
    return new Set();
  }
}

/**
 * Persist the set of owned ship IDs to localStorage as a JSON array.
 * Swallows quota / privacy-mode errors silently.
 */
export function saveOwned(owned: Set<number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...owned]));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

/**
 * Pure predicate: does a ship ID match the given OwnedMode?
 * - "all": always true
 * - "owned": owned.has(id)
 * - "not-owned": !owned.has(id)
 */
export function matchesOwnedMode(id: number, owned: Set<number>, mode: OwnedMode): boolean {
  switch (mode) {
    case "all":
      return true;
    case "owned":
      return owned.has(id);
    case "not-owned":
      return !owned.has(id);
  }
}
