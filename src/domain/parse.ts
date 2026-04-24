import type { BoffRank, BoffStation, Career, Ship, Spec } from "./ship.ts";

function parseCsv(text: string): string[][] {
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

export function parseShips(csvText: string): Ship[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c !== ""));

  const ships: Ship[] = [];
  for (const r of dataRows) {
    const idRaw = r[1];
    if (!idRaw) continue;
    const id = num(idRaw, NaN);
    if (!Number.isFinite(id)) continue;

    const boffs: BoffStation[] = [];
    for (let b = 0; b < 6; b++) {
      const station = parseBoff(r, 47 + b * 3);
      if (station) boffs.push(station);
    }

    const primarySpec = asSpec(r[25]);

    const ship: Ship = {
      id,
      name: r[2] ?? r[112] ?? "",
      releaseDate: r[3] ?? "",
      year: numOrNull(r[4]),
      month: numOrNull(r[5]),
      origSource: r[6] ?? "",
      source: r[7] ?? "",
      bundles: r[8] ?? "",
      starterBundle: r[9] ?? "",
      faction: r[10] ?? "",
      origin: r[11] ?? "",
      family: r[12] ?? "",
      masteryPackage: r[13] ?? "",
      typeSimplified: r[14] ?? "",
      typeDetailed: r[15] ?? "",
      career: asCareer(r[110]),
      highestSeats: {
        tac: num(r[16]),
        eng: num(r[17]),
        sci: num(r[18]),
        uni: num(r[19]),
        int: num(r[20]),
        cmd: num(r[21]),
        pil: num(r[22]),
        tmp: num(r[23]),
        mw: num(r[24]),
        primarySpec,
      },
      maxAbility: {
        tac: num(r[26]),
        eng: num(r[27]),
        sci: num(r[28]),
        int: num(r[29]),
        cmd: num(r[30]),
        pil: num(r[31]),
        tmp: num(r[32]),
        mw: num(r[33]),
      },
      specCount: num(r[34]),
      specSeats: num(r[35]),
      specSlots: num(r[36]),
      defenseHullMod: num(r[37]),
      hull: num(r[38]),
      shieldMod: num(r[39]),
      mobility: {
        turn: num(r[40]),
        impulseMod: num(r[41]),
        inertia: num(r[42]),
      },
      powerBonus: {
        weapons: num(r[43]),
        shields: num(r[44]),
        engines: num(r[45]),
        aux: num(r[46]),
      },
      boffs,
      weapons: {
        total: num(r[65]),
        fore: num(r[66]),
        aft: num(r[67]),
        dhc: boolYes(r[68]),
        experimental: boolYes(r[69]),
      },
      hangars: num(r[70]),
      deviceSlots: num(r[71]),
      fleetModule: num(r[72]),
      consoles: {
        tac: num(r[73]),
        eng: num(r[74]),
        sci: num(r[75]),
        uni: num(r[76]),
      },
      cruiserCommands: {
        weapon: boolYes(r[77]),
        shield: boolYes(r[78]),
        engine: boolYes(r[79]),
        threat: boolYes(r[80]),
      },
      scienceFeatures: {
        secondaryDeflector: boolYes(r[81]),
        subsystemTargeting: boolYes(r[82]),
        sensorAnalysis: boolYes(r[83]),
        tacMode: boolYes(r[84]),
      },
      miscFeatures: {
        singularity: boolYes(r[85]),
        cloak: boolYes(r[86]),
        flankingPct: num(r[87]),
        wingmen: boolYes(r[88]),
      },
      trait:
        r[89] && r[89] !== ""
          ? {
              name: r[89] ?? "",
              summary: r[90] ?? "",
              url: r[115] ?? "",
            }
          : null,
      universalConsole: r[116] && r[116] !== "" ? { name: r[116] ?? "", url: r[117] ?? "" } : null,
      wikiUrl: r[113] ?? "",
      xUpgrade: boolYes(r[103]),
    };
    ships.push(ship);
  }
  return ships;
}
