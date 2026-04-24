import type { Ship } from "../domain/ship.ts";
import { parseShips } from "../domain/parse.ts";

export interface Dataset {
  ships: Ship[];
}

let cached: Dataset | null = null;
let inflight: Promise<Dataset> | null = null;

export async function loadDataset(): Promise<Dataset> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    // Respect the Vite base path (both "/" in dev and "/sto-ship-ranking/" on Pages)
    const base = import.meta.env.BASE_URL ?? "/";
    const url = `${base}ships.csv`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ships.csv fetch failed: ${res.status}`);
    const csv = await res.text();
    const ships = parseShips(csv);
    cached = { ships };
    return cached;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

// Test-only hook to reset module state between tests.
export function __resetDatasetForTests(): void {
  cached = null;
  inflight = null;
}
