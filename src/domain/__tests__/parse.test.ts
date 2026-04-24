import { describe, expect, it } from "vite-plus/test";

import { parseCsv, parseShips } from "../parse.ts";

describe("parseCsv", () => {
  it("handles a quoted field containing a comma", () => {
    const rows = parseCsv('a,"b,c",d\n');
    expect(rows).toEqual([["a", "b,c", "d"]]);
  });

  it("unescapes doubled-up double quotes inside a quoted field", () => {
    const rows = parseCsv('a,"he said ""hi""",b\n');
    expect(rows).toEqual([["a", 'he said "hi"', "b"]]);
  });

  it("treats CRLF line endings identically to LF", () => {
    const rows = parseCsv("a,b,c\r\n1,2,3\r\n");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("preserves a trailing empty cell produced by a line ending in a comma", () => {
    const rows = parseCsv("a,b,\n");
    expect(rows).toEqual([["a", "b", ""]]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseShips", () => {
  // A tiny fixture that mirrors the real sheet's header layout. Only the
  // columns the parser reads are meaningful; the rest are padded as "".
  function makeFixtureCsv(ships: ReadonlyArray<Record<string, string>>): string {
    const header = [
      "x", // 0
      "ID", // 1
      "Current filter: 3 of 3 results Name", // 2
      "Acquisition Release (PC)", // 3
      "Year", // 4
      "Month", // 5
      "Orig Source", // 6
      "Source", // 7
      "Bundle(s)", // 8
      "Starter Bundle", // 9
      "Faction", // 10
      "Origin", // 11
      "Family", // 12
      "Ship Role Mastery Package", // 13
      "Ship Type (Simplified)", // 14
      "Ship Type (Detailed)", // 15
      "Highest Seats Tac", // 16
      "Eng",
      "Sci",
      "Uni",
      "Int",
      "Cmd",
      "Pil",
      "Tmp",
      "MW",
      "Full", // 25
      "Max Ability Counts Tac", // 26
      "Eng",
      "Sci",
      "Int",
      "Cmd",
      "Pil",
      "Tmp",
      "MW", // 33
      "Spec Details Specs", // 34
      "Spec Seats",
      "Spec Slots", // 36
      "Defense Hull Mod", // 37
      "Hull", // 38
      "Shield Mod", // 39
      "Mobility Turn", // 40
      "Imp",
      "Inrt", // 42
      "Power Bonus W", // 43
      "S",
      "E",
      "A", // 46
      "Boff 1 ", // 47
      "",
      "",
      "Boff 2 ",
      "",
      "",
      "Boff 3 ",
      "",
      "",
      "Boff 4 ",
      "",
      "",
      "Boff 5 ",
      "",
      "",
      "Boff 6 ",
      "",
      "", // 64
      "Weapons F + A", // 65
      "Fore",
      "Aft",
      "DHC",
      "Exp", // 69
      "Misc Equips Hangars", // 70
      "Dev",
      "Fleet", // 72
      "Consoles T", // 73
      "E",
      "S",
      "U", // 76
      "Cruiser Commands Weapon", // 77
      "Shield",
      "Engine",
      "Threat", // 80
      "Science Features Sec Def", // 81
      "Sub Targeting",
      "Sensor Analysis",
      "Tac Mode", // 84
      "Misc Featrues Singularity", // 85
      "Cloak",
      "Flanking",
      "Wingmen", // 88
      "Trait Name", // 89
      "Trait Summary", // 90
      "Universal Console", // 91
      "Admiralty Card Rarity", // 92
      "Role",
      "Eng",
      "Tac",
      "Sci",
      "Bonus", // 97
      "RELEASED", // 98
      "SD_SHOW",
      "Highlight",
      "U",
      "Dev",
      "X-Upgrades", // 103
      "T",
      "E",
      "S",
      "T_PLUS",
      "E_PLUS",
      "S_PLUS",
      "Career", // 110
      "Cloak Rank", // 111
      "Name", // 112
      "Wiki URL", // 113
      "Trait", // 114
      "Trait URL", // 115
      "Console Name", // 116
      "Console URL", // 117
    ];

    const rows: string[] = [header.map(csvEscape).join(",")];
    for (const data of ships) {
      const row: string[] = Array.from({ length: header.length }, () => "");
      const indexOf = (name: string): number => header.indexOf(name);
      row[indexOf("ID")] = data.id ?? "";
      row[2] = data.name ?? "";
      row[10] = data.faction ?? "";
      row[14] = data.typeSimplified ?? "";
      row[38] = data.hull ?? "";
      row[65] = data.weaponsTotal ?? "";
      row[66] = data.weaponsFore ?? "";
      row[67] = data.weaponsAft ?? "";
      row[70] = data.hangars ?? "";
      row[73] = data.consoleT ?? "";
      row[74] = data.consoleE ?? "";
      row[75] = data.consoleS ?? "";
      row[76] = data.consoleU ?? "";
      row[89] = data.traitName ?? "";
      row[90] = data.traitSummary ?? "";
      row[110] = data.career ?? "";
      row[112] = data.wikiName ?? "";
      row[113] = data.wikiUrl ?? "";
      rows.push(row.map(csvEscape).join(","));
    }
    return rows.join("\n") + "\n";
  }

  function csvEscape(cell: string): string {
    if (/[",\n\r]/.test(cell)) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }

  it("round-trips a tiny 3-ship fixture", () => {
    const csv = makeFixtureCsv([
      {
        id: "101",
        name: "Test Cruiser",
        faction: "Federation",
        typeSimplified: "Cruiser",
        hull: "60000",
        weaponsTotal: "8",
        weaponsFore: "4",
        weaponsAft: "4",
        hangars: "0",
        consoleT: "4",
        consoleE: "4",
        consoleS: "2",
        consoleU: "1",
        career: "Eng",
      },
      {
        id: "102",
        name: "Test Carrier",
        faction: "Klingon",
        typeSimplified: "Carrier",
        hull: "50000",
        weaponsTotal: "6",
        weaponsFore: "3",
        weaponsAft: "3",
        hangars: "2",
        consoleT: "3",
        consoleE: "3",
        consoleS: "3",
        consoleU: "1",
        career: "Tac",
      },
      {
        id: "103",
        name: "Test Science",
        faction: "Romulan",
        typeSimplified: "Science",
        hull: "40000",
        weaponsTotal: "7",
        weaponsFore: "4",
        weaponsAft: "3",
        hangars: "0",
        consoleT: "2",
        consoleE: "3",
        consoleS: "5",
        consoleU: "1",
        career: "Sci",
      },
    ]);

    const ships = parseShips(csv);
    expect(ships).toHaveLength(3);

    const [cruiser, carrier, science] = ships;
    expect(cruiser.id).toBe(101);
    expect(cruiser.name).toBe("Test Cruiser");
    expect(cruiser.hull).toBe(60000);
    expect(cruiser.weapons.fore).toBe(4);
    expect(cruiser.weapons.aft).toBe(4);

    expect(carrier.hangars).toBe(2);
    expect(carrier.faction).toBe("Klingon");
    expect(carrier.career).toBe("Tac");

    expect(science.consoles.sci).toBe(5);
    expect(science.weapons.fore).toBe(4);
  });

  it("parses the real ships.csv snapshot", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const url = await import("node:url");
    const here = path.dirname(url.fileURLToPath(import.meta.url));
    const csv = await fs.readFile(path.join(here, "..", "..", "..", "data", "ships.csv"), "utf8");
    const ships = parseShips(csv);
    expect(ships.length).toBeGreaterThan(100);
    // Every ship should have an integer id and a non-empty name.
    for (const s of ships) {
      expect(Number.isFinite(s.id)).toBe(true);
      expect(s.name.length).toBeGreaterThan(0);
    }
  });
});
