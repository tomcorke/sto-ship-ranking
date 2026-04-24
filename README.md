# STO Ship Ranking

A web app for filtering, comparing, and ranking Star Trek Online starships.

> **Status**: Early scaffolding. Data pipeline, filters, and scoring rubric
> are being built out.

## What it does (planned)

- Browse and filter T6 playable ships by availability, faction, tier,
  specialisation, slot counts, and special features.
- Compare multiple ships side-by-side with per-category winner highlighting.
- Rank ships with a built-in scoring rubric that aggregates weapon slots,
  console slots, BOff ability slots, starship trait utility/damage, and
  special features into a single numeric score per ship.

Full requirements are in the task file in the local Obsidian vault.

## Stack

- [Vite+](https://viteplus.dev/) - unified toolchain (Vite + Vitest + oxlint + oxfmt + Rolldown)
- React 18 + TypeScript
- pnpm (via Vite+'s managed install)

## Getting started

Vite+ is a prerequisite. Install it once globally:

```sh
curl -fsSL https://vite.plus | bash
```

Then in this repo:

```sh
pnpm install
pnpm run dev       # start dev server with HMR on http://localhost:5173
pnpm run build     # type-check + production build
pnpm run preview   # preview the production build
```

## Data

Ship data comes from [Fleffle's T6 Ship List v2](https://docs.google.com/spreadsheets/d/1SSsxWmE8Oz35D6MvLheFNUfhWerHNkUGOGtjxLlrTuA/edit)
(Google Sheet, public, maintained by `@vanderben`). A CSV snapshot is
committed at `data/ships.csv`.

Refresh the snapshot with:

```sh
pnpm run data:fetch
```

Full data source notes, schema, and caveats are in [`data/README.md`](./data/README.md).

## Repo layout

```
.
├── data/               # ship data snapshot + schema docs
│   ├── README.md
│   └── ships.csv
├── scripts/            # maintenance scripts
│   └── fetch-data.ts   # refreshes data/ships.csv from the upstream Sheet
├── src/                # React + TS SPA
│   ├── App.tsx
│   ├── main.tsx
│   └── style.css
├── index.html
├── vite.config.ts
└── tsconfig.json
```

## Notes

- `.npmrc` in this repo pins installs to the public npm registry regardless of
  any global registry overrides, so installs work out-of-the-box on any machine.

## Deployment

Pushes to `main` auto-deploy to GitHub Pages via the workflow in
`.github/workflows/deploy.yml`. The workflow runs `vp install` and `vp build`,
then publishes `dist/` through the `github-pages` environment using GitHub's
official Pages actions. The deployed URL is reported by the `deploy` job and
surfaced on the environment page; the production build uses a Vite base path
of `/sto-ship-ranking/` so assets resolve correctly under the Pages subpath.
