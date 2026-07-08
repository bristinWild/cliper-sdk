---
title: "Add LanceDB memory provider"
labels: provider, help wanted, good first issue
---

## Goal

Add a `lancedb` memory provider so Cliper can store and query repository memory graphs in **LanceDB**.

**Why LanceDB:** Embedded, serverless vector store - enables a fully local, zero-infra Cliper setup (pairs with the Local Provider for offline mode).

## How providers work

Every provider is a self-contained module implementing the interface in `src/providers/memoryProvider.ts`. The **Cognee provider (`src/providers/cognee/`) is the reference implementation - copy it** and adapt. Full walkthrough in [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-memory-provider).

Cliper hands the provider `MemoryObject[]` - 13 typed memories (file, commit, pull-request, architecture, gap, ...) each carrying `title`, `content`, `metadata`, `tags`, and explicit `relationships`.

## Checklist

- [ ] `src/providers/lancedb/provider.ts` implementing the `MemoryProvider` interface
- [ ] `src/providers/lancedb/client.ts` - connection/API layer (@lancedb/lancedb)
- [ ] `isConfigured()` reads credentials from `~/.cliper/config.json`
- [ ] `cliper auth lancedb` prompt flow (see `src/config/wizard.ts` for the pattern)
- [ ] Per-repository namespacing (Cognee uses a `cliper-<project>` dataset - use the equivalent)
- [ ] `upload()` (full) and `uploadChunks()` (incremental sync deltas) both working
- [ ] `search(projectName, query)` returns a natural-language answer scoped to that repo
- [ ] Short section in the README's provider list

## Acceptance

1. `cliper init` on a small repo stores all memories in LanceDB
2. A relationship question ("how does the auth command relate to init?") returns a grounded answer
3. `cliper sync` twice in a row - second run is a no-op (no uploads)
4. `npm run build` clean, no credentials committed (push protection will enforce this)

## Resources

- LanceDB docs: https://lancedb.github.io/lancedb/
- Reference implementation: [`src/providers/cognee/`](../tree/main/src/providers/cognee)

Comment below to claim this issue - happy to answer questions as you go.
