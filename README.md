# Reading OS

A personal reading dashboard built on top of [Sidebar.io](https://sidebar.io)'s archive of 24,000+ curated product, design, and tech links.

Pick your career path and seniority level. The queue re-ranks itself around what you actually need to read right now.

---

## What it does

- **Ranks 24k links** by track, tier, recency, and your seniority — not chronologically
- **Serves N links per day** (your pace, your choice) with localStorage progress tracking
- **7 study tracks** — PM Core, Discovery & Research, AI for Product, Career & Communication, UX/UI Execution, Technical Fluency, Design Culture
- **Browser notifications** for daily reading reminders
- **Smooth scroll** powered by Lenis

No backend. No login. Runs entirely in the browser.

---

## Stack

| | |
|---|---|
| Runtime | Vanilla JS (ES modules) |
| Dev server | Vite |
| Scroll | Lenis |
| Data | Sidebar.io GraphQL → local CSV |
| Storage | `localStorage` |

---

## Getting started

```bash
git clone https://github.com/felipeszarena/sidebar-repo
cd reading-os
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Updating the content

The CSV ships with a snapshot of the Sidebar.io archive. To pull fresh data:

```bash
node scripts/update-sidebar-data.mjs
```

Requires Node 18+. Fetches all published posts, classifies them into tracks, scores them, and writes a new `sidebar_reading_queue.csv`.

Schedule it as a daily cron or wire it to a backend endpoint — see [admin-sync-panel.md](admin-sync-panel.md) for the full guide.

---

## Adding content sources

Sidebar.io is the default source, but the pipeline accepts any feed. See [content-sources.md](content-sources.md) for:

- RSS fetcher skeleton (Lenny's, NNg, Pragmatic Engineer, etc.)
- Prompt templates for AI-assisted sourcing
- Manual JSON merge flow
- Deduplication and source tagging

---

## How scoring works

Each link gets a base score from the update script, then the app applies real-time adjustments:

```
finalScore = baseScore
           + trackBoost      (preferred tracks for your career path)
           + seniorityBoost  (tracks weighted for your level)
           + tierBoost       (Tier 1 +20, Tier 2 +9)
           − sponsoredPenalty (−12 if sponsored)
```

Links are then sliced into daily batches by offset — no repetition until you loop the full queue.

---

## Tracks

| Track | Focus |
|---|---|
| PM Core | Strategy, roadmap, prioritization, metrics |
| Discovery & Research | User research, interviews, JTBD, usability |
| AI for Product | LLMs, agents, AI roadmap, prompt engineering |
| Career & Communication | Leadership, stakeholders, writing, management |
| UX/UI Execution | Design systems, accessibility, interaction |
| Technical Fluency | APIs, performance, engineering fundamentals |
| Design Culture | Typography, illustration, branding, case studies |

---

## Project structure

```
/
├── index.html                  — dashboard shell
├── app.js                      — all runtime logic
├── styles.css                  — design system
├── sidebar_reading_queue.csv   — content snapshot (24k links)
├── scripts/
│   └── update-sidebar-data.mjs — data pipeline
├── admin-sync-panel.md         — guide: admin panel + auto-sync
└── content-sources.md          — guide: adding content sources
```

---

## Roadmap

- [ ] Admin panel with one-click sync
- [ ] Multi-source support (RSS feeds, manual imports)
- [ ] Export today's links as markdown
- [ ] Streak tracking
- [ ] Dark/light toggle

---

## License

MIT
