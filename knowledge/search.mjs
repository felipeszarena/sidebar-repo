// Busca no índice local: pontuação por termos (título pesa mais que resumo e
// categorias), filtros por área/nível/data e um leve bônus de recência.
import fs from "node:fs";
import path from "node:path";

const INDEX = path.resolve(import.meta.dirname, "..", "data", "index.json");
let cache = null;

export function loadIndex() {
  if (!cache) cache = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  return cache;
}

const STOP = new Set(["the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "with", "how", "what", "is", "de", "da", "do", "e", "o", "a", "para", "com", "como"]);

function terms(q) {
  return q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1 && !STOP.has(t));
}

export function search({ query = "", area, level, since, limit = 10 }) {
  const { items } = loadIndex();
  const words = terms(query);
  const sinceMs = since ? Date.parse(since) : null;
  const now = Date.now();

  const scored = [];
  for (const item of items) {
    if (area && !item.areas.includes(area)) continue;
    if (level && !item.levels.includes(level)) continue;
    if (sinceMs && Date.parse(item.postedAt) < sinceMs) continue;

    let score = 0;
    if (words.length) {
      const title = item.title.toLowerCase();
      const rest = `${item.summary} ${item.categories.join(" ")}`.toLowerCase();
      for (const w of words) {
        if (title.includes(w)) score += 3;
        if (rest.includes(w)) score += 1;
      }
      if (score === 0) continue;
      if (title.includes(query.toLowerCase())) score += 4;
    }
    const ageYears = (now - Date.parse(item.postedAt)) / 3.15e10;
    score += Math.max(0, 1.5 - ageYears * 0.25);
    scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.min(limit, 50)).map(({ item }) => item);
}

export function latest({ days = 7, area, limit = 20 }) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { items } = loadIndex();
  return items
    .filter((i) => i.postedAt >= since && (!area || i.areas.includes(area)))
    .slice(0, Math.min(limit, 100));
}
