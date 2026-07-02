# Cliper Memory Roadmap

> Transform any repository into a persistent AI memory graph.

---

# Current Status

**Version:** v0.1.0

## Core Repository Intelligence

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

## Memory Relationships

- [x] File → Dependency
- [x] File → Responsibility
- [x] Module → Architecture
- [x] Commit → Changed Files
- [x] Package → Repository
- [x] Release → Commit
- [ ] Issue → File
- [ ] Pull Request → Commit
- [ ] Discussion → File
- [x] Timeline → Repository

---

# Phase 1 - Repository Knowledge Graph

Goal:

Generate a complete semantic representation of a repository.

Status:

**Done**

---

# Phase 2 - GitHub Intelligence

Goal:

Extend repository memories with GitHub metadata and connect repository history into a unified knowledge graph.

Status:

**In Progress (~30%)**

---

## GitHub Integration

### Issues

- [ ] GitHub Authentication
- [x] Issue Memory
- [ ] Issue Labels
- [ ] Issue Assignees
- [ ] Issue Milestones
- [ ] Issue → File Relationships
- [x] Issue → Pull Request Relationships

---

### Pull Requests

- [x] Pull Request Memory
- [x] Pull Request → Commit Relationships 
- [x] Pull Request → Repository Relationships
- [x] Pull Request → File Relationships
- [ ] Review Memory
- [ ] Reviewer Relationships
- [ ] Merge History

---

### Discussions

- [ ] Discussion Memory
- [ ] Q&A Memory
- [ ] Design Decisions
- [ ] RFC Memory

---

### Releases

- [ ] GitHub Releases
- [ ] Release Notes
- [ ] Changelog Memory

---

### Memory Relationships

- [x] Commit → Changed Files
- [x] Pull Request → Commit
- [x] Pull Request → File

---

## Knowledge Graph

### Repository Relationships

- [x] Repository → Commit
- [x] Repository → Release
- [x] Repository → Timeline
- [x] Repository → Issue
- [x] Repository → Pull Request

### Graph Enrichment

- [ ] Branch Memory
- [ ] Contributor Memory
- [ ] Review Graph
- [ ] Development Timeline Expansion
---

# Phase 3 - Incremental Sync

Goal:

Avoid rebuilding repository memories from scratch.

### Planned

- [ ] Git Diff Detection
- [ ] Incremental Memory Updates
- [ ] Deleted Memory Cleanup
- [ ] Changed File Detection
- [ ] Background Synchronization

---

# Phase 4 - Multi Provider Support

Current

- [x] Cognee

Planned

- [ ] Neo4j
- [ ] Memgraph
- [ ] Graphiti
- [ ] LanceDB
- [ ] PostgreSQL + pgvector
- [ ] Local JSON Provider

---

# Phase 5 - Semantic Search

Goal:

Ask questions directly against repository memory.

### Planned

- [ ] Natural Language Search
- [ ] Graph Traversal Search
- [ ] Hybrid Search
- [ ] Similar Code Search
- [ ] Architectural Search
- [ ] Commit Search
- [ ] Issue Search

Example

```
Where is authentication implemented?

Which modules use Redis?

Show all TODOs related to payments.

What changed in the last release?

Which files import the wallet SDK?
```

---

# Phase 6 - Developer SDK

Goal:

Allow any application to consume repository memories.

### Planned

```ts
const memory = new CliperMemory(...);

await memory.sync();

await memory.search(
    "How is authentication implemented?"
);

await memory.graph();

await memory.timeline();

await memory.repository();
```

---

# Phase 7 - AI Companion

Goal:

Interact with repositories using natural language.

### Planned

- [ ] Web Dashboard
- [ ] Mobile App
- [ ] Desktop Client
- [ ] AI Chat
- [ ] Repository Explorer
- [ ] Graph Visualization
- [ ] Architecture Viewer
- [ ] Timeline Viewer

---

# Phase 8 - Team Collaboration

### Planned

- [ ] Shared Repository Memories
- [ ] Organization Workspaces
- [ ] Multi Repository Search
- [ ] Team Knowledge Graph
- [ ] Cross Repository Relationships

---

# Phase 9 - AI Agents

Goal:

Allow autonomous agents to work directly from repository memories.

### Planned

- [ ] Coding Agent
- [ ] Refactoring Agent
- [ ] Documentation Agent
- [ ] Architecture Review Agent
- [ ] Security Review Agent
- [ ] Dependency Audit Agent
- [ ] PR Review Agent

---

# Long-Term Vision

Today's workflow:

```
Repository
      │
      ▼
LLM
```

Every conversation requires sending repository context again.

---

Cliper Memory:

```
Repository
      │
      ▼
Memory Builder
      │
      ▼
Cognee Cloud
      │
      ▼
Persistent Knowledge Graph
      │
      ├──────────────┐
      │              │
      ▼              ▼
 AI Chat        Mobile App
      │              │
      └──────┬───────┘
             ▼
      Natural Language
        Code Search
```

A developer runs:

```
cliper init
```

once.

The repository is transformed into structured memories and synchronized with the user's Cognee Cloud.

From that point onward, AI applications can understand, search, and interact with the repository through its persistent memory graph instead of repeatedly ingesting the entire codebase.

---

# Ultimate Goal

Build the memory layer for software engineering.

Git stores source code.

Cliper Memory stores software knowledge.