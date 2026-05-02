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
  // Mirrors the ImportShips tab layout (118 cols). Header row 0 uses flat
  // machine-readable column names with a handful of intentionally blank cells
  // that the parser resolves by fixed position (ID=1, Name=2, Dev=71,
  // SD_SHOW=99, Highlight=100, X-Upgrades=103). Row 1 is a numeric pointer
  // row used internally by the Ships tab; the parser ignores it.
  const HEADER = [
    "", // 0  (sort key)
    "", // 1  (ID - unlabeled, numeric)
    "", // 2  (Name - unlabeled)
    "release_date", // 3
    "year", // 4
    "month", // 5
    "source_orig", // 6
    "source", // 7
    "bundle", // 8
    "starter_bundle", // 9
    "faction", // 10
    "origin", // 11
    "family", // 12
    "mastery_package", // 13
    "ship_type", // 14
    "ship_type_detailed", // 15
    "max_t", // 16
    "max_e",
    "max_s",
    "max_u",
    "max_int",
    "max_cmd",
    "max_pil",
    "max_tmp",
    "max_mw",
    "full", // 25
    "total_tac", // 26
    "total_eng",
    "total_sci",
    "total_int",
    "total_cmd",
    "total_pil",
    "total_tmp",
    "total_mw", // 33
    "num_specs", // 34
    "num_spec_seats",
    "num_spec_slots", // 36
    "h_mod", // 37
    "hull", // 38
    "s_mod", // 39
    "turn", // 40
    "imp",
    "inrt", // 42
    "power_w", // 43
    "power_s",
    "power_e",
    "power_a", // 46
    "b1r", // 47
    "b1c",
    "b1s",
    "b2r",
    "b2c",
    "b2s",
    "b3r",
    "b3c",
    "b3s",
    "b4r",
    "b4c",
    "b4s",
    "b5r",
    "b5c",
    "b5s",
    "b6r",
    "b6c",
    "b6s", // 64
    "weapon_total", // 65
    "fore",
    "aft",
    "dhc",
    "exp", // 69
    "hangars", // 70
    "", // 71  (devices - unlabeled)
    "fleet", // 72
    "console_t", // 73
    "console_e",
    "console_s",
    "", // 76  (blank - duplicate slot)
    "cc_w", // 77
    "cc_s",
    "cc_e",
    "cc_t", // 80
    "secdef", // 81
    "sub_targeting",
    "sensor_analysis",
    "tac_mode", // 84
    "singularity", // 85
    "cloak",
    "flank",
    "wingmen", // 88
    "", // 89 (blank)
    "trait_summary", // 90
    "", // 91 (blank)
    "adm_rarity", // 92
    "adm_role",
    "adm_e",
    "adm_t",
    "adm_s",
    "adm_bonus", // 97
    "released", // 98
    "", // 99  (SD_SHOW - unlabeled)
    "", // 100 (Highlight - unlabeled)
    "console_u", // 101
    "devices", // 102 (duplicate - unused)
    "", // 103 (X-Upgrades - unlabeled)
    "console_t", // 104 (duplicate - unused, first occurrence wins)
    "console_e", // 105
    "console_s", // 106
    "", // 107 (T_PLUS)
    "", // 108 (E_PLUS)
    "", // 109 (S_PLUS)
    "career", // 110
    "cloak_rank", // 111
    "name", // 112 (duplicate name column - unused)
    "wiki_url", // 113
    "trait_name", // 114
    "trait_url", // 115
    "console_name", // 116
    "console_url", // 117
  ];

  // Row 1 is the numeric pointer row from the real sheet. Contents don't
  // matter to the parser (it's skipped) - just pad with empties.
  const POINTER_ROW: string[] = Array.from({ length: HEADER.length }, () => "");

  interface TestShip {
    id?: string;
    name?: string;
    releaseDate?: string;
    faction?: string;
    typeSimplified?: string;
    hull?: string;
    weaponsTotal?: string;
    weaponsFore?: string;
    weaponsAft?: string;
    hangars?: string;
    consoleT?: string;
    consoleE?: string;
    consoleS?: string;
    consoleU?: string;
    traitName?: string;
    traitSummary?: string;
    career?: string;
    released?: string; // defaults to "TRUE"
    sdShow?: string; // defaults to "TRUE"
  }

  function makeFixtureCsv(ships: ReadonlyArray<TestShip>): string {
    const rows: string[] = [HEADER.map(csvEscape).join(","), POINTER_ROW.map(csvEscape).join(",")];
    for (const data of ships) {
      const row: string[] = Array.from({ length: HEADER.length }, () => "");
      row[1] = data.id ?? "";
      row[2] = data.name ?? "";
      row[3] = data.releaseDate ?? "";
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
      row[98] = data.released ?? "TRUE";
      row[99] = data.sdShow ?? "TRUE";
      row[101] = data.consoleU ?? "";
      row[110] = data.career ?? "";
      row[114] = data.traitName ?? "";
      row[90] = data.traitSummary ?? "";
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

  it("drops rows where released != TRUE", () => {
    const csv = makeFixtureCsv([
      { id: "200", name: "Released", released: "TRUE" },
      { id: "201", name: "Unreleased", released: "" },
      { id: "202", name: "FalseReleased", released: "FALSE" },
    ]);
    const ships = parseShips(csv);
    expect(ships.map((s) => s.name)).toEqual(["Released"]);
  });

  it("drops rows where SD_SHOW != TRUE (Science Destroyer alt modes)", () => {
    const csv = makeFixtureCsv([
      { id: "300", name: "Base SD", sdShow: "TRUE" },
      { id: "301", name: "SD (Tactical Mode)", sdShow: "FALSE" },
      { id: "302", name: "SD (Science Mode)", sdShow: "FALSE" },
    ]);
    const ships = parseShips(csv);
    expect(ships.map((s) => s.name)).toEqual(["Base SD"]);
  });

  it("parses the real ships.csv snapshot", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const url = await import("node:url");
    const here = path.dirname(url.fileURLToPath(import.meta.url));
    const csv = await fs.readFile(path.join(here, "..", "..", "..", "public", "ships.csv"), "utf8");
    const ships = parseShips(csv);
    expect(ships.length).toBeGreaterThan(100);
    // Every ship should have an integer id and a non-empty name.
    for (const s of ships) {
      expect(Number.isFinite(s.id)).toBe(true);
      expect(s.name.length).toBeGreaterThan(0);
    }
  });
});
