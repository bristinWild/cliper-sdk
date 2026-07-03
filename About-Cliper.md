# >_ Cliper

**Your codebase has amnesia. We gave it a memory.**

Every time you open a fresh AI chat and paste in code, you're onboarding a brilliant engineer with total amnesia. They're smart - but they've never seen your repo, don't know why `auth.ts` is weird, and have no idea you already tried that refactor in March. So you spend the first twenty minutes of every session re-explaining your own project. Every. Single. Time.

Cliper fixes that. One command turns your repository into a **persistent memory graph** that lives in the cloud - and then lets you **chat with your codebase from your phone** and **dispatch coding agents on your laptop** like a remote control.

Think of it like this:

> **Your laptop is the kitchen. Your phone is the waiter. Cliper is the recipe book the chef actually remembers.**
>
> The waiter takes orders anywhere (chat, tasks). The kitchen does the real cooking (agents, commits, tests - code never leaves your machine). And the chef never asks "wait, how do we make the sauce again?" - because the memory is already there.

---

## What it does

```
┌────────────┐     cliper init      ┌─────────────────┐
│  Your repo  │ ───────────────────▶ │  Memory graph    │
│  (laptop)   │   43 files, gaps,    │  (Cognee cloud)  │
└─────┬──────┘   commits, PRs...    └────────┬────────┘
      │                                       │
      │  cliper agent connect                 │  GRAPH_COMPLETION
      │  (websocket, live 🟢)                 │  search
      ▼                                       ▼
┌────────────┐                       ┌─────────────────┐
│  Cliper     │ ◀──── tasks ──────── │  Cliper mobile   │
│  daemon     │ ───── events ──────▶ │  app (Ask/Agent) │
└────────────┘                       └─────────────────┘
```

- **`cliper init`** - scans your repo like a very caffeinated new hire: detects the active scope from git activity, builds an annotated file tree, extracts contents, reads commits/PRs/issues, maps dependencies, finds undocumented gaps (it found **94** in this repo, rude), and uploads it all to a Cognee knowledge graph.
- **`cliper auth`** - one-time setup: GitHub + Cognee credentials, and registers you with the Cliper backend.
- **`cliper agent connect`** - opens a live WebSocket to the cloud and announces "this laptop has Claude Code installed and is ready to work." Your phone instantly shows the repo as 🟢 Agent Online.
- **Cliper mobile app** - browse your repos, then flip the switch:
  - **Ask** → questions answered from the memory graph ("How does init work, step by step?")
  - **Agent** → dispatch coding tasks to the laptop (the laptop does the editing, testing, committing - your code never leaves your machine)

## Quick start

```bash
# 1. Install
npm install && npm run build && npm link

# 2. Authenticate (GitHub PAT + Cognee credentials)
cliper auth

# 3. Give your repo a memory
cd your-project
cliper init

# 4. Put your laptop on the grid
cliper agent connect

# 5. Open the Cliper app on your phone. Chat with your repo. Feel like a wizard.
```

## Commands

| Command | What it actually does |
| --- | --- |
| `cliper init` | Full scan → context doc → Cognee memory → registers repo with the backend |
| `cliper auth [github\|cognee]` | Saves credentials to `~/.cliper/config.json`, creates your cloud user |
| `cliper agent connect` | Live agent presence over WebSocket, detects installed agents (Claude Code, Codex, Cursor) |
| `cliper sync` | Refreshes stale sections of the context |
| `cliper status` | What's fresh, what's stale, what's in scope |
| `cliper export` | Prints the context doc - `cliper export \| pbcopy` and paste anywhere |
| `cliper analyze --model claude` | Turns the context into an optimized prompt |
| `cliper scope add/remove/list` | Manually steer what gets remembered |

## How the memory is built

The scanner doesn't just dump files. Each memory is a **self-describing chunk** - typed (file / commit / PR / architecture / gap), titled, tagged, and linked to its relationships - uploaded in batches and then *cognified* into a graph. That's why "how does the auth command relate to init?" gets a real answer instead of keyword soup: the graph actually knows they're connected.

Detected along the way:
- 🧠 **Semantic labels** - what each file *is for*, not just what it's named
- 🕳️ **Gaps** - undocumented patterns and risky corners, ranked by severity
- 🕸️ **Dependency map** - who imports whom (70 edges in this repo)
- 📜 **Git context** - recent commits, open PRs, imported issues

## The stack

**CLI/SDK** (this repo): TypeScript, Commander, simple-git, ws · **Memory:** Cognee cloud (knowledge graph + GRAPH_COMPLETION search) · **Backend:** Express + Supabase (GitHub OAuth → JWT, repo registry, chat proxy, WebSocket presence) · **Mobile:** React Native (Expo), dark, minimal, built for developers

## Hackathon honesty section 🏗️

Built during the hackathon and **actually working end-to-end**: repo scanning → memory graph → mobile chat with real GRAPH_COMPLETION answers → live agent presence from laptop to phone.

The task-execution pipeline (phone dispatches → daemon spawns `claude -p` headless → streams edit/test/commit events back to the phone timeline) is architected and stubbed - the daemon already receives and acknowledges tasks over the socket. That's the next 48 hours, not the next 6 months.

## Product philosophy

**The phone never edits code.** The laptop is always responsible for running agents, modifying files, running tests, and creating commits. The mobile app is a repository browser, an AI chat interface, a remote task launcher, and a live activity monitor. Your code stays home; only its *memory* travels.

---

*Cliper - because your codebase deserves a hippocampus.*