# Data sources

## Primary: Fleffle's T6 Ship List v2

[Sortable/Filterable T6 Ship List v2](https://docs.google.com/spreadsheets/d/1SSsxWmE8Oz35D6MvLheFNUfhWerHNkUGOGtjxLlrTuA/edit),
maintained by Fleffle (STO handle `@vanderben`).

- Spreadsheet ID: `1SSsxWmE8Oz35D6MvLheFNUfhWerHNkUGOGtjxLlrTuA`
- Sheet tab used: `ImportShips` (gid=`1249626217`)
- Coverage: 496 Tier-6 playable starships (as of the snapshot below)
- Scope: T6 only. T5 / T5-U tabs were dropped in v2.

### Why not the `Ships` tab?

The visible `Ships` tab is the one humans use - pivoted two-row header, nicely
grouped columns. But it has a **sheet-level basic filter applied by the
maintainer** (the `Current filter: 489 of 496 results` banner baked into the
first cell), and Google Sheets' `gviz/tq` CSV export honours that filter.
Recent ships (most recently added within ~6 weeks) get hidden until Fleffle
manually validates them and updates the filter, so a `gviz/tq?sheet=Ships`
fetch silently drops the newest 5-10 ships.

`ImportShips` is the flat machine-readable source tab that `Ships` derives
from. It has no sheet-level filter, uses stable column names like
`release_date` / `max_t` / `total_tac`, and has one row per ship-mode
(Science Destroyers take three rows: base + Tactical Mode + Science Mode).
The parser applies its own row filter (`released=TRUE AND SD_SHOW=TRUE`) to
collapse those back to one row per ship.

### How to refresh

```sh
pnpm run data:fetch
```

See `scripts/fetch-data.ts`. The script downloads `ImportShips` as CSV via
the Google Sheets `/export?format=csv&gid=<GID>` endpoint (no auth required,
sheet is public) and writes `public/ships.csv`. Vite serves `public/` at the
site root, so the SPA fetches `<base>/ships.csv` at runtime rather than
inlining the CSV into the JS bundle.

### Snapshot provenance

`public/ships.csv` in this repo is the most recent committed snapshot. The
upstream spreadsheet is updated by Fleffle as new ships ship. Re-run the fetch
script periodically and commit the diff.

### Schema

`ImportShips` has 118 columns and **two header rows**:

- Row 0: flat machine-readable column names (`release_date`, `max_t`,
  `total_tac`, `cc_w`, `trait_summary`, etc.). A handful of cells are
  intentionally blank - these are derived columns the parser resolves by
  fixed position: `ID` (col 1), `Name` (col 2), `devices`/`Dev` (col 71),
  `SD_SHOW` (col 99), `Highlight` (col 100), `X-Upgrades` (col 103), plus
  three upgrade-related duplicate console columns near the end that we
  ignore.
- Row 1: numeric lookup pointers used internally by the pivoted `Ships` tab.
  The parser skips this row entirely.

Data rows start at row 2.

Key columns (by machine name unless marked "by position"):

| Column(s)                                                            | Meaning                                                                                                                                                                                       |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ID` _(col 1, unlabeled)_                                            | Stable numeric ID assigned by Fleffle                                                                                                                                                         |
| `Name` _(col 2, unlabeled)_                                          | Ship name                                                                                                                                                                                     |
| `release_date`, `year`, `month`                                      | Release date                                                                                                                                                                                  |
| `source_orig`, `source`                                              | Where the ship can be acquired. One of: `C Store`, `C Store (Bundle)`, `C Store (Leg)`, `C Store (Mudd)`, `Lockbox`, `Lobi`, `Promo`, `Phoenix`, `Fleet`, `Veteran`, `Giveaway`, `Event only` |
| `bundle`, `starter_bundle`                                           | Bundle membership                                                                                                                                                                             |
| `faction`                                                            | `Federation`, `Klingon`, `Romulan`, `Dominion`, `X-faction`                                                                                                                                   |
| `origin`                                                             | Fictional race/culture (Borg, Vulcan, Breen, ...)                                                                                                                                             |
| `family`                                                             | Ship family grouping (for variants)                                                                                                                                                           |
| `mastery_package`, `ship_type`, `ship_type_detailed`                 | Classification                                                                                                                                                                                |
| `max_t/e/s/u/int/cmd/pil/tmp/mw`, `full`                             | Highest BOff seat rank per career/spec (and primary spec token)                                                                                                                               |
| `total_tac/eng/sci/int/cmd/pil/tmp/mw`                               | Total BOff ability slots available per career/spec                                                                                                                                            |
| `num_specs`, `num_spec_seats`, `num_spec_slots`                      | Number of distinct specs, spec seats, spec-ability slots                                                                                                                                      |
| `h_mod`, `hull`, `s_mod`                                             | Defensive stats (hull mod, hull HP, shield mod)                                                                                                                                               |
| `turn`, `imp`, `inrt`                                                | Turn rate, impulse mod, inertia                                                                                                                                                               |
| `power_w/s/e/a`                                                      | Weapons/Shields/Engines/Auxiliary power bonuses                                                                                                                                               |
| `b1r/b1c/b1s` .. `b6r/b6c/b6s`                                       | BOff station layout: 6 stations of {rank, career, spec}                                                                                                                                       |
| `weapon_total`, `fore`, `aft`, `dhc`, `exp`                          | Weapon slot counts, DHC support, experimental-weapon slot                                                                                                                                     |
| `hangars`, _Dev_ _(col 71, unlabeled)_, `fleet`                      | Hangar bay count, device slots, fleet/module flag                                                                                                                                             |
| `console_t/e/s/u`                                                    | Tac/Eng/Sci/Universal console counts                                                                                                                                                          |
| `cc_w/s/e/t`                                                         | Cruiser command auras (weapon/shield/engine/threat)                                                                                                                                           |
| `secdef`, `sub_targeting`, `sensor_analysis`, `tac_mode`             | Science-ship features                                                                                                                                                                         |
| `singularity`, `cloak`, `flank`, `wingmen`                           | Misc features (inc. flanking %)                                                                                                                                                               |
| `trait_name`, `trait_summary`, `trait_url`                           | Starship trait (name, descriptive summary, link to stowiki)                                                                                                                                   |
| `console_name`, `console_url`                                        | Unique universal console                                                                                                                                                                      |
| `adm_rarity/role/e/t/s/bonus`                                        | Admiralty card stats                                                                                                                                                                          |
| `released` _(col 98)_, _SD_SHOW_ _(col 99)_, _Highlight_ _(col 100)_ | Row-level filter flags. The parser keeps only rows where `released=TRUE AND SD_SHOW=TRUE`                                                                                                     |
| `career`, `cloak_rank`, `wiki_url`                                   | Career, cloak tier, stowiki link                                                                                                                                                              |

### Notes and caveats

- **No tier variation**: every row is a T6 ship. The `X-Upgrades` column
  (col 103, unlabeled) flags which T6-X upgrades exist. T5 / T5-U coverage
  is out of scope for this source.
- **Science Destroyers** have three rows in `ImportShips` (base + Tactical
  Mode + Science Mode). Only the base row has `SD_SHOW=TRUE`, so the parser
  naturally collapses them to one row per ship.
- **Duplicate columns near the end** (`console_t/e/s` at cols 104-106, plus
  three unlabeled `*_PLUS` columns at 107-109, plus a duplicate `devices` at
  col 102 and `name` at col 112) are used by the pivoted `Ships` tab to
  compute upgraded console counts. We only read the first occurrence of each
  console column (73-75) since those are the base counts. The `console_u`
  column only exists in its later position (col 101) and is used directly.
- **Cell colour coding** used on the live sheet (sci/tac/eng/uni consoles,
  admiralty card) is not exposed via CSV export. We ignore it; our scoring is
  numeric-only.
- **Trait utility/damage scoring** is not pre-scored in the sheet. We derive
  our own scores from the trait summary + a hand-curated override table.
- **X-faction** means available to all factions.

## Secondary / fallback: stowiki.net Cargo

[stowiki.net](https://stowiki.net) exposes a MediaWiki API at
`https://stowiki.net/w/api.php`. Relevant Cargo tables:

- `Ships` - structured ship data (confirmed fields include `name`, `tier`, `faction`, `rank`, `hull`, `type`, `fore`, `aft`, `hangars`, `boffs`, `cost`, `image`)
- `Infobox` - generic infobox data
- `Traits` - starship/BOff/personal traits

Example query:

```
https://stowiki.net/w/api.php?action=cargoquery&tables=Ships&fields=name,tier,faction,fore,aft,hull&limit=5&format=json
```

Useful as a cross-reference, for T5/T5-U coverage, and for richer per-ship
wiki content (images, detailed descriptions). Not needed for the v1 scoring
pipeline.

Notes:

- `Special:CargoTables` HTML pages are blocked by Cloudflare with a 403. The
  JSON API at `/w/api.php` works. Schema discovery is therefore by field
  probing.
- Send a descriptive `User-Agent` header per MediaWiki etiquette, e.g.
  `sto-ship-ranking/0.1 (+https://github.com/tomcorke/sto-ship-ranking)`.
