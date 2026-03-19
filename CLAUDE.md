

## Code Review Graph (Knowledge Graph for Code Search)

This repository has a **code-review-graph** knowledge graph (`.code-review-graph/graph.db`) that indexes all code symbols, relationships, and dependencies. **Use it before grep/find for faster, more accurate code exploration.**

### When to Use

- **Finding symbol definitions, references, and call chains** — use `query_graph` or `get_review_context` instead of grepping
- **Understanding blast radius of changes** — use `get_impact_radius` with changed file paths
- **Code review** — use `get_review_context` to get focused subgraphs with review prompts
- **Semantic search** — use `semantic_search_nodes` for keyword/concept searches across the graph

### CLI Commands

```bash
# Check graph status
code-review-graph status

# Incremental update (after code changes)
code-review-graph update

# Full rebuild (after major refactoring or branch switch)
code-review-graph build
```

### Graph Query Workflow

1. **Start with the graph** for code navigation — it knows all functions, classes, imports, and call relationships
2. **Fall back to grep/glob** only when the graph doesn't cover what you need (e.g., string literals, comments, config files)
3. **After editing code**, run `code-review-graph update` to keep the graph current
4. **Before code review**, use `get_impact_radius` to understand what else is affected by your changes
