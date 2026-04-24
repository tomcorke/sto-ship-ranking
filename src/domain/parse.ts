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

function parseBoff(cells: string[], offset: number): BoffStation | null {
  const rank = asRank(cells[offset]);
  const career = asCareer(cells[offset + 1]);
  const spec = asSpec(cells[offset + 2]);
  if (rank === 0 && career === "" && spec === "") return null;
  return { rank, career, spec };
}

/**
 * Fleffle's sheet uses visually-merged header cells: the group label is on
 * the first cell of a span, and the remaining cells in the span hold only the
 * sub-label (or are blank for Boff tuples). To look columns up by name we
 * need to reconstruct unique synthetic keys from that layout.
 *
 * Rule: walk the raw header row, carrying the current group label. When we
 * encounter a header cell whose text is a known group prefix followed by a
 * sub-label (e.g. "Highest Seats Tac"), split off the group label and start a
 * new span. Subsequent short labels and blanks inherit the current group.
 * Stand-alone unique headers (e.g. "Hull", "Faction") reset the group to none.
 */
// Each entry is [group-label-prefix, span-length-including-first-cell].
// Span length is needed because the sub-cells of a group may be short unique
// tokens that could otherwise be confused with standalone columns appearing
// immediately after the group.
const GROUP_SPANS: readonly { prefix: string; length: number }[] = [
  { prefix: "Highest Seats", length: 10 }, // Tac Eng Sci Uni Int Cmd Pil Tmp MW Full
  { prefix: "Max Ability Counts", length: 8 }, // Tac Eng Sci Int Cmd Pil Tmp MW
  { prefix: "Spec Details", length: 3 }, // Specs, Spec Seats, Spec Slots
  { prefix: "Mobility", length: 3 }, // Turn Imp Inrt
  { prefix: "Power Bonus", length: 4 }, // W S E A
  { prefix: "Boff 1", length: 3 },
  { prefix: "Boff 2", length: 3 },
  { prefix: "Boff 3", length: 3 },
  { prefix: "Boff 4", length: 3 },
  { prefix: "Boff 5", length: 3 },
  { prefix: "Boff 6", length: 3 },
  { prefix: "Weapons F + A", length: 5 }, // (total), Fore Aft DHC Exp
  { prefix: "Misc Equips", length: 3 }, // Hangars Dev Fleet
  { prefix: "Consoles", length: 4 }, // T E S U
  { prefix: "Cruiser Commands", length: 4 }, // Weapon Shield Engine Threat
  { prefix: "Science Features", length: 4 }, // Sec Def, Sub Targeting, Sensor Analysis, Tac Mode
  { prefix: "Misc Featrues", length: 4 }, // Singularity Cloak Flanking Wingmen (preserve upstream typo)
  { prefix: "Admiralty Card", length: 6 }, // Rarity Role Eng Tac Sci Bonus
];

function splitGroupHeader(raw: string): { group: string; groupLength: number; sub: string } | null {
  const trimmed = raw.trim();
  for (const g of GROUP_SPANS) {
    if (trimmed === g.prefix) return { group: g.prefix, groupLength: g.length, sub: "" };
    if (trimmed.startsWith(g.prefix + " ")) {
      return {
        group: g.prefix,
        groupLength: g.length,
        sub: trimmed.slice(g.prefix.length + 1).trim(),
      };
    }
  }
  return null;
}

function normaliseRawHeader(raw: string): string {
  const trimmed = raw.trim();
  // The upstream sheet prefixes the first "Name" column with a dynamic
  // "Current filter: N of M results Name" banner. Normalise to just "Name".
  if (/Current filter:.*\bName$/.test(trimmed)) return "Name";
  return trimmed;
}

