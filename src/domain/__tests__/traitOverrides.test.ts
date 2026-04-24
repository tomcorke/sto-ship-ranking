import { describe, expect, it } from "vite-plus/test";

import { allOverrideNames, lookupTraitOverride } from "../traitOverrides.ts";

describe("lookupTraitOverride", () => {
  it("returns a curated entry with the expected shape for a known trait", () => {
    const result = lookupTraitOverride("Super Charged Weapons");
    expect(result).not.toBeNull();
    expect(typeof result!.damage).toBe("number");
    expect(typeof result!.utility).toBe("number");
    // survivability is optional but must be numeric when present
    if (result!.survivability !== undefined) {
      expect(typeof result!.survivability).toBe("number");
    }
    expect(typeof result!.note).toBe("string");
  });

  it("returns null for traits not in the override table", () => {
    expect(lookupTraitOverride("Definitely Not A Real Trait 9000")).toBeNull();
  });

  it("returns null when name is undefined", () => {
    expect(lookupTraitOverride(undefined)).toBeNull();
  });
});

describe("allOverrideNames", () => {
  it("returns at least 30 curated trait names", () => {
    const names = allOverrideNames();
    expect(names.length).toBeGreaterThanOrEqual(30);
    expect(names).toContain("Super Charged Weapons");
    expect(names).toContain("Emergency Weapon Cycle");
  });
});
