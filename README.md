# Cliper Memory

> Turn any codebase into a structured knowledge graph for AI agents.

Cliper Memory is a repository intelligence engine that converts source code, Git history, architecture, dependencies, and project metadata into structured memories that can be ingested by knowledge graph systems like Cognee.

Instead of storing a single flattened context document, Cliper Memory models a repository as interconnected memory objects, enabling AI systems to understand software at a much higher semantic level.

> Transform any repository into a persistent AI memory graph.

---

## Why?

Large language models struggle with large repositories because:

- Repository context exceeds token limits
- Important relationships are lost in flattened documents
- Git history is ignored
- Architecture is difficult to infer
- Dependencies become disconnected

Cliper Memory solves this by converting repositories into structured memories that preserve relationships between files, modules, commits, packages, architecture, and future project artifacts.

---

## Features

### Repository Intelligence

- Repository Memory
- Git Memory
- File Summary Memory
- Dependency Memory
- Architecture Memory
- Responsibility Memory
- External Package Memory
- Gap Detection Memory
- Commit Memory

### Coming Soon

- Release Memory
- GitHub Issue Memory
- Pull Request Memory
- GitHub Discussion Memory
- Timeline Memory
- Semantic Repository Search
- Multi-provider Memory Support

---

## Memory Types

Every repository is transformed into structured memory objects.

Example:

```
Repository
│
├── Git
│   ├── Commit
│   └── Release
│
├── Architecture
│   ├── Module
│   ├── Dependency
│   └── Responsibility
│
├── Files
│
├── Packages
│
├── Issues
│
├── Pull Requests
│
└── Discussions
```

Each memory contains:

- unique identifier
- memory type
- metadata
- semantic relationships
- searchable content

---

## Example Memory

```json
{
  "id": "dependency:src/index.ts->src/commands/init",
  "type": "dependency",
  "title": "src/index.ts imports src/commands/init",
  "relationships": [
    "src/index.ts",
    "src/commands/init"
  ]
}
```

---

## Supported Memory Providers

Current:

- Cognee

Planned:

- Neo4j
- Memgraph
- Graphiti
- LanceDB
- Local JSON Memory

---

## Installation

```bash
git clone https://github.com/<your-username>/cliper-memory.git

cd cliper-memory

npm install
```

---

## Configuration

Create a `.env` file.

```env
COGNEE_BASE_URL=http://localhost:8000
COGNEE_API_KEY=YOUR_API_KEY
```

---

## Usage

Initialize repository memory.

```bash
npm run build

node dist/index.js init
```

The repository will be analyzed and converted into structured memories before being synchronized with the configured memory provider.

---


## How It Works

Once Cliper Memory is configured, onboarding a repository is a single command.

```bash
cliper init
```

During initialization, Cliper Memory:

1. Scans the repository structure.
2. Extracts source code metadata.
3. Builds dependency and architecture relationships.
4. Analyzes Git history.
5. Detects repository gaps.
6. Converts everything into structured memory objects.
7. Uploads the memories to the configured Cognee dataset.

Once synchronized, the repository becomes a persistent knowledge graph stored in the user's Cognee cloud, allowing AI applications to query repository knowledge without repeatedly processing the entire codebase.

---

## Current Memory Pipeline

```
Repository
    │
    ▼
Repository Scanner
    │
    ▼
Memory Builder
    │
    ├── Git Memory
    ├── File Memory
    ├── Dependency Memory
    ├── Architecture Memory
    ├── Responsibility Memory
    ├── Package Memory
    ├── Gap Memory
    └── Commit Memory
    │
    ▼
Memory Provider
    │
    ▼
Cognee Knowledge Graph
```

---

## Roadmap

### Phase 1

- [x] Repository Memory
- [x] Git Memory
- [x] File Memory
- [x] Dependency Memory
- [x] Package Memory
- [x] Gap Memory
- [x] Responsibility Memory
- [x] Architecture Memory
- [x] Commit Memory

### Phase 2

- [ ] Release Memory
- [ ] GitHub Issue Memory
- [ ] Pull Request Memory
- [ ] GitHub Discussion Memory
- [ ] Timeline Memory

### Phase 3

- [ ] Semantic Search
- [ ] Repository Question Answering
- [ ] Multi-provider Support
- [ ] Incremental Memory Updates
- [ ] Live Repository Synchronization

---

## Vision

Cliper Memory is the foundation for persistent AI-native software repositories.

Instead of repeatedly providing repository context to AI assistants, your codebase becomes a continuously synchronized memory graph.

Our long-term vision is to build a companion application that connects directly to your repository memories stored in Cognee.

This will allow developers to:

- Chat with their codebase from desktop or mobile.
- Explore architecture interactively.
- Ask questions about implementation details.
- Understand dependencies between modules.
- Navigate Git history conversationally.
- Retrieve repository knowledge without cloning the project.

The goal is to make every software repository accessible through natural language while preserving architectural relationships and engineering context.

---

## License

MIT