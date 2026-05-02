/**
 * Fetch the latest `ImportShips` tab from Fleffle's Sortable/Filterable T6 Ship
 * List v2 and write it to public/ships.csv (served at runtime by the SPA).
 *
 * Usage: pnpm run data:fetch
 *
 * The spreadsheet is publicly viewable, so no auth is required. We pull the
 * `ImportShips` tab (gid=1249626217) rather than the `Ships` tab because
 * Ships is filtered at the sheet level - its `gviz/tq` CSV export only
 * returns rows that pass the maintainer's current filter (e.g. recent ships
 * are hidden until they've been reviewed), so fetching that tab loses
 * anything released after the cutoff date. ImportShips is the machine-
 * readable source tab Ships derives from: flat column names, no filter,
 * one row per ship mode (base / Tactical / Science) - our parser keeps only
 * rows where `released=TRUE AND SD_SHOW=TRUE`, which yields exactly one row
 * per ship with all released ships included.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHEET_ID = "1SSsxWmE8Oz35D6MvLheFNUfhWerHNkUGOGtjxLlrTuA";
const IMPORT_SHIPS_GID = "1249626217";

// The `/export?format=csv&gid=<GID>` endpoint returns the raw tab contents
// without honouring sheet-level basic filters - exactly what we want.
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${IMPORT_SHIPS_GID}`;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = resolve(repoRoot, "public", "ships.csv");

async function main() {
  console.log(`Fetching ${EXPORT_URL}`);
  const res = await fetch(EXPORT_URL);
  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status} ${res.statusText}`);
  }
  const body = await res.text();

  // Sanity check: the ImportShips tab has three unlabeled leading columns
  // (sort key, ID, name) followed by machine-friendly header names starting
  // with `release_date,year,month,source_orig,source,...`. If Google sent us
  // a different tab (or the intro page) the marker below will be missing.
  if (!body.includes("release_date,year,month,source_orig,source")) {
    throw new Error(
      `Unexpected response - ImportShips header marker not found. First 200 chars:\n${body.slice(0, 200)}`,
    );
  }

  const rowCount = body.split("\n").length;
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, body, "utf8");
  console.log(`Wrote ${outPath} (${body.length} bytes, ~${rowCount} rows)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
