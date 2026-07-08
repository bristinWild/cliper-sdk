# Cliper Roadmap

> Transform any repository into a persistent AI memory graph and make it accessible to developers and AI agents from anywhere.

---

# Current Status

**Version:** v0.1.3

Current Focus:

- 🚀 Post-hackathon: multi-provider support & agent task execution
- 🤝 [Contributions welcome](./CONTRIBUTING.md) - provider issues are labeled `good first issue`

---

# ✅ Completed Development

## Repository Intelligence

### Repository Analysis

- [x] Repository Scanner
- [x] File Tree Generation
- [x] Source Code Extraction
- [x] Git Repository Detection
- [x] Dependency Analysis
- [x] External Package Detection
- [x] Gap Detection
- [x] Context Generation

---

## Structured Memory Engine

### Repository Memory (13 typed memories)

- [x] Repository Memory
- [x] Git Memory
- [x] File Summary Memory
- [x] Dependency Memory
- [x] Architecture Memory
- [x] Responsibility Memory
- [x] External Package Memory
- [x] Commit Memory
- [x] Release Memory
- [x] Timeline Memory
- [x] Gap Memory
- [x] Issue Memory
- [x] Pull Request Memory

---

## GitHub Intelligence

### Authentication

- [x] GitHub Personal Access Token Authentication
- [x] Backend user registration (`cliper auth` → Cliper cloud)

### Issues

- [x] Issue Memory
- [x] Issue → Repository Relationships

### Pull Requests

- [x] Pull Request Memory
- [x] Pull Request → Commit Relationships
- [x] Pull Request → File Relationships
- [x] Pull Request → Repository Relationships

---

## Knowledge Graph

### Relationships

- [x] Repository → Commit
- [x] Repository → Release
- [x] Repository → Timeline
- [x] Repository → Issue
- [x] Repository → Pull Request
- [x] File → Dependency
- [x] File → Responsibility
- [x] Module → Architecture
- [x] Commit → Changed Files
- [x] Pull Request → Commit
- [x] Pull Request → File
- [x] Gap → File

---

## Cognee Integration

- [x] Cognee Cloud Provider
- [x] Structured Memory Upload
- [x] Chunked Memory Synchronization
- [x] Repository Knowledge Graph Generation
- [x] GRAPH_COMPLETION search (powers app chat)
- [x] Per-user Cognee credentials (encrypted, multi-tenant)

---

## Incremental Sync

- [x] `cliper sync`
- [x] Manifest Generation (content-hashed, `.cliper/manifest.json`)
- [x] Changed Memory Detection
- [x] Upload Only Modified Memories
- [x] Manifest-based Synchronization
- [x] Watch mode (`cliper sync --watch` - auto-sync on new commits)
- [ ] Delete Removed Memories (stale memories reported; remote pruning pending)

---

## Agent Bridge

- [x] `cliper agent connect`
- [x] Register Agent (detects Claude Code, Codex, Cursor Agent)
- [x] Authenticate Agent (GitHub token over WebSocket)
- [x] Heartbeat + auto-reconnect
- [x] Agent Status (live 🟢 presence in the app)
- [ ] Local Repository Mapping (agent ↔ specific repo paths)

---

## Companion Apps

### Mobile App (React Native)

- [x] Sign in with GitHub (backend-driven OAuth → JWT, SecureStore sessions)
- [x] List all initialized repositories
- [x] Repository Status + Repository Selection
- [x] Repository Chat (Cognee GRAPH_COMPLETION)
- [x] Markdown Rendering + Code Block Rendering
- [x] Detect Connected Agent (live presence dot)
- [ ] Streaming Responses
- [ ] Send Task to Agent / View Task Status / View Agent Logs

### Web App

- [x] Browser version of the app (sign in, repository list, chat) served from the landing site

### Backend

- [x] Express + Supabase (users, repositories)
- [x] GitHub OAuth + Cliper JWT sessions
- [x] Repository registration (`POST /repositories/register` from `cliper init`)
- [x] Chat proxy with per-user Cognee credentials (AES-256-GCM encrypted at rest)
- [x] WebSocket agent presence (`/ws`)

---

# 📅 Roadmap

## Phase 1 - Sync Engine Hardening

- [ ] Delete Removed Memories (Cognee-side pruning)
- [ ] Git Diff Detection (scan only changed paths)
- [ ] Background Synchronization
- [ ] Conflict Resolution

---

## Phase 2 - Multi Provider Support

> 🤝 **Each provider is a scoped, self-contained contribution** - see the
> [`provider` issues](https://github.com/bristinWild/cliper-sdk/labels/provider)
> and [CONTRIBUTING.md](./CONTRIBUTING.md#adding-a-memory-provider).
> `src/providers/cognee/` is the reference implementation to copy.

Current

- [x] Cognee

Planned

- [ ] Neo4j
- [ ] Memgraph
- [ ] PostgreSQL + pgvector
- [ ] Graphiti
- [ ] LanceDB
- [ ] Supermemory
- [ ] Local JSON Provider

---

## Phase 3 - Agent Task Execution

- [ ] Send Task from app → backend task queue
- [ ] Daemon spawns headless agent (Claude Code `-p --output-format stream-json`)
- [ ] Memory-briefed prompts (Cognee recall injected before execution)
- [ ] Streamed edit/test/commit events → live app timeline
- [ ] PR-based flow with approval from the phone

Supported Agents

- [x] Claude Code (detection)
- [x] Codex (detection)
- [x] Cursor Agent (detection)
- [ ] Execution pipeline for the above
- [ ] Aider · Goose · Custom Agents

---

## Phase 4 - Semantic Search

- [ ] Hybrid Search
- [ ] Similar Code Search
- [ ] Commit Search / Issue Search / Architectural Search

---

## Phase 5 - Developer SDK

```ts
const cliper = new Cliper();

await cliper.sync();
await cliper.chat("Explain authentication.");
await cliper.search("Redis usage");
await cliper.timeline();
await cliper.graph();
```

---

## Phase 6 - Team Collaboration

- [ ] Shared Repository Memories
- [ ] Organization Workspaces
- [ ] Cross Repository Search
- [ ] Team Knowledge Graph
- [ ] Team Agent Pool

---

# Long-Term Vision

Today's workflow

```text
Repository
      │
      ▼
LLM
```

Every conversation starts from scratch.

---

Cliper

```text
Repository
      │
      ▼
cliper init  ──▶  cliper sync (incremental, forever)
      │
      ▼
Repository Memory
      │
      ▼
Memory Provider (Cognee today - pluggable tomorrow)
      │
      ├───────────────┬───────────────┐
      ▼               ▼               ▼
 Mobile App        Web App        AI Agents
      │               │               │
      └───────────────┴───────┬───────┘
                              ▼
              Persistent Engineering Knowledge
```

---

# Ultimate Goal

Git stores source code.

Cliper stores engineering knowledge.

Instead of repeatedly sending repositories to AI models, developers initialize a repository once, synchronize only incremental changes, and enable AI applications and coding agents to understand, search, and evolve software through a persistent knowledge graph.
