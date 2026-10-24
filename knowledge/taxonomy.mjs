// Taxonomia da base: 6 áreas (as mesmas do The Token Corp) e 4 níveis de
// senioridade. A classificação é por palavras-chave sobre título, resumo e
// categorias do Sidebar — heurística, não verdade absoluta. Um item pode cair
// em mais de uma área.

export const AREAS = {
  leadership: [
    "leadership", "leader", "lead ", "career", "mentor", "coaching", "influence",
    "vision", "culture", "hiring", "feedback", "team", "manager",
  ],
  operations: [
    "designops", "design ops", "operations", "process", "workflow", "productivity",
    "tooling", "handoff", "documentation", "governance", "scale", "scaling", "remote",
  ],
  management: [
    "management", "stakeholder", "roadmap", "priorit", "okr", "planning", "budget",
    "estimate", "meeting", "collaboration", "communication", "presentation", "critique",
  ],
  design: [
    "design system", "ux", "ui", "usability", "accessibility", "typography", "color",
    "interaction", "visual", "branding", "brand", "figma", "prototype", "motion",
    "animation", "illustration", "layout", "icon", "research", "user test",
  ],
  product: [
    "product management", "product", "strategy", "discovery", "customer", "jobs to be done",
    "jtbd", "metric", "analytics", "pricing", "growth", "onboarding", "retention",
    "startup", "business", "market", "experiment",
  ],
  ai: [
    "ai", "llm", "llms", "agent", "chatgpt", "claude", "gpt", "machine learning",
    "prompt", "generative", "copilot", "artificial intelligence",
  ],
};

export const LEVELS = ["junior", "mid", "senior", "lead"];

const LEVEL_HINTS = {
  junior: ["beginner", "introduction", "intro to", "basics", "what is", "getting started", "101", "guide to", "cheat sheet", "checklist", "tips"],
  senior: ["framework", "systems", "trade-off", "tradeoff", "architecture", "deep dive", "case study", "strategy", "principles", "mental model"],
  lead: ["leadership", "manager", "org", "hiring", "team", "culture", "vision", "executive", "stakeholder", "career"],
};

// Palavra inteira no início ("priorit" casa "prioritize"), nunca no meio
// ("ui" não casa "build", "ai" não casa "detail").
const matchers = new Map();
function hits(text, word) {
  let re = matchers.get(word);
  if (!re) {
    const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}`, "u");
    matchers.set(word, re);
  }
  return re.test(text);
}

export function classify({ title = "", summary = "", categories = [] }) {
  const text = `${title} ${summary} ${categories.join(" ")}`.toLowerCase();

  const areas = Object.entries(AREAS)
    .filter(([, words]) => words.some((w) => hits(text, w)))
    .map(([area]) => area);

  const levels = Object.entries(LEVEL_HINTS)
    .filter(([, words]) => words.some((w) => hits(text, w)))
    .map(([level]) => level);
  // Sem pista clara, o conteúdo é tratado como de nível pleno.
  if (levels.length === 0) levels.push("mid");

  return { areas: areas.length ? areas : ["design"], levels };
}
