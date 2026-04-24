/**
 * Trait coverage audit.
 *
 * Reads the parsed ships.csv, compares each ship's trait name against the
 * curated override table, and prints a coverage report: how many distinct
 * traits are covered, how many are not, and the top-20 uncovered traits
 * by frequency. Useful as a tuning input when deciding which traits to
 * curate next.
 *
 * Usage: `pnpm run trait-audit` (wired via `vp run trait-audit`).
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseShips } from "../src/domain/parse.ts";
import { allOverrideNames } from "../src/domain/traitOverrides.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = resolve(repoRoot, "data", "ships.csv");

async function main() {
  const csv = await readFile(csvPath, "utf8");
  const ships = parseShips(csv);

  const covered = new Set(allOverrideNames());

  const counts = new Map<string, number>();
  for (const s of ships) {
    const name = s.trait?.name?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const distinct = [...counts.keys()];
  const coveredNames = distinct.filter((n) => covered.has(n));
  const uncoveredNames = distinct.filter((n) => !covered.has(n));

  const uncoveredTop = uncoveredNames
    .map((name) => ({ name, count: counts.get(name) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 20);

  const coveragePct = distinct.length === 0 ? 0 : (coveredNames.length / distinct.length) * 100;

  const shipsWithTrait = ships.filter((s) => s.trait?.name?.trim()).length;
  const shipsCovered = ships.filter((s) => s.trait && covered.has(s.trait.name)).length;
  const shipCoveragePct = shipsWithTrait === 0 ? 0 : (shipsCovered / shipsWithTrait) * 100;

  console.log("Trait override coverage audit");
  console.log("=============================");
  console.log(`Ships with a trait:          ${shipsWithTrait}`);
  console.log(`  Ships whose trait is curated: ${shipsCovered} (${shipCoveragePct.toFixed(1)}%)`);
  console.log(`Distinct trait names:        ${distinct.length}`);
  console.log(
    `  Curated:                      ${coveredNames.length} (${coveragePct.toFixed(1)}%)`,
  );
  console.log(`  Uncovered:                    ${uncoveredNames.length}`);
  console.log("");
  console.log(`Top ${uncoveredTop.length} uncovered traits by frequency:`);
  const nameColWidth = Math.max(0, ...uncoveredTop.map((u) => u.name.length));
  for (const { name, count } of uncoveredTop) {
    console.log(`  ${name.padEnd(nameColWidth)}  x${count}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
