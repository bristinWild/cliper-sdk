# Contributing to Cliper Memory

Thanks for your interest! Cliper turns repositories into persistent AI memory graphs, and the highest-impact way to contribute right now is **adding a new memory provider** - each one is a self-contained module with a working reference implementation to copy.

## Get running in 10 minutes

```bash
git clone https://github.com/bristinWild/cliper-sdk
cd cliper-sdk
npm install
npm run build
npm link              # `cliper` now runs your local build
```

Requirements: Node 18+ (native fetch is used throughout).

Configure credentials and test against a real repo:

```bash
cliper auth           # GitHub PAT + provider credentials → ~/.cliper/config.json
cd any-git-repo
cliper init           # full pipeline: scan → memories → provider upload
cliper sync           # incremental: content-hashed manifest, uploads only deltas
```

Rebuild after changes with `npm run build` - the linked `cliper` binary always runs the latest `dist/`.

## Architecture in 60 seconds

```
src/
  commands/       CLI entry points (init, sync, auth, agent, ...)
  scanner/        repo intelligence: file tree, content, git, deps, semantic labels
  gaps/           undocumented-pattern detection
  sdk/
    memory/       MemoryObject + the 13 MemoryTypes
    memoryBuilder MemoryBuilder - turns scan results into typed memories
    manifest.ts   content-hash manifest for incremental sync
  providers/
    memoryProvider.ts   ← the provider interface
    cognee/             ← the reference implementation (copy this)
  api/            Cliper backend client (registration, auth)
```

The flow: `init` scans → `MemoryBuilder.build()` produces `MemoryObject[]` (typed, titled, tagged, with `relationships`) → the **provider** turns each into a self-describing chunk and uploads it → the provider's search answers questions later.

## Adding a memory provider

This is the flagship contribution path. Each provider lives in `src/providers/<name>/` and mirrors the Cognee reference:

1. **Copy the template:** `cp -r src/providers/cognee src/providers/<name>` and rename the class.
2. **Implement the interface** (`src/providers/memoryProvider.ts`):
   - `isConfigured()` - are credentials present?
   - `upload(projectName, memories, onProgress?)` - full upload (used by init)
   - `uploadChunks(projectName, chunks, onProgress?)` - delta upload (used by sync)
   - `chunk(memory)` - chunk formatting; **reuse `buildMemoryChunk` if your provider stores text chunks** so incremental sync hashes stay consistent
   - `search(projectName, query)` - natural-language answer over the stored graph
3. **Wire configuration:** add your provider's credentials to `CliperConfig` (`src/config/config.ts`) and a prompt flow like `src/config/wizard.ts` so `cliper auth <name>` works.
4. **Namespace per repo:** store data per-project (Cognee uses a `cliper-<project>` dataset). Search must be scoped the same way.
5. **Verify end-to-end:** `cliper init` on a small repo → your backend shows the memories → a relationship question ("how does the auth command relate to init?") returns a graph-grounded answer → `cliper sync` twice, second run is a no-op.

Graph-native backends (Neo4j, Memgraph) can go further than text chunks: `MemoryObject.relationships` contains explicit edge labels - map them to real graph edges.

Open provider issues are labeled [`provider`](https://github.com/bristinWild/cliper-sdk/labels/provider) + [`help wanted`](https://github.com/bristinWild/cliper-sdk/labels/help%20wanted). Comment on one to claim it.

## Other welcome contributions

- **New memory types / relationships** - extend `MemoryType` + `MemoryBuilder` (e.g. Contributor Memory, Branch Memory, Review Graph)
- **Sync engine** - deleted-memory cleanup, git-diff-scoped scanning
- **Docs** - anything that confused you is a bug in the docs

## Fork workflow (required — direct push access is not granted)

1. **Fork** the repo on GitHub (top-right button)
2. Clone your fork: `git clone https://github.com/<you>/cliper-sdk`
3. Add upstream: `git remote add upstream https://github.com/bristinWild/cliper-sdk`
4. Branch: `git checkout -b feat/your-feature`
5. Push to **your fork**: `git push origin feat/your-feature`
6. Open a Pull Request: your fork → `bristinWild/cliper-sdk`

Never push directly to `bristinWild/cliper-sdk` — access is intentionally restricted.
To sync with latest main: `git fetch upstream && git merge upstream/main`

## Pull requests

- Branch from `main`, one provider/feature per PR
- `npm run build` must pass (strict TypeScript, no `any` unless unavoidable)
- **Never commit credentials.** `.env` and `~/.cliper` are gitignored; push protection is enabled and will block token-shaped strings
- Conventional commits appreciated: `feat(provider): add neo4j provider`
- `main` requires PRs (ruleset) — direct pushes are blocked

## Questions

Open a [Discussion](https://github.com/bristinWild/cliper-sdk/discussions) or comment on the issue you're working on. Fast responses are a priority here - expect a reply within a day.
