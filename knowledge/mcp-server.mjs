#!/usr/bin/env node
// Servidor MCP (stdio) da base de conhecimento de design do Sidebar.io.
// Ferramentas: buscar no índice, ver o que entrou recentemente e ler um
// artigo ao vivo. Toda resposta carrega a fonte: link do artigo, domínio e
// a página do item no Sidebar.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AREAS, LEVELS } from "./taxonomy.mjs";
import { latest, loadIndex, search } from "./search.mjs";
import { readArticle } from "./article.mjs";

const area = z.enum(Object.keys(AREAS)).optional().describe("Área: " + Object.keys(AREAS).join(", "));
const level = z.enum(LEVELS).optional().describe("Nível de senioridade: " + LEVELS.join(", "));

const server = new McpServer({ name: "design-knowledge", version: "0.1.0" });

function format(items) {
  if (items.length === 0) return "Nenhum resultado.";
  return items
    .map(
      (i, n) =>
        `${n + 1}. ${i.title} — ${i.domain} (${i.postedAt.slice(0, 10)})\n` +
        `   ${i.summary}\n` +
        `   áreas: ${i.areas.join(", ")} · níveis: ${i.levels.join(", ")} · categorias: ${i.categories.join(", ")}\n` +
        `   link: ${i.url}\n   via Sidebar: ${i.sidebarUrl}`
    )
    .join("\n\n");
}

server.registerTool(
  "search_design_knowledge",
  {
    title: "Buscar na base de design",
    description:
      "Busca links curados pelo Sidebar.io (design, produto, liderança, operações, gestão, IA). Retorna título, resumo curto, área, nível e as fontes. Use antes de afirmar algo, para embasar a análise em fontes reais.",
    inputSchema: {
      query: z.string().describe("Termos de busca, em inglês de preferência (a base é em inglês)"),
      area,
      level,
      since: z.string().optional().describe("Data mínima ISO (ex.: 2024-01-01)"),
      limit: z.number().int().min(1).max(50).optional(),
    },
  },
  async (args) => ({ content: [{ type: "text", text: format(search(args)) }] })
);

server.registerTool(
  "latest_design_links",
  {
    title: "Links recentes",
    description: "Lista o que entrou no Sidebar.io nos últimos N dias, opcionalmente filtrando por área.",
    inputSchema: {
      days: z.number().int().min(1).max(90).optional(),
      area,
      limit: z.number().int().min(1).max(100).optional(),
    },
  },
  async (args) => ({ content: [{ type: "text", text: format(latest(args)) }] })
);

server.registerTool(
  "read_article",
  {
    title: "Ler artigo",
    description:
      "Abre um artigo ao vivo e devolve o texto principal com título, autor e site. O texto não é armazenado; cite sempre o autor e o link ao usar o conteúdo.",
    inputSchema: { url: z.string().url() },
  },
  async ({ url }) => {
    try {
      const a = await readArticle(url);
      const head = [
        `Título: ${a.title}`,
        `Autor: ${a.author ?? "não informado"}`,
        `Site: ${a.site}`,
        a.published ? `Publicado: ${a.published}` : null,
        `Fonte: ${a.url}`,
        a.truncated ? "(texto truncado)" : null,
      ].filter(Boolean);
      return { content: [{ type: "text", text: `${head.join("\n")}\n\n${a.text}` }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: `Não foi possível ler o artigo: ${error.message}` }] };
    }
  }
);

server.registerTool(
  "knowledge_stats",
  {
    title: "Estado da base",
    description: "Quantos itens a base tem, quando foi atualizada e quantos por área.",
    inputSchema: {},
  },
  async () => {
    const { items, updatedAt, count } = loadIndex();
    const byArea = Object.keys(AREAS).map((a) => `${a}: ${items.filter((i) => i.areas.includes(a)).length}`);
    return { content: [{ type: "text", text: `${count} itens · atualizado em ${updatedAt}\n${byArea.join("\n")}` }] };
  }
);

await server.connect(new StdioServerTransport());