function buildSyntheticHeader(rawHeader: string[]): string[] {
  const synthetic: string[] = [];
  let i = 0;
  while (i < rawHeader.length) {
    const raw = rawHeader[i] ?? "";
    const trimmed = normaliseRawHeader(raw);
    const split = splitGroupHeader(trimmed);

    if (split) {
      const group = split.group;
      const span = split.groupLength;
      const end = Math.min(rawHeader.length, i + span);

      if (group.startsWith("Boff ")) {
        // Boff groups have blank sub-headers; synthesize {rank, career, spec}.
        const subs = ["rank", "career", "spec"];
        for (let j = 0; j < end - i; j++) {
          synthetic.push(`${group} ${subs[j] ?? `col${j}`}`);
        }
      } else {
        // First cell: "Group Prefix <sub>" or just "Group Prefix".
        if (split.sub) synthetic.push(`${group} ${split.sub}`);
        else synthetic.push(group);
        // Subsequent cells in the span: "Group Prefix <cell>".
        for (let k = i + 1; k < end; k++) {
          const cell = normaliseRawHeader(rawHeader[k] ?? "");
          synthetic.push(cell ? `${group} ${cell}` : `${group} col${k - i}`);
        }
      }
      i = end;
      continue;
    }

    // Stand-alone column header.
    synthetic.push(trimmed);
    i++;
  }

  return synthetic;
}

interface ColumnIndex {
  find(name: string): number;
  required(name: string): number;
  has(name: string): boolean;
}

function buildColumnIndex(rawHeader: string[]): ColumnIndex {
  const synthetic = buildSyntheticHeader(rawHeader);
  const map = new Map<string, number>();
  const counts = new Map<string, number>();
  for (let i = 0; i < synthetic.length; i++) {
    const key = synthetic[i];
    const n = counts.get(key) ?? 0;
    counts.set(key, n + 1);
    const uniqueKey = n === 0 ? key : `${key} (${n + 1})`;
    map.set(uniqueKey, i);
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
    has(name: string): boolean {
      return map.has(name);
    },
  };
}

