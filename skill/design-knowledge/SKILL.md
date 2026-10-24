---
name: design-knowledge
description: Análise de design, produto, liderança, operações, gestão e IA embasada nos links curados pelo Sidebar.io (24k+ artigos), sempre com fontes. Use quando o pedido for analisar ou criticar um produto, interface, case, marca ou decisão de design; montar uma note, case ou apresentação com embasamento; estudar um tema de design em um nível de senioridade (junior, mid, senior, lead); ou quando o usuário mencionar "design knowledge", "sidebar" ou "base de design". Requer o MCP server "design-knowledge".
---

# Design Knowledge

Base de conhecimento de design construída 100% a partir dos links curados pelo [Sidebar.io](https://sidebar.io). O MCP `design-knowledge` dá acesso a ela:

| Ferramenta | Para quê |
|---|---|
| `search_design_knowledge` | Buscar por tema, com filtro de área, nível e data |
| `latest_design_links` | Ver o que entrou recentemente |
| `read_article` | Ler o texto de um artigo ao vivo (não fica armazenado) |
| `knowledge_stats` | Tamanho e data de atualização da base |

Áreas: `leadership`, `operations`, `management`, `design`, `product`, `ai`. Níveis: `junior`, `mid`, `senior`, `lead`. A classificação é heurística (palavras-chave); confirme o encaixe lendo o resumo.

## Fluxo

1. **Enquadre a pergunta.** Qual decisão está em jogo? Quais áreas ela toca? Para qual nível de senioridade é a resposta?
2. **Busque em inglês**, a base é em inglês. Faça de 2 a 4 buscas com ângulos diferentes (o problema, o padrão de solução, o trade-off), filtrando por área ou nível quando ajudar.
3. **Escolha de 2 a 4 fontes** pelo resumo e pela data. Prefira as mais recentes em temas que mudam rápido (IA, ferramentas).
4. **Leia antes de afirmar.** Use `read_article` nas fontes que vão sustentar o argumento. Não atribua a um autor nada que você só deduziu do título.
5. **Sintetize.** Separe o que a fonte diz do que é inferência sua aplicada ao caso.

## Lente de senioridade

Ajuste a profundidade ao nível pedido (ou ao da pessoa):

- **junior**: o quê e como. Padrões, checklists, exemplos concretos, erros comuns.
- **mid**: quando e por quê. Escolher entre padrões, justificar decisões, medir o resultado.
- **senior**: trade-offs e sistemas. Impacto no produto todo, custos de longo prazo, influência sem autoridade.
- **lead**: organização e negócio. Time, processo, prioridades, como vender a decisão para executivos e investidores.

## Formato da resposta

- Comece pela conclusão ou recomendação, depois o raciocínio.
- Toda ideia tirada de um artigo leva a fonte em linha: `([Título](url), Autor ou site)`.
- Feche com uma seção **Fontes** listando cada artigo usado: título, autor ou site, link e o link do item no Sidebar.
- Se a base não tiver nada relevante, diga isso claramente em vez de preencher com conhecimento genérico apresentado como se fosse da base.

## Regras

- Nunca invente fontes, autores, datas ou citações.
- Não copie trechos longos: resuma com as suas palavras e cite. Citação literal só curta e entre aspas.
- O crédito é sempre do autor do artigo; o Sidebar é o curador. Mencione os dois.
- Ao produzir conteúdo para publicação, deixe claro que foi gerado com IA a partir dessas fontes.
