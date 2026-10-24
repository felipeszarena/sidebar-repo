// Leitura de um artigo ao vivo, no momento da consulta: baixa a página,
// extrai título, autor e texto principal. Nada é gravado — o texto pertence
// ao autor e só passa pela conversa, sempre com a fonte junto.
const MAX_BYTES = 2_000_000;
const MAX_CHARS = 14_000;

export async function readArticle(url) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
    headers: {
      "User-Agent": "design-knowledge-mcp/0.1 (+https://github.com/felipeszarena/sidebar-repo)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao abrir ${url}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new Error(`Conteúdo não é HTML (${type || "desconhecido"})`);
  const html = (await res.text()).slice(0, MAX_BYTES);

  const title = meta(html, "og:title") ?? tag(html, "title") ?? "";
  const author =
    meta(html, "author") ?? meta(html, "article:author") ?? meta(html, "twitter:creator") ?? null;
  const site = meta(html, "og:site_name") ?? new URL(res.url).hostname;
  const published = meta(html, "article:published_time") ?? null;

  const main = section(html, "article") ?? section(html, "main") ?? section(html, "body") ?? html;
  let text = toText(main);
  const truncated = text.length > MAX_CHARS;
  if (truncated) text = text.slice(0, MAX_CHARS) + " […]";

  return { url: res.url, title: decode(title), author: author && decode(author), site: decode(site), published, text, truncated };
}

function meta(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`,
    "i"
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2]).trim() : null;
}

function tag(html, name) {
  const m = html.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : null;
}

function section(html, name) {
  const m = html.match(new RegExp(`<${name}[\\s>][\\s\\S]*</${name}>`, "i"));
  return m ? m[0] : null;
}

function toText(html) {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(h[1-6])[^>]*>/gi, "\n\n## ")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<(p|br|div|section|blockquote|tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n\s*(\n\s*)+/g, "\n\n")
    .trim();
}

function decode(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
