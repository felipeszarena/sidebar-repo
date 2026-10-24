// Sync incremental do índice: busca no GraphQL do Sidebar os posts mais
// recentes até encontrar um que já está no índice, grava
// data/index.json (do mais novo pro mais antigo). Na primeira execução (sem
// índice), baixa o arquivo inteiro.
//
// Só metadados e o resumo curto do próprio Sidebar — o texto dos artigos
// nunca é guardado aqui (ver knowledge/article.mjs).
//
// Uso: node knowledge/sync-index.mjs [--full]
import fs from "node:fs";
import path from "node:path";
import { classify } from "./taxonomy.mjs";

const root = path.resolve(import.meta.dirname, "..");
const INDEX = path.join(root, "data", "index.json");
const ENDPOINT = "https://sidebar.io/graphql";
const PAGE = 500;
const QUERY = `query posts($input: MultiPostInput){
  posts(input:$input){
    results{ _id title url domain body postedAt pageUrl isSponsored categories{ name } }
  }
}`;

const full = process.argv.includes("--full");
const existing = !full && fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : { items: [] };
const known = new Set(existing.items.map((item) => item.id));

const fresh = [];
let done = false;
for (let offset = 0; !done; offset += PAGE) {
  const posts = await fetchPage(offset);
  if (posts.length === 0) break;
  for (const post of posts) {
    if (known.has(post._id)) {
      done = true;
      break;
    }
    if (post.isSponsored || !post.url) continue;
    fresh.push(toItem(post));
  }
  console.error(`page @${offset}: ${fresh.length} new so far`);
}

// Reclassifica tudo a cada execução: mudanças na taxonomia valem para o
// arquivo inteiro sem precisar baixar de novo.
const items = [...fresh, ...existing.items].map((item) => ({ ...item, ...classify(item) }));
fs.mkdirSync(path.dirname(INDEX), { recursive: true });
fs.writeFileSync(
  INDEX,
  JSON.stringify({ source: "https://sidebar.io", updatedAt: new Date().toISOString(), count: items.length, items }) + "\n"
);
console.log(`${fresh.length} new · ${items.length} total → data/index.json`);

async function fetchPage(offset) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: QUERY,
          variables: { input: { filter: { status: { _eq: 2 } }, sort: { postedAt: "desc" }, limit: PAGE, offset } },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.errors) throw new Error(JSON.stringify(json.errors));
      return json.data.posts.results ?? [];
    } catch (error) {
      if (attempt >= 3) throw error;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

function toItem(post) {
  return {
    id: post._id,
    title: post.title?.trim() ?? "",
    url: post.url,
    domain: post.domain ?? "",
    summary: post.body?.trim() ?? "",
    postedAt: post.postedAt,
    sidebarUrl: post.pageUrl,
    categories: (post.categories ?? []).map((c) => c?.name).filter(Boolean),
  };
}
