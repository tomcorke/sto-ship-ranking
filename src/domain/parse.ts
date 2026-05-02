import type { BoffRank, BoffStation, Career, Ship, Spec } from "./ship.ts";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\r") {
        // skip
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function num(v: string | undefined, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function numOrNull(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function boolYes(v: string | undefined): boolean {
  return (v ?? "").trim().toLowerCase() === "yes";
}

function asRank(v: string | undefined): BoffRank {
  const n = num(v, 0);
  if (n >= 0 && n <= 4) return n as BoffRank;
  return 0;
}

function asCareer(v: string | undefined): Career {
  const s = (v ?? "").trim();
  if (s === "Tac" || s === "Eng" || s === "Sci" || s === "Uni") return s;
  return "";
}

function asSpec(v: string | undefined): Spec {
  const s = (v ?? "").trim();
  if (s === "Int" || s === "Cmd" || s === "Pil" || s === "Tmp" || s === "MW") return s;
  return "";
}

function parseBoffFromFields(
  rank: string | undefined,
  career: string | undefined,
  spec: string | undefined,
): BoffStation | null {
  const r = asRank(rank);
  const c = asCareer(career);
  const s = asSpec(spec);
  if (r === 0 && c === "" && s === "") return null;
  return { rank: r, career: c, spec: s };
}

/**
 * ImportShips tab layout (118 columns).
 *
 * The tab has two header rows:
 *   row 0: flat machine-readable column names (e.g. `release_date`, `max_t`,
 *          `total_tac`, `cc_w`, `trait_summary`). A handful of cells are
 *          blank - these are derived columns (ID, Name, `devices`/`Dev`,
 *          `X-Upgrades`, the `SD_SHOW`/`Highlight` flags, plus three
 *          consoles-plus-upgrades dupes) that we resolve by fixed position.
 *   row 1: numeric lookup pointers used internally by the Ships tab. Ignored.
 * Data rows start at row 2.
 *
 * Row filter:
 *   - numeric `ID` in column 1
 *   - `released` (col 98) == "TRUE"
 *   - `SD_SHOW` (col 99) == "TRUE"  (collapses each Science Destroyer's
 *     three variants - base / Tactical Mode / Science Mode - into the single
 *     base row the Ships tab presents)
 */

// Fixed positions of columns that have no machine name in row 0.
const POS = {
  id: 1,
  name: 2,
  devices: 71, // between `hangars` (70) and `fleet` (72)
  sdShow: 99, // between `released` (98) and `Highlight` (100)
  highlight: 100,
  xUpgrade: 103, // between `devices` duplicate (102) and `console_t` duplicate (104)
} as const;

interface ColumnIndex {
  /** Column index for a machine-readable header name, or -1 if not present. */
  find(name: string): number;
  /** Column index for `name`, throwing if absent. */
  required(name: string): number;
}

function buildColumnIndex(headerRow: string[]): ColumnIndex {
  // First-occurrence wins: the ImportShips tab duplicates `console_t/e/s` and
  // a few others near the end of the row. We always want the first (canonical)
  // position.
  const map = new Map<string, number>();
  for (let i = 0; i < headerRow.length; i++) {
    const key = headerRow[i].trim();
    if (key && !map.has(key)) map.set(key, i);
  }
  return {
    find(name: string): number {
      return map.get(name) ?? -1;
    },
    required(name: string): number {
      const i = map.get(name);
      if (i === undefined) {
        throw new Error(`Missing required column: ${name}`);
      }
      return i;
    },
  };
}

export function parseShips(csvText: string): Ship[] {
  const rows = parseCsv(csvText);
  if (rows.length < 3) return [];

  const cols = buildColumnIndex(rows[0]);

  // Resolve every column index once, up front. Failing fast here makes
  // upstream schema changes obvious at load time rather than via silent nulls.
  const C = {
    releaseDate: cols.required("release_date"),
    year: cols.required("year"),
    month: cols.required("month"),
    origSource: cols.required("source_orig"),
    source: cols.required("source"),
    bundles: cols.required("bundle"),
    starterBundle: cols.required("starter_bundle"),
    faction: cols.required("faction"),
    origin: cols.required("origin"),
    family: cols.required("family"),
    masteryPackage: cols.required("mastery_package"),
    typeSimplified: cols.required("ship_type"),
    typeDetailed: cols.required("ship_type_detailed"),
    maxT: cols.required("max_t"),
    maxE: cols.required("max_e"),
    maxS: cols.required("max_s"),
    maxU: cols.required("max_u"),
    maxInt: cols.required("max_int"),
    maxCmd: cols.required("max_cmd"),
    maxPil: cols.required("max_pil"),
    maxTmp: cols.required("max_tmp"),
    maxMW: cols.required("max_mw"),
    full: cols.required("full"),
    totalTac: cols.required("total_tac"),
    totalEng: cols.required("total_eng"),
    totalSci: cols.required("total_sci"),
    totalInt: cols.required("total_int"),
    totalCmd: cols.required("total_cmd"),
    totalPil: cols.required("total_pil"),
    totalTmp: cols.required("total_tmp"),
    totalMW: cols.required("total_mw"),
    specCount: cols.required("num_specs"),
    specSeats: cols.required("num_spec_seats"),
    specSlots: cols.required("num_spec_slots"),
    hMod: cols.required("h_mod"),
    hull: cols.required("hull"),
    sMod: cols.required("s_mod"),
    turn: cols.required("turn"),
    imp: cols.required("imp"),
    inrt: cols.required("inrt"),
    powerW: cols.required("power_w"),
    powerS: cols.required("power_s"),
    powerE: cols.required("power_e"),
    powerA: cols.required("power_a"),
    b1r: cols.required("b1r"),
    b1c: cols.required("b1c"),
    b1s: cols.required("b1s"),
    b2r: cols.required("b2r"),
    b2c: cols.required("b2c"),
    b2s: cols.required("b2s"),
    b3r: cols.required("b3r"),
    b3c: cols.required("b3c"),
    b3s: cols.required("b3s"),
    b4r: cols.required("b4r"),
    b4c: cols.required("b4c"),
    b4s: cols.required("b4s"),
    b5r: cols.required("b5r"),
    b5c: cols.required("b5c"),
    b5s: cols.required("b5s"),
    b6r: cols.required("b6r"),
    b6c: cols.required("b6c"),
    b6s: cols.required("b6s"),
    weaponTotal: cols.required("weapon_total"),
    fore: cols.required("fore"),
    aft: cols.required("aft"),
    dhc: cols.required("dhc"),
    exp: cols.required("exp"),
    hangars: cols.required("hangars"),
    fleet: cols.required("fleet"),
    consoleT: cols.required("console_t"),
    consoleE: cols.required("console_e"),
    consoleS: cols.required("console_s"),
    consoleU: cols.required("console_u"),
    ccW: cols.required("cc_w"),
    ccS: cols.required("cc_s"),
    ccE: cols.required("cc_e"),
    ccT: cols.required("cc_t"),
    secdef: cols.required("secdef"),
    subTargeting: cols.required("sub_targeting"),
    sensorAnalysis: cols.required("sensor_analysis"),
    tacMode: cols.required("tac_mode"),
    singularity: cols.required("singularity"),
    cloak: cols.required("cloak"),
    flank: cols.required("flank"),
    wingmen: cols.required("wingmen"),
    traitSummary: cols.required("trait_summary"),
    released: cols.required("released"),
    career: cols.required("career"),
    traitName: cols.required("trait_name"),
    traitUrl: cols.required("trait_url"),
    consoleName: cols.required("console_name"),
    consoleUrl: cols.required("console_url"),
    wikiUrl: cols.required("wiki_url"),
  } as const;

  // Skip header rows (row 0 = names, row 1 = numeric pointers).
  const dataRows = rows.slice(2);

  const ships: Ship[] = [];
  for (const r of dataRows) {
    const idRaw = r[POS.id];
    if (!idRaw) continue;
    const id = num(idRaw, NaN);
    if (!Number.isFinite(id)) continue;

    // Row-level filter: only keep released ships, and for Science Destroyers
    // only the base row (SD_SHOW=TRUE) - skip the duplicate Tactical/Science
    // Mode variants.
    const released = r[C.released] === "TRUE";
    const sdShow = r[POS.sdShow] === "TRUE";
    if (!released || !sdShow) continue;

    const boffs: BoffStation[] = [];
    const boffTriples: [number, number, number][] = [
      [C.b1r, C.b1c, C.b1s],
      [C.b2r, C.b2c, C.b2s],
      [C.b3r, C.b3c, C.b3s],
      [C.b4r, C.b4c, C.b4s],
      [C.b5r, C.b5c, C.b5s],
      [C.b6r, C.b6c, C.b6s],
    ];
    for (const [rankIdx, careerIdx, specIdx] of boffTriples) {
      const station = parseBoffFromFields(r[rankIdx], r[careerIdx], r[specIdx]);
      if (station) boffs.push(station);
    }

    const ship: Ship = {
      id,
      name: (r[POS.name] ?? "").trim(),
      releaseDate: r[C.releaseDate] ?? "",
      year: numOrNull(r[C.year]),
      month: numOrNull(r[C.month]),
      origSource: r[C.origSource] ?? "",
      source: r[C.source] ?? "",
      bundles: r[C.bundles] ?? "",
      starterBundle: r[C.starterBundle] ?? "",
      faction: r[C.faction] ?? "",
      origin: r[C.origin] ?? "",
      family: r[C.family] ?? "",
      masteryPackage: r[C.masteryPackage] ?? "",
      typeSimplified: r[C.typeSimplified] ?? "",
      typeDetailed: r[C.typeDetailed] ?? "",
      career: asCareer(r[C.career]),
      highestSeats: {
        tac: num(r[C.maxT]),
        eng: num(r[C.maxE]),
        sci: num(r[C.maxS]),
        uni: num(r[C.maxU]),
        int: num(r[C.maxInt]),
        cmd: num(r[C.maxCmd]),
        pil: num(r[C.maxPil]),
        tmp: num(r[C.maxTmp]),
        mw: num(r[C.maxMW]),
        primarySpec: asSpec(r[C.full]),
      },
      maxAbility: {
        tac: num(r[C.totalTac]),
        eng: num(r[C.totalEng]),
        sci: num(r[C.totalSci]),
        int: num(r[C.totalInt]),
        cmd: num(r[C.totalCmd]),
        pil: num(r[C.totalPil]),
        tmp: num(r[C.totalTmp]),
        mw: num(r[C.totalMW]),
      },
      specCount: num(r[C.specCount]),
      specSeats: num(r[C.specSeats]),
      specSlots: num(r[C.specSlots]),
      defenseHullMod: num(r[C.hMod]),
      hull: num(r[C.hull]),
      shieldMod: num(r[C.sMod]),
      mobility: {
        turn: num(r[C.turn]),
        impulseMod: num(r[C.imp]),
        inertia: num(r[C.inrt]),
      },
      powerBonus: {
        weapons: num(r[C.powerW]),
        shields: num(r[C.powerS]),
        engines: num(r[C.powerE]),
        aux: num(r[C.powerA]),
      },
      boffs,
      weapons: {
        total: num(r[C.weaponTotal]),
        fore: num(r[C.fore]),
        aft: num(r[C.aft]),
        dhc: boolYes(r[C.dhc]),
        experimental: boolYes(r[C.exp]),
      },
      hangars: num(r[C.hangars]),
      deviceSlots: num(r[POS.devices]),
      fleetModule: boolYes(r[C.fleet]) ? 1 : 0,
      consoles: {
        tac: num(r[C.consoleT]),
        eng: num(r[C.consoleE]),
        sci: num(r[C.consoleS]),
        uni: num(r[C.consoleU]),
      },
      cruiserCommands: {
        weapon: boolYes(r[C.ccW]),
        shield: boolYes(r[C.ccS]),
        engine: boolYes(r[C.ccE]),
        threat: boolYes(r[C.ccT]),
      },
      scienceFeatures: {
        secondaryDeflector: boolYes(r[C.secdef]),
        subsystemTargeting: boolYes(r[C.subTargeting]),
        sensorAnalysis: boolYes(r[C.sensorAnalysis]),
        tacMode: boolYes(r[C.tacMode]),
      },
      miscFeatures: {
        singularity: boolYes(r[C.singularity]),
        cloak: boolYes(r[C.cloak]),
        flankingPct: num(r[C.flank]),
        wingmen: boolYes(r[C.wingmen]),
      },
      trait:
        (r[C.traitName] ?? "").trim() !== ""
          ? {
              name: r[C.traitName] ?? "",
              summary: r[C.traitSummary] ?? "",
              url: r[C.traitUrl] ?? "",
            }
          : null,
      universalConsole:
        (r[C.consoleName] ?? "").trim() !== ""
          ? { name: r[C.consoleName] ?? "", url: r[C.consoleUrl] ?? "" }
          : null,
      wikiUrl: r[C.wikiUrl] ?? "",
      xUpgrade: (r[POS.xUpgrade] ?? "").trim().toLowerCase() === "yes",
    };
    ships.push(ship);
  }
  return ships;
}
