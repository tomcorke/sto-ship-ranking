import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { loadOwned, matchesOwnedMode, saveOwned } from "../ownership.ts";

const STORAGE_KEY = "sto-ship-ranking.owned";

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

describe("ownership storage", () => {
  beforeEach(() => {
    // Each test gets a fresh in-memory store.
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });

  afterEach(() => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });

  it("loadOwned returns an empty Set when nothing has been saved", () => {
    expect(loadOwned().size).toBe(0);
  });

  it("loadOwned returns an empty Set when the stored value is not valid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadOwned().size).toBe(0);
  });

  it("loadOwned returns an empty Set when the stored value is not an array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 1 }));
    expect(loadOwned().size).toBe(0);
  });

  it("loadOwned ignores non-numeric entries in the stored array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, "two", null, 3]));
    const result = loadOwned();
    expect([...result].sort((a, b) => a - b)).toEqual([1, 3]);
  });

  it("saveOwned + loadOwned round-trips a Set", () => {
    const input = new Set<number>([7, 1, 42]);
    saveOwned(input);
    const loaded = loadOwned();
    expect([...loaded].sort((a, b) => a - b)).toEqual([1, 7, 42]);
  });

  it("saveOwned does not throw when storage is unavailable", () => {
    // Replace localStorage with one that throws from setItem.
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
      clear: () => {},
    };
    (globalThis as unknown as { localStorage: unknown }).localStorage = throwing;
    expect(() => saveOwned(new Set([1]))).not.toThrow();
  });
});

describe("matchesOwnedMode", () => {
  const owned = new Set<number>([1, 2, 3]);

  it("all mode matches every id", () => {
    expect(matchesOwnedMode(1, owned, "all")).toBe(true);
    expect(matchesOwnedMode(99, owned, "all")).toBe(true);
  });

  it("owned mode matches only ids in the set", () => {
    expect(matchesOwnedMode(1, owned, "owned")).toBe(true);
    expect(matchesOwnedMode(99, owned, "owned")).toBe(false);
  });

  it("not-owned mode matches only ids absent from the set", () => {
    expect(matchesOwnedMode(1, owned, "not-owned")).toBe(false);
    expect(matchesOwnedMode(99, owned, "not-owned")).toBe(true);
  });
});
