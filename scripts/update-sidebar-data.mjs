import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "sidebar_reading_queue.csv");
const endpoint = "https://sidebar.io/graphql";
const query = `query posts($input: MultiPostInput){
  posts(input:$input){
    results{
      title url domain body postedAt postedAtFormatted isSponsored
      categories{ name }
    }
    totalCount
  }
}`;

const tracks = {
  "PM Core": ["product management", "strategy", "roadmap", "priorit", "okr", "business", "startup", "pricing", "market", "customer", "metric", "analytics"],
  "Discovery & Research": ["research", "interview", "discovery", "user test", "usability", "psychology", "persona", "journey", "jobs to be done", "jtbd"],
  "AI for Product": ["ai", "llm", "agent", "chatgpt", "machine learning", "prompt"],
  "Career & Communication": ["career", "leadership", "management", "writing", "stakeholder", "collaboration", "critique", "presentation"],
  "UX/UI Execution": ["design system", "accessibility", "ui", "ux", "figma", "mobile", "interaction", "prototype"],
  "Technical Fluency": ["css", "javascript", "programming", "engineering", "api", "performance", "code", "web.dev"],
  "Design Culture": ["typography", "color", "illustration", "animation", "motion", "branding", "inspiration", "case study"]
};

const all = [];
let total = null;
const limit = 500;

for (let offset = 0; total === null || all.length < total; offset += limit) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        input: {
          filter: { status: { _eq: 2 } },
          sort: { postedAt: "desc" },
          limit,
          offset,
          enableTotal: offset === 0
        }
      }
    })
  });

  if (!response.ok) throw new Error(`Sidebar request failed: ${response.status}`);
  const json = await response.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));

  const posts = json.data.posts.results || [];
  if (offset === 0) total = json.data.posts.totalCount;
  all.push(...posts);
  console.error(`Fetched ${all.length}/${total}`);
  if (!posts.length) break;
}

const rows = all.map(classify).sort((a, b) => {
  const tier = a.tier.localeCompare(b.tier);
  if (tier !== 0) return tier;
  return b.score - a.score;
});

rows.forEach((row, index) => {
  row.reading_day = Math.floor(index / 12) + 1;
});

const header = ["reading_day", "tier", "track", "score", "postedAtFormatted", "title", "domain", "categories", "body", "url", "isSponsored"];
const csv = [header.join(",")]
  .concat(rows.map((row) => header.map((key) => csvEscape(row[key])).join(",")))
  .join("\n");

fs.writeFileSync(output, csv);
console.log(`Updated ${output} with ${rows.length} links.`);

function classify(post) {
  const categories = (post.categories || []).filter(Boolean).map((category) => category.name).filter(Boolean);
  const text = `${post.title || ""} ${post.body || ""} ${categories.join(" ")}`.toLowerCase();
  const track = Object.entries(tracks).find(([, words]) => words.some((word) => text.includes(word)))?.[0] || "Reference / Optional";
  const score = scorePost(text, post);
  return {
    ...post,
    categories: categories.join("; "),
    track,
    score,
    tier: tierFor(score, track)
  };
}

function scorePost(text, post) {
  let score = 0;
  const add = (words, value) => {
    for (const word of words) if (text.includes(word)) score += value;
  };

  add(["product management", "strategy", "roadmap", "priorit", "discovery", "research", "user research", "interview", "customer", "metric", "analytics", "business", "okr", "jobs to be done", "jtbd"], 8);
  add(["ai", "llm", "agent", "chatgpt", "prompt", "prototype", "experiment", "design critique", "career", "leadership", "writing", "stakeholder", "collaboration"], 5);
  add(["ux", "psychology", "case study", "accessibility", "data visualization", "usability", "mobile", "design system"], 3);
  add(["css", "javascript", "svg", "typography", "illustration", "animation", "color", "icons", "branding", "inspiration", "games", "humor"], -2);

  const year = new Date(post.postedAt).getUTCFullYear();
  if (Number.isFinite(year) && year >= 2023) score += 4;
  else if (Number.isFinite(year) && year >= 2019) score += 2;
  if (post.isSponsored) score -= 6;
  return score;
}

function tierFor(score, track) {
  if (score >= 18 || ["PM Core", "Discovery & Research"].includes(track) && score >= 14) return "1 - Ler primeiro";
  if (score >= 10 || ["AI for Product", "Career & Communication", "UX/UI Execution"].includes(track) && score >= 8) return "2 - Proximo trimestre";
  if (score >= 4 || ["Technical Fluency", "Design Culture"].includes(track)) return "3 - Daqui um tempo";
  return "4 - Referencia / pular ate precisar";
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
