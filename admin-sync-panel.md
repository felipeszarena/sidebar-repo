# Admin Sync Panel — Implementation Guide

The live sync with Sidebar.io was removed from the public dashboard because the browser blocks cross-origin GraphQL requests (CORS). This guide describes how to implement it properly inside a protected admin panel.

---

## Architecture overview

```
Admin Panel (protected route)
      │
      ▼
Backend endpoint  ──►  Sidebar.io GraphQL API  (no CORS issue server-side)
      │
      ▼
sidebar_reading_queue.csv  (static file or database)
      │
      ▼
Public dashboard reads the updated data
```

---

## Step 1 — Protect the admin route

The admin panel must never be publicly accessible. Options in order of simplicity:

| Option | How |
|---|---|
| HTTP Basic Auth | Nginx/Caddy password-protect `/admin` |
| Environment variable gate | Check `ADMIN_SECRET` header in the backend |
| Auth provider | Clerk, Auth.js, or Supabase Auth with role check |

For a static deployment (Vercel, Netlify), use middleware to block unauthenticated access to `/admin`.

---

## Step 2 — Backend sync endpoint

Create a server-side route that runs `scripts/update-sidebar-data.mjs` on demand.

### Option A — Node.js / Express

```js
// routes/admin-sync.js
import { execFile } from "node:child_process";
import path from "node:path";

export function adminSync(req, res) {
  if (req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const script = path.resolve("scripts/update-sidebar-data.mjs");
  execFile("node", [script], (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr });
    res.json({ ok: true, message: stdout });
  });
}
```

### Option B — Vercel Serverless Function

```js
// api/admin-sync.js  (Vercel)
import { exec } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(exec);

export default async function handler(req, res) {
  if (req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const { stdout } = await run("node scripts/update-sidebar-data.mjs");
    res.json({ ok: true, message: stdout });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

Set `ADMIN_SECRET` in Vercel environment variables (never commit it).

---

## Step 3 — Admin panel UI

Create `admin/index.html` (or a `/admin` page in your framework). It should show:

- **Last sync date** — read from a `meta.json` file written by the update script
- **Current link count** — parsed from the CSV header
- **Sync button** — calls the backend endpoint with the `x-admin-secret` header
- **Sync log** — display `stdout` from the script in a `<pre>` block

### Minimal fetch call from the admin UI

```js
async function triggerSync() {
  const res = await fetch("/api/admin-sync", {
    method: "POST",
    headers: { "x-admin-secret": prompt("Admin secret:") }
  });
  const data = await res.json();
  document.getElementById("log").textContent = data.message || data.error;
}
```

---

## Step 4 — Scheduled auto-sync (optional)

To sync automatically without manual intervention:

### Vercel Cron (recommended for Vercel deploys)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/admin-sync",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Add `x-admin-secret` verification via an environment variable that Vercel injects server-side only — the cron call never goes through the browser.

### System cron (self-hosted)

```bash
# crontab -e
0 6 * * * /usr/bin/node /path/to/scripts/update-sidebar-data.mjs >> /var/log/sidebar-sync.log 2>&1
```

---

## Step 5 — Write sync metadata

Update `scripts/update-sidebar-data.mjs` to write a `meta.json` alongside the CSV so the admin panel can display sync status without parsing the full file:

```js
// add at the end of update-sidebar-data.mjs
import { writeFileSync } from "node:fs";

writeFileSync(
  path.join(root, "meta.json"),
  JSON.stringify({ lastSync: new Date().toISOString(), count: rows.length }, null, 2)
);
```

The admin panel reads `meta.json` on load to show last sync time and link count delta.

---

## File structure (when done)

```
/
├── admin/
│   └── index.html        ← protected admin UI
├── api/
│   └── admin-sync.js     ← server-side sync endpoint
├── scripts/
│   └── update-sidebar-data.mjs
├── meta.json             ← sync metadata (auto-generated)
├── sidebar_reading_queue.csv
├── index.html            ← public dashboard
└── app.js
```