export function parseShips(csvText: string): Ship[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];

  const cols = buildColumnIndex(rows[0]);

  // Resolve every column once, up front. Failing fast here makes upstream
  // schema changes obvious at load time rather than via silent nulls.
  const C = {
    id: cols.required("ID"),
    nameTop: cols.find("Name"), // the "Current filter: ... Name" cell at the start
    releaseDate: cols.required("Acquisition Release (PC)"),
    year: cols.required("Year"),
    month: cols.required("Month"),
    origSource: cols.required("Orig Source"),
    source: cols.required("Source"),
    bundles: cols.required("Bundle(s)"),
    starterBundle: cols.required("Starter Bundle"),
    faction: cols.required("Faction"),
    origin: cols.required("Origin"),
    family: cols.required("Family"),
    masteryPackage: cols.required("Ship Role Mastery Package"),
    typeSimplified: cols.required("Ship Type (Simplified)"),
    typeDetailed: cols.required("Ship Type (Detailed)"),
    hsTac: cols.required("Highest Seats Tac"),
    hsEng: cols.required("Highest Seats Eng"),
    hsSci: cols.required("Highest Seats Sci"),
    hsUni: cols.required("Highest Seats Uni"),
    hsInt: cols.required("Highest Seats Int"),
    hsCmd: cols.required("Highest Seats Cmd"),
    hsPil: cols.required("Highest Seats Pil"),
    hsTmp: cols.required("Highest Seats Tmp"),
    hsMW: cols.required("Highest Seats MW"),
    hsFull: cols.required("Highest Seats Full"),
    maTac: cols.required("Max Ability Counts Tac"),
    maEng: cols.required("Max Ability Counts Eng"),
    maSci: cols.required("Max Ability Counts Sci"),
    maInt: cols.required("Max Ability Counts Int"),
    maCmd: cols.required("Max Ability Counts Cmd"),
    maPil: cols.required("Max Ability Counts Pil"),
    maTmp: cols.required("Max Ability Counts Tmp"),
    maMW: cols.required("Max Ability Counts MW"),
    specCount: cols.required("Spec Details Specs"),
    specSeats: cols.required("Spec Details Spec Seats"),
    specSlots: cols.required("Spec Details Spec Slots"),
    defenseHullMod: cols.required("Defense Hull Mod"),
    hull: cols.required("Hull"),
    shieldMod: cols.required("Shield Mod"),
    turn: cols.required("Mobility Turn"),
    imp: cols.required("Mobility Imp"),
    inrt: cols.required("Mobility Inrt"),
    pbW: cols.required("Power Bonus W"),
    pbS: cols.required("Power Bonus S"),
    pbE: cols.required("Power Bonus E"),
    pbA: cols.required("Power Bonus A"),
    boff1Rank: cols.required("Boff 1 rank"),
    boff2Rank: cols.required("Boff 2 rank"),
    boff3Rank: cols.required("Boff 3 rank"),
    boff4Rank: cols.required("Boff 4 rank"),
    boff5Rank: cols.required("Boff 5 rank"),
    boff6Rank: cols.required("Boff 6 rank"),
    weaponsTotal: cols.required("Weapons F + A"),
    weaponsFore: cols.required("Weapons F + A Fore"),
    weaponsAft: cols.required("Weapons F + A Aft"),
    weaponsDHC: cols.required("Weapons F + A DHC"),
    weaponsExp: cols.required("Weapons F + A Exp"),
    hangars: cols.required("Misc Equips Hangars"),
    deviceSlots: cols.required("Misc Equips Dev"),
    fleetModule: cols.required("Misc Equips Fleet"),
    consoleTac: cols.required("Consoles T"),
    consoleEng: cols.required("Consoles E"),
    consoleSci: cols.required("Consoles S"),
    consoleUni: cols.required("Consoles U"),
    ccWeapon: cols.required("Cruiser Commands Weapon"),
    ccShield: cols.required("Cruiser Commands Shield"),
    ccEngine: cols.required("Cruiser Commands Engine"),
    ccThreat: cols.required("Cruiser Commands Threat"),
    sfSecDef: cols.required("Science Features Sec Def"),
    sfSubTarget: cols.required("Science Features Sub Targeting"),
    sfSensor: cols.required("Science Features Sensor Analysis"),
    sfTacMode: cols.required("Science Features Tac Mode"),
    mfSingularity: cols.required("Misc Featrues Singularity"),
    mfCloak: cols.required("Misc Featrues Cloak"),
    mfFlanking: cols.required("Misc Featrues Flanking"),
    mfWingmen: cols.required("Misc Featrues Wingmen"),
    traitName: cols.required("Trait Name"),
    traitSummary: cols.required("Trait Summary"),
    xUpgrade: cols.required("X-Upgrades"),
    career: cols.required("Career"),
    wikiUrl: cols.required("Wiki URL"),
    wikiName: cols.required("Name (2)"), // the later standalone "Name" column (wiki label)
    traitUrl: cols.required("Trait URL"),
    consoleName: cols.required("Console Name"),
    consoleUrl: cols.required("Console URL"),
  } as const;

  // The "Highest Seats Full" column (index 25 in current layout) holds the
  // primary spec token (e.g. "Tmp"). Preserve that mapping under a clearer
  // alias - the legacy parser read r[25].
  const primarySpecIdx = C.hsFull;

  const dataRows = rows.slice(1).filter((r) => r.some((c) => c !== ""));

  const ships: Ship[] = [];
  for (const r of dataRows) {
    const idRaw = r[C.id];
    if (!idRaw) continue;
    const id = num(idRaw, NaN);
    if (!Number.isFinite(id)) continue;

    const boffs: BoffStation[] = [];
    const boffRankCols = [
      C.boff1Rank,
      C.boff2Rank,
      C.boff3Rank,
      C.boff4Rank,
      C.boff5Rank,
      C.boff6Rank,
    ];
    for (const base of boffRankCols) {
      const station = parseBoff(r, base);
      if (station) boffs.push(station);
    }

    const primarySpec = asSpec(r[primarySpecIdx]);

    // The first "Name" column has a filter-banner prefix in the header but
    // the data cell is just the ship name. Prefer it, fall back to the
    // standalone wiki "Name" column.
    const topName = C.nameTop >= 0 ? (r[C.nameTop] ?? "") : "";
    const traitNameCell = r[C.traitName] ?? "";
    const consoleNameCell = r[C.consoleName] ?? "";

    const ship: Ship = {
      id,
      name: topName || r[C.wikiName] || "",
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
        tac: num(r[C.hsTac]),
        eng: num(r[C.hsEng]),
        sci: num(r[C.hsSci]),
        uni: num(r[C.hsUni]),
        int: num(r[C.hsInt]),
        cmd: num(r[C.hsCmd]),
        pil: num(r[C.hsPil]),
        tmp: num(r[C.hsTmp]),
        mw: num(r[C.hsMW]),
        primarySpec,
      },
      maxAbility: {
        tac: num(r[C.maTac]),
        eng: num(r[C.maEng]),
        sci: num(r[C.maSci]),
        int: num(r[C.maInt]),
        cmd: num(r[C.maCmd]),
        pil: num(r[C.maPil]),
        tmp: num(r[C.maTmp]),
        mw: num(r[C.maMW]),
      },
      specCount: num(r[C.specCount]),
      specSeats: num(r[C.specSeats]),
      specSlots: num(r[C.specSlots]),
      defenseHullMod: num(r[C.defenseHullMod]),
      hull: num(r[C.hull]),
      shieldMod: num(r[C.shieldMod]),
      mobility: {
        turn: num(r[C.turn]),
        impulseMod: num(r[C.imp]),
        inertia: num(r[C.inrt]),
      },
      powerBonus: {
        weapons: num(r[C.pbW]),
        shields: num(r[C.pbS]),
        engines: num(r[C.pbE]),
        aux: num(r[C.pbA]),
      },
      boffs,
      weapons: {
        total: num(r[C.weaponsTotal]),
        fore: num(r[C.weaponsFore]),
        aft: num(r[C.weaponsAft]),
        dhc: boolYes(r[C.weaponsDHC]),
        experimental: boolYes(r[C.weaponsExp]),
      },
      hangars: num(r[C.hangars]),
      deviceSlots: num(r[C.deviceSlots]),
      fleetModule: num(r[C.fleetModule]),
      consoles: {
        tac: num(r[C.consoleTac]),
        eng: num(r[C.consoleEng]),
        sci: num(r[C.consoleSci]),
        uni: num(r[C.consoleUni]),
      },
      cruiserCommands: {
        weapon: boolYes(r[C.ccWeapon]),
        shield: boolYes(r[C.ccShield]),
        engine: boolYes(r[C.ccEngine]),
        threat: boolYes(r[C.ccThreat]),
      },
      scienceFeatures: {
        secondaryDeflector: boolYes(r[C.sfSecDef]),
        subsystemTargeting: boolYes(r[C.sfSubTarget]),
        sensorAnalysis: boolYes(r[C.sfSensor]),
        tacMode: boolYes(r[C.sfTacMode]),
      },
      miscFeatures: {
        singularity: boolYes(r[C.mfSingularity]),
        cloak: boolYes(r[C.mfCloak]),
        flankingPct: num(r[C.mfFlanking]),
        wingmen: boolYes(r[C.mfWingmen]),
      },
      trait:
        traitNameCell !== ""
          ? {
              name: traitNameCell,
              summary: r[C.traitSummary] ?? "",
              url: r[C.traitUrl] ?? "",
            }
          : null,
      universalConsole:
        consoleNameCell !== "" ? { name: consoleNameCell, url: r[C.consoleUrl] ?? "" } : null,
      wikiUrl: r[C.wikiUrl] ?? "",
      xUpgrade: boolYes(r[C.xUpgrade]),
    };
    ships.push(ship);
  }
  return ships;
}
