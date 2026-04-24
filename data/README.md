# Data sources

## Primary: Fleffle's T6 Ship List v2

[Sortable/Filterable T6 Ship List v2](https://docs.google.com/spreadsheets/d/1SSsxWmE8Oz35D6MvLheFNUfhWerHNkUGOGtjxLlrTuA/edit),
maintained by Fleffle (STO handle `@vanderben`).

- Spreadsheet ID: `1SSsxWmE8Oz35D6MvLheFNUfhWerHNkUGOGtjxLlrTuA`
- Sheet tab used: `Ships`
- Coverage: 489 Tier-6 playable starships (as of the snapshot below)
- Scope: T6 only. T5 / T5-U tabs were dropped in v2.

### How to refresh

```sh
pnpm run data:fetch
```

See `scripts/fetch-data.ts`. The script downloads the `Ships` tab as CSV via
the Google Sheets `gviz` export endpoint (no auth required, sheet is public)
and writes `data/ships.csv`.

### Snapshot provenance

`data/ships.csv` in this repo is the most recent committed snapshot. The upstream
spreadsheet is updated by Fleffle as new ships ship. Re-run the fetch script
periodically and commit the diff.

### Schema

The CSV has two header rows merged into one (row 1 is group label, row 2 is sub-label).
Key columns:

| Column(s) | Meaning |
|---|---|
| `ID` | Stable numeric ID assigned by Fleffle |
| `Name` | Ship name |
| `Acquisition Release (PC)`, `Year`, `Month` | Release date |
| `Orig Source`, `Source` | Where the ship can be acquired. One of: `C Store`, `C Store (Bundle)`, `C Store (Leg)`, `C Store (Mudd)`, `Lockbox`, `Lobi`, `Promo`, `Phoenix`, `Fleet`, `Veteran`, `Giveaway`, `Event only` |
| `Bundle(s)`, `Starter Bundle` | Bundle membership |
| `Faction` | `Federation`, `Klingon`, `Romulan`, `Dominion`, `X-faction` |
| `Origin` | Fictional race/culture (Borg, Vulcan, Breen, ...) |
| `Family` | Ship family grouping (for variants) |
| `Ship Role Mastery Package`, `Ship Type (Simplified)`, `Ship Type (Detailed)` | Classification |
| `Highest Seats Tac/Eng/Sci/Uni/Int/Cmd/Pil/Tmp/MW`, `Full` | Highest BOff seat rank per career/spec (and primary spec) |
| `Max Ability Counts Tac/Eng/Sci/Int/Cmd/Pil/Tmp/MW` | Total BOff ability slots available per career/spec |
| `Spec Details Specs/Spec Seats/Spec Slots` | Number of distinct specs, spec seats, spec-ability slots |
| `Defense Hull Mod`, `Hull`, `Shield Mod` | Defensive stats |
| `Mobility Turn/Imp/Inrt` | Turn rate, impulse mod, inertia |
| `Power Bonus W/S/E/A` | Weapons/Shields/Engines/Auxiliary power bonuses |
| `Boff 1..6` (3 cols each: rank, type, spec seat) | BOff station layout, 6 stations of {rank, type, spec} |
| `Weapons F + A/Fore/Aft/DHC/Exp` | Weapon slot counts, DHC support, experimental-weapon slot |
| `Misc Equips Hangars/Dev/Fleet` | Hangar bay count, device slots, fleet/module slots |
| `Consoles T/E/S/U` | Tac/Eng/Sci/Universal console counts |
| `Cruiser Commands Weapon/Shield/Engine/Threat` | Cruiser command auras |
| `Science Features Sec Def/Sub Targeting/Sensor Analysis/Tac Mode` | Science-ship features |
| `Misc Features Singularity/Cloak/Flanking/Wingmen` | Misc features (inc. flanking %) |
| `Trait Name`, `Trait Summary`, `Trait URL` | Starship trait (name, descriptive summary, link to stowiki) |
| `Universal Console`, `Console Name`, `Console URL` | Unique universal console |
| `Admiralty Card Rarity/Role/Eng/Tac/Sci/Bonus` | Admiralty card stats |
| `Wiki URL` | Link to stowiki page for the ship |

### Notes and caveats

- **No tier variation**: every row is a T6 ship. The `X-Upgrades` column flags
  which T6-X upgrades exist. T5 / T5-U coverage is out of scope for this source.
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
