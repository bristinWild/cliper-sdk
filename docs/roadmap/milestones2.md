# Cliper Roadmap

> Transform any repository into a persistent AI memory graph and make it accessible to developers and AI agents from anywhere.

---

# Current Status

**Version:** v0.1.0

Current Focus:

- 🚧 Hackathon MVP

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

### Repository Memory

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

---

## GitHub Intelligence

### Authentication

- [x] GitHub Personal Access Token Authentication

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

---

## Cognee Integration

- [x] Cognee Cloud Provider
- [x] Structured Memory Upload
- [x] Chunked Memory Synchronization
- [x] Repository Knowledge Graph Generation

---

# 🚧 Hackathon MVP

Goal:

Create the first end-to-end developer experience where repositories become persistent AI memories that can be queried from a mobile application.

---

## CLI

### Repository Initialization

- [x] `cliper init`
- [ ] Manifest Generation
- [ ] Local Project Metadata

### Incremental Sync

- [ ] `cliper sync`
- [ ] Changed Memory Detection
- [ ] Upload Only Modified Memories
- [ ] Delete Removed Memories
- [ ] Manifest-based Synchronization

---

## Agent Bridge

Goal:

Allow AI coding agents to register themselves with Cliper.

### CLI

- [ ] `cliper agent connect`

### Agent Connection

- [ ] Register Agent
- [ ] Authenticate Agent
- [ ] Heartbeat
- [ ] Agent Status
- [ ] Local Repository Mapping

---

## Mobile App (React Native)

Goal:

Chat with repository memories from anywhere.

### Authentication

- [ ] Sign in with GitHub

### Repository

- [ ] List all initialized repositories
- [ ] Repository Status
- [ ] Repository Selection

### AI Chat

- [ ] Repository Chat
- [ ] Ask Questions
- [ ] Streaming Responses
- [ ] Markdown Rendering
- [ ] Code Block Rendering

### Agent Actions

- [ ] Detect Connected Agent
- [ ] Send Task to Agent
- [ ] View Task Status
- [ ] View Agent Logs

---

## Demo Flow

```text
Developer

↓

cliper init

↓

Repository Memory

↓

Cognee Cloud

↓

cliper agent connect

↓

Local AI Agent Registered

↓

React Native App

↓

GitHub Login

↓

Select Repository

↓

Ask Repository Questions

↓

Run Agent Tasks

↓

Agent Modifies Repository

↓

cliper sync
```

---

# 📅 Post Hackathon Roadmap

## Phase 1 — Incremental Memory Engine

- [ ] Git Diff Detection
- [ ] Manifest-based Sync
- [ ] Deleted Memory Cleanup
- [ ] Background Synchronization
- [ ] Conflict Resolution

---

## Phase 2 — Multi Provider Support

Current

- [x] Cognee

Planned

- [ ] Neo4j
- [ ] Memgraph
- [ ] PostgreSQL + pgvector
- [ ] Graphiti
- [ ] LanceDB
- [ ] Local Provider

---

## Phase 3 — Semantic Search

- [ ] Hybrid Search
- [ ] Graph Traversal
- [ ] Similar Code Search
- [ ] Commit Search
- [ ] Issue Search
- [ ] Architectural Search

Example

```text
How is authentication implemented?

Show payment architecture.

Which modules use Redis?

What changed in the latest release?

Which files import Solana SDK?
```

---

## Phase 4 — Agent Ecosystem

Supported Agents

- [ ] Claude Code
- [ ] Codex
- [ ] Hermes
- [ ] Aider
- [ ] Goose
- [ ] Custom Agents

Agent Capabilities

- [ ] Code Generation
- [ ] Refactoring
- [ ] Documentation
- [ ] Bug Fixes
- [ ] PR Creation
- [ ] Architecture Review
- [ ] Security Review

---

## Phase 5 — Developer SDK

```ts
const cliper = new Cliper();

await cliper.sync();

await cliper.chat(
  "Explain authentication."
);

await cliper.search(
  "Redis usage"
);

await cliper.timeline();

await cliper.graph();
```

---

## Phase 6 — Team Collaboration

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
cliper init
      │
      ▼
Repository Memory
      │
      ▼
Cognee Cloud
      │
      ├───────────────┐
      │               │
      ▼               ▼
 Mobile App     AI Agents
      │               │
      └───────┬───────┘
              ▼
 Persistent Engineering Knowledge
```

---

# Ultimate Goal

Git stores source code.

Cliper stores engineering knowledge.

Instead of repeatedly sending repositories to AI models, developers initialize a repository once, synchronize only incremental changes, and enable AI applications and coding agents to understand, search, and evolve software through a persistent knowledge graph.