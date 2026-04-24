/**
 * Fetch the latest `Ships` tab from Fleffle's Sortable/Filterable T6 Ship List v2
 * and write it to public/ships.csv (served at runtime by the SPA).
 *
 * Usage: pnpm run data:fetch
 *
 * The spreadsheet is publicly viewable, so no auth is required. We use the
 * `gviz/tq` CSV export endpoint, which supports `sheet=<tab name>`.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHEET_ID = "1SSsxWmE8Oz35D6MvLheFNUfhWerHNkUGOGtjxLlrTuA";
const SHEET_TAB = "Ships";

const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = resolve(repoRoot, "public", "ships.csv");

async function main() {
  console.log(`Fetching ${EXPORT_URL}`);
  const res = await fetch(EXPORT_URL);
  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status} ${res.statusText}`);
  }
  const body = await res.text();

  // Sanity check: the main tab must have the header starting with `"x","ID"`.
  // If Google redirects us to the intro tab the first cell will be a long
  // "TO USE THIS LIST properly..." notice instead.
  if (!body.startsWith('"x","ID"')) {
    throw new Error(
      `Unexpected response - tab "${SHEET_TAB}" header not found. First 200 chars:\n${body.slice(0, 200)}`,
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
