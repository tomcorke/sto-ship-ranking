import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import {
  CONFIG_STORAGE_KEY,
  loadConfig,
  mergeConfigDeep,
  saveConfig,
} from "../configPersistence.ts";
import { DEFAULT_CONFIG } from "../scoringConfig.ts";

// Minimal localStorage shim that persists for the duration of a test.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

describe("configPersistence", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });

  afterEach(() => {
    delete (globalThis as unknown as { localStorage?: MemoryStorage }).localStorage;
  });

  it("loadConfig returns DEFAULT_CONFIG when storage is empty", () => {
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it("saveConfig then loadConfig round-trips the full config", () => {
    const edited = {
      ...DEFAULT_CONFIG,
      weapons: { ...DEFAULT_CONFIG.weapons, fore: 2.5 },
    };
    saveConfig(edited);
    const loaded = loadConfig();
    expect(loaded).toEqual(edited);
    expect(loaded.weapons.fore).toBe(2.5);
  });

  it("loadConfig tolerates corrupt JSON and returns DEFAULT_CONFIG", () => {
    localStorage.setItem(CONFIG_STORAGE_KEY, "{not valid json");
    // Should not throw.
    const loaded = loadConfig();
    expect(loaded).toEqual(DEFAULT_CONFIG);
  });

  it("deep-merges a partial config onto DEFAULT_CONFIG", () => {
    // Only a deeply-nested override stored.
    const partial = {
      roles: {
        dps: {
          weapons: 2.0,
        },
      },
    };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(partial));

    const loaded = loadConfig();

    // Overridden value wins.
    expect(loaded.roles?.dps.weapons).toBe(2.0);
    // Siblings inside the dps overlay are preserved from defaults.
    expect(loaded.roles?.dps.consoles).toBe(DEFAULT_CONFIG.roles!.dps.consoles);
    // Other role overlays are untouched.
    expect(loaded.roles?.tank).toEqual(DEFAULT_CONFIG.roles!.tank);
    // Completely separate sections (weapons, consoles, etc.) come from defaults.
    expect(loaded.weapons).toEqual(DEFAULT_CONFIG.weapons);
    expect(loaded.defense).toEqual(DEFAULT_CONFIG.defense);
    expect(loaded.cruiserCommand).toBe(DEFAULT_CONFIG.cruiserCommand);
  });

  it("mergeConfigDeep leaves defaults intact when partial is missing", () => {
    expect(mergeConfigDeep(undefined, DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG);
    expect(mergeConfigDeep(null, DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG);
    expect(mergeConfigDeep({}, DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG);
  });

  it("mergeConfigDeep replaces scalar leaves but keeps sibling defaults", () => {
    const merged = mergeConfigDeep({ weapons: { fore: 9 }, cruiserCommand: 1.5 }, DEFAULT_CONFIG);
    expect(merged.weapons.fore).toBe(9);
    expect(merged.weapons.aft).toBe(DEFAULT_CONFIG.weapons.aft);
    expect(merged.cruiserCommand).toBe(1.5);
    expect(merged.consoles).toEqual(DEFAULT_CONFIG.consoles);
  });
});
