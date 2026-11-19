# Leonida Trophy Tracker — GTA VI PS5

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/hermansto/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/hermansto/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and progress tracker for all 55 Grand Theft Auto VI PlayStation 5 trophies. Every trophy keeps its official name, description, and grade verbatim, paired with an original cited guide, a platinum roadmap that orders story checkpoints before collectibles and activities, conservative missable flags with reasons, search plus kind/grade filters and sorting, a spoiler shield that hides story trophy names until earned, and JSON export/import of your progress. Everything runs locally from static files — no network calls, no game artwork, no tracking.

## Features

- **55 cited trophies** — official PS5 names/descriptions/grades preserved verbatim; each entry has an original guide and source citations (`app/data/trophies.json`).
- **Platinum roadmap** — four stage groups (story chapters & missions, collectibles & exploration, activities & challenges, completion & platinum) with per-group earned counts and missable flags.
- **Missable priorities** — red flags with a reason derived from the official trophy text; filter the checklist to missables only.
- **Checklist tracker** — mark trophies earned, automatic platinum sync (unlocks only after the other 54), progress bar and per-grade counts, persisted in `localStorage`.
- **Filters & search** — All / Story / Missable / Collectibles / Activities chips, grade filter, sort by roadmap stage, name, or grade, full-text search across names, descriptions, and guides.
- **Spoiler shield** — hides story trophy names and descriptions (`???`) until earned; roadmap order and missable priorities stay visible.
- **Export / Import** — download progress as JSON and restore it on any device; deep-linkable hash views (`#trophy=slug`, `#roadmap`, `#filter=missable`, `#spoiler`).
- **Offline & original** — no network requests at runtime, no Rockstar logos or game art; fan-made, not affiliated with Rockstar Games or PlayStation.

## Run

Serve the static app with any local file server (a server is needed so the browser can fetch `data/trophies.json`):

```sh
cd app
python3 -m http.server 8099
# open http://127.0.0.1:8099/index.html
```

Build the make.fun dossier (Node 22+, stdlib only, no install):

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This stages `app/` and `screenshots/` into the output directory and writes `dossier.json` via the vendored `vendor/makefun-frontend.ts` builder. The build refuses to run if `app/index.html` is missing or if `screenshots/` does not hold 3–4 PNG/JPEG captures of at most 262144 bytes each.

## Screenshots

Real headless-Chromium renders of the running app (1280×800):

1. `screenshots/1-checklist.jpg` — checklist with the "Just Like Paradise" guide and sources open, filters and progress visible (cover).
2. `screenshots/2-roadmap.jpg` — platinum roadmap with stage groups and missable flags.
3. `screenshots/3-missables.jpg` — missable-only filter with chapter-window warnings.
4. `screenshots/4-spoiler.jpg` — spoiler shield ON, story trophies hidden until earned.

## License

MIT — see [LICENSE](LICENSE). Trophy names and descriptions are factual metadata from the official PlayStation trophy list; all guide text, code, and design are original.
