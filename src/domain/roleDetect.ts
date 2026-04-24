import type { Role } from "./scoringConfig.ts";

// Maps the `typeSimplified` string from ship data onto a suggested
// primary role. Ships whose type is not in the table default to "dps",
// which matches the historic behaviour of the single-axis ranking where
// weapons-heavy ships dominated and everyone else was measured against
// them.
export const ROLE_BY_TYPE: Record<string, Role> = {
  Escort: "dps",
  Raider: "dps",
  Warbird: "dps",
  Battlecruiser: "dps",
  "Pilot Escort": "dps",
  Cruiser: "tank",
  "Dreadnought Cruiser": "tank",
  "Heavy Dreadnought Cruiser": "tank",
  Dreadnought: "tank",
  Scimitar: "dps",
  Carrier: "support",
  "Flight Deck Carrier": "support",
  "Flight Deck Cruiser": "support",
  "Flight-deck Cruiser": "support",
  "Multi-mission Science Vessel": "sci",
  "Science Vessel": "sci",
  "Science Dreadnought": "sci",
  "Science Destroyer": "sci",
  "Science Carrier": "sci",
  "Science Spearhead": "sci",
  "Scout Ship": "dps",
  Frigate: "dps",
  "Raider (Romulan Science)": "sci",
  "Command Cruiser": "support",
};

export function suggestRole(typeSimplified: string): Role {
  return ROLE_BY_TYPE[typeSimplified] ?? "dps";
}
