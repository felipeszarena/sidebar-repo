# Design Knowledge (MCP + skill)

Base de conhecimento de design construída a partir dos links curados pelo [Sidebar.io](https://sidebar.io), com um servidor MCP e uma skill para o Claude usá-la em análises, notes e cases, sempre citando as fontes.

## O que tem aqui

| Arquivo | O que faz |
|---|---|
| `knowledge/sync-index.mjs` | Busca no Sidebar o que é novo e atualiza `data/index.json` |
| `knowledge/taxonomy.mjs` | Classifica cada link em áreas e níveis de senioridade |
| `knowledge/search.mjs` | Busca no índice |
| `knowledge/article.mjs` | Lê um artigo ao vivo |
| `knowledge/mcp-server.mjs` | Servidor MCP (stdio) |
| `skill/design-knowledge/SKILL.md` | Skill que ensina o Claude a usar a base |
| `.github/workflows/sync-knowledge.yml` | Sync automático diário |

**Áreas:** leadership, operations, management, design, product, ai.
**Níveis:** junior, mid, senior, lead.

## Usar com o Claude Code

```bash
git clone https://github.com/felipeszarena/sidebar-repo && cd sidebar-repo && npm install
claude mcp add --scope user design-knowledge -- node "$PWD/knowledge/mcp-server.mjs"
ln -s "$PWD/skill/design-knowledge" ~/.claude/skills/design-knowledge
```

Outros clientes MCP (Claude Desktop, Cursor etc.) usam o mesmo comando: `node /caminho/para/sidebar-repo/knowledge/mcp-server.mjs`.

## Atualizar a base

```bash
npm run sync          # só o que é novo
npm run sync -- --full  # baixa o arquivo inteiro de novo
```

No GitHub, o workflow roda todo dia e faz commit do índice atualizado.

## Fontes e direitos

- O índice guarda só metadados e o resumo curto publicado pelo Sidebar, com link para o original.
- O texto dos artigos **não** é armazenado: `read_article` lê a página na hora e o conteúdo só passa pela conversa.
- Todo conteúdo pertence aos seus autores. A curadoria é do Sidebar.io, criado por [Sacha Greif](https://sachagreif.com). Este projeto não é afiliado ao Sidebar.
