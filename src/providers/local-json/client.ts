import * as fs from "fs";
import * as path from "path";
import { MemoryObject } from "../../sdk/memory/memory";
import { loadConfig } from "../../config/config";
import { MemoryChunk } from "../memoryProvider";
import { getCliperDir } from "../../scope/config";

function safeLabel(label: string): string {
    return label.replace(/[\/:]/g, "_");
}

export function isLocalJsonConfigured(): boolean {
    const cfg = loadConfig();
    return Boolean(cfg.localJson?.enabled);
}

/**
 * Where this repo's memories live on disk: <root>/.cliper/memory/<dataset>/
 * by default, or a custom directory (relative to the repo root) if the user
 * set one during `cliper auth local-json`.
 */
export function datasetDir(projectRoot: string, datasetName: string): string {
    const cfg = loadConfig();
    const base = cfg.localJson?.dataDir
        ? path.resolve(projectRoot, cfg.localJson.dataDir)
        : path.join(getCliperDir(projectRoot), "memory");
    return path.join(base, datasetName);
}

/**
 * The exact self-describing chunk persisted to disk, one JSON file per
 * memory. cliper sync hashes this same string — keep any format change in
 * ONE place or every memory will look "changed" on the next sync.
 */
export function buildMemoryChunk(memory: MemoryObject): MemoryChunk {
    return {
        label: `${memory.type}:${memory.id}`,
        content: JSON.stringify(
            {
                type: memory.type,
                id: memory.id,
                title: memory.title,
                content: memory.content,
                tags: memory.tags ?? [],
                relationships: memory.relationships ?? [],
                metadata: memory.metadata ?? {},
            },
            null,
            2
        ),
    };
}

function writeChunk(dir: string, chunk: MemoryChunk): void {
    fs.writeFileSync(
        path.join(dir, `${safeLabel(chunk.label)}.json`),
        chunk.content,
        "utf-8"
    );
}

function readAllMemories(dir: string): Array<Record<string, any>> {
    if (!fs.existsSync(dir)) return [];
    const entries: Array<Record<string, any>> = [];
    for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith(".json")) continue;
        try {
            entries.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")));
        } catch {
            // skip a corrupt/partial file rather than fail the whole read
        }
    }
    return entries;
}

/**
 * Full upload (`cliper init`). Writes every memory as its own JSON file and
 * prunes any leftover file whose memory no longer exists — deletion is
 * trivial for a filesystem provider, so unlike Cognee (where remote pruning
 * is still on the roadmap) this can just do it.
 */
export async function rememberContext(
    projectRoot: string,
    projectName: string,
    memories: MemoryObject[],
    onProgress?: (done: number, total: number, label: string) => void
): Promise<void> {
    const dataset = `cliper-${projectName}`;
    const dir = datasetDir(projectRoot, dataset);
    fs.mkdirSync(dir, { recursive: true });

    const chunks = memories.map(buildMemoryChunk);
    const keep = new Set(chunks.map((c) => `${safeLabel(c.label)}.json`));

    for (const existing of fs.readdirSync(dir)) {
        if (existing.endsWith(".json") && !keep.has(existing)) {
            fs.unlinkSync(path.join(dir, existing));
        }
    }

    chunks.forEach((chunk, i) => {
        onProgress?.(i, chunks.length, chunk.label);
        writeChunk(dir, chunk);
    });
}

/**
 * Delta upload (`cliper sync`) — writes only the pre-diffed chunks the
 * caller hands in. No pruning here; a removed memory is cleaned up on the
 * next full `cliper init`, same contract the Cognee provider follows.
 */
export async function rememberChunks(
    projectRoot: string,
    projectName: string,
    chunks: MemoryChunk[],
    onProgress?: (done: number, total: number, label: string) => void
): Promise<void> {
    const dataset = `cliper-${projectName}`;
    const dir = datasetDir(projectRoot, dataset);
    fs.mkdirSync(dir, { recursive: true });

    chunks.forEach((chunk, i) => {
        onProgress?.(i, chunks.length, chunk.label);
        writeChunk(dir, chunk);
    });
}

const STOPWORDS = new Set([
    "the", "a", "an", "is", "are", "how", "does", "do", "to", "of", "in",
    "and", "or", "for", "on", "with", "this", "that", "it", "what", "which",
]);

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9_]+/)
        .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function score(tokens: string[], memory: Record<string, any>): number {
    const haystacks = [
        { text: memory.title ?? "", weight: 3 },
        { text: (memory.tags ?? []).join(" "), weight: 2 },
        { text: memory.content ?? "", weight: 1 },
    ];

    let total = 0;
    for (const { text, weight } of haystacks) {
        const lower = String(text).toLowerCase();
        for (const token of tokens) {
            if (lower.includes(token)) total += weight;
        }
    }
    return total;
}

/**
 * "Search" over locally stored memory: plain keyword scoring, no
 * embeddings and no LLM call — that's the point of a zero-dependency
 * provider. To still answer relationship questions ("how does X relate to
 * Y") it does one hop of graph expansion: after finding the best-scoring
 * memory, it also pulls in whatever that memory's own `relationships`
 * point to, so the connection is visible in the answer, not just the
 * single closest match.
 */
export async function recallContext(
    projectRoot: string,
    projectName: string,
    query: string
): Promise<string> {
    const dataset = `cliper-${projectName}`;
    const dir = datasetDir(projectRoot, dataset);
    const memories = readAllMemories(dir);

    if (memories.length === 0) {
        return "No local memory found for this repository. Run `cliper init` first.";
    }

    const tokens = tokenize(query);
    const ranked = memories
        .map((memory) => ({ memory, score: score(tokens, memory) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
        return "No stored memory matched that question closely enough to answer.";
    }

    const top = ranked.slice(0, 3).map((r) => r.memory);

    const byId = new Map(memories.map((m) => [m.id, m]));
    const related = ((top[0].relationships ?? []) as string[])
        .map((id) => byId.get(id))
        .filter((m): m is Record<string, any> => Boolean(m))
        .slice(0, 3);

    const seen = new Set<string>();
    const sections: string[] = [];
    for (const m of [...top, ...related]) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        sections.push(`[${m.type}] ${m.title}\n${m.content}`);
    }

    return sections.join("\n\n---\n\n");
}
