# Content Sources — Expanding Beyond Sidebar.io

This guide describes how to bring content from other sources into the reading queue, alongside or instead of Sidebar.io. Each source follows the same pipeline: fetch → classify → merge into CSV.

---

## Pipeline structure

Every new source plugs into the same output schema used by `scripts/update-sidebar-data.mjs`:

```
reading_day, tier, track, score, postedAtFormatted,
title, domain, categories, body, url, isSponsored
```

The classifier (`classify()`) and scorer (`scorePost()`) functions are already generic enough to handle any source — you only need to write the **fetcher** for each new one.

---

## How to add a new source

1. Create `scripts/sources/<source-name>.mjs` that exports an async `fetchPosts()` function returning an array of raw post objects.
2. Each raw post must have: `title`, `url`, `body`, `domain`, `postedAt`, `isSponsored`, `categories`.
3. Import and call `fetchPosts()` from the main `update-sidebar-data.mjs` before the classify/sort step.
4. Merge the results into the `all` array: `all.push(...await fetchSource())`.

```js
// update-sidebar-data.mjs (modified top section)
import { fetchPosts as fetchSidebar } from "./sources/sidebar.mjs";
import { fetchPosts as fetchTldr } from "./sources/tldr.mjs";

const all = [
  ...await fetchSidebar(),
  ...await fetchTldr(),
  // add more sources here
];
```

---

## Approved sources by prompt type

Use the prompt templates below when asking an AI (Claude, ChatGPT, Perplexity) to surface links for a given category. Paste the output into a JSON file under `scripts/sources/manual/` and run the merge script.

---

### Prompt template — general article sourcing

```
Find 20 high-quality articles or resources about [TOPIC] published after [YEAR].
For each, return:
- title
- url
- one-sentence summary (body)
- domain (extracted from url)
- published date (postedAt, ISO 8601)
- categories (comma-separated tags)

Format: JSON array. Only include real, accessible URLs. No paywalled content unless the source is widely recognized (HBR, Nielsen Norman, etc.).
```

---

### Prompt template — track-specific sourcing

Use this when you want to fill a specific track (e.g., "AI for Product") that is underrepresented in the current queue.

```
I'm building a reading queue for product managers. The track "AI for Product" needs more depth.

Find 15 articles, papers, or guides about applying AI/LLMs to product management, published between 2022 and 2025.
Prioritize: practical frameworks, real case studies, prompt engineering for PMs, and AI roadmap strategy.
Exclude: generic AI hype, vendor marketing, and listicles.

Return as a JSON array with fields: title, url, body (one sentence), domain, postedAt (ISO 8601), categories.
```

---

## Source catalog

### RSS / Newsletter feeds (automated)

| Source | URL | Best tracks |
|---|---|---|
| Lenny's Newsletter | `https://www.lennysnewsletter.com/feed` | PM Core, Career |
| Mind the Product | `https://www.mindtheproduct.com/feed/` | PM Core, Discovery |
| Nielsen Norman Group | `https://www.nngroup.com/feed/rss/` | UX/UI Execution, Discovery |
| Paul Graham Essays | `http://www.paulgraham.com/rss.html` | PM Core, Career |
| Stratechery (free tier) | `https://stratechery.com/feed/` | PM Core |
| The Pragmatic Engineer | `https://newsletter.pragmaticengineer.com/feed` | Technical Fluency |

**Fetcher skeleton (RSS):**

```js
// scripts/sources/rss.mjs
import { parseStringPromise } from "xml2js";

export async function fetchRss(url, defaultCategories = []) {
  const res = await fetch(url);
  const xml = await res.text();
  const feed = await parseStringPromise(xml);
  const items = feed.rss?.channel?.[0]?.item || [];
  return items.map((item) => ({
    title: item.title?.[0] || "",
    url: item.link?.[0] || "",
    body: item.description?.[0]?.replace(/<[^>]+>/g, "").slice(0, 200) || "",
    domain: new URL(item.link?.[0] || "https://unknown").hostname,
    postedAt: new Date(item.pubDate?.[0] || Date.now()).toISOString(),
    isSponsored: false,
    categories: defaultCategories
  }));
}
```

---

### Curated lists (manual, prompted)

Run the prompt templates above and save output to:

```
scripts/sources/manual/YYYY-MM-DD-<topic>.json
```

Then run the merge script:

```js
// scripts/merge-manual.mjs
import fs from "node:fs";
import path from "node:path";
import { classify } from "./classify.mjs"; // extract classify() to a shared module

const dir = path.resolve("scripts/sources/manual");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
const posts = files.flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));

// merge with existing CSV or pass to update-sidebar-data.mjs
console.log(JSON.stringify(posts.map(classify), null, 2));
```

---

### GitHub (trending repos / README links)

Useful for **Technical Fluency** and **AI for Product** tracks.

```
Find 10 GitHub repositories that would help a product manager understand [AI agents / system design / APIs / etc.].
For each, include: title (repo name + tagline), url, body (README first paragraph), domain ("github.com"), postedAt (last release date if available, else today), categories.
Return as JSON array.
```

---

### Academic / long-form (low frequency)

For **Discovery & Research** and **Design Culture**. Use Perplexity or Claude with web access:

```
Search for 10 foundational papers or long-form essays on [user research / jobs-to-be-done / decision-making / etc.] that a senior PM should have read.
Include only works that are freely accessible online.
Return as JSON: title, url, body (abstract or first sentence), domain, postedAt (publication year as YYYY-01-01), categories.
```

---

## Deduplication

When merging sources, deduplicate by `url` before writing the CSV:

```js
const seen = new Set();
const deduped = all.filter((post) => {
  if (seen.has(post.url)) return false;
  seen.add(post.url);
  return true;
});
```

---

## Tracking source origin (optional)

Add a `source` field to the CSV schema to track where each link came from. Useful for analytics and filtering:

```js
const header = ["reading_day", "tier", "track", "score", "source", ...rest];
```

Each fetcher stamps its own identifier:

```js
return posts.map((p) => ({ ...p, source: "lenny-newsletter" }));
```

This lets you filter the dashboard by source in a future update.

---

## File structure (when done)

```
scripts/
├── update-sidebar-data.mjs      ← main orchestrator
├── classify.mjs                 ← shared classify/score functions (extracted)
├── sources/
│   ├── sidebar.mjs              ← existing Sidebar.io fetcher
│   ├── rss.mjs                  ← generic RSS fetcher
│   ├── tldr.mjs                 ← TLDR Tech fetcher (example)
│   └── manual/
│       ├── 2025-06-01-ai-pm.json
│       └── 2025-06-10-discovery.json
└── merge-manual.mjs             ← merge prompted/manual content
```
