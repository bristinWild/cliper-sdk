import * as fs from "fs";
import * as path from "path";
import { MemoryObject } from "../../sdk/memory/memory";
import { loadConfig } from "../../config/config";
import { MemoryChunk } from "../memoryProvider";
import { getCliperDir } from "../../scope/config";
import { MemoryType } from "../../sdk/memory/memory";
import { SearchResult } from "../../sdk/searchResult";

import { DEFAULT_RETRIEVAL_ORDER, TIMELINE_RETRIEVAL_ORDER, SECURITY_RETRIEVAL_ORDER } from "../../sdk/retrieval";

function safeLabel(label: string): string {
    return label.replace(/[\/:]/g, "_");
}

export function isLocalJsonConfigured(): boolean {
    const cfg = loadConfig();
    return Boolean(cfg.localJson?.enabled);
}


export function listMemoriesByType(
    projectRoot: string,
    projectName: string,
    type: string,
): MemoryObject[] {
    const dir = datasetDir(projectRoot, `cliper-${projectName}`);
    return readAllMemories(dir).filter((m) => m.type === type) as MemoryObject[];
}


export const DEFAULT_MAX_RESULTS = 8;

function formatMemories(memories: MemoryObject[]): string {
    const seen = new Set<string>();
    const sections: string[] = [];

    for (const memory of memories) {
        if (seen.has(memory.id)) continue;
        seen.add(memory.id);

        sections.push(
            `[${memory.type}] ${memory.title}\n${memory.content}`,
        );
    }

    return sections.join("\n\n---\n\n");
}

export function formatSearchResult(result: SearchResult): string {
    const sections: string[] = [];

    if (result.architecture.length) {
        sections.push(
            "## Architecture\n\n" +
            formatMemories(result.architecture),
        );
    }

    if (result.files.length) {
        sections.push(
            "## Files\n\n" +
            formatMemories(result.files),
        );
    }

    if (result.dependencies.length) {
        sections.push(
            "## Dependencies\n\n" +
            formatMemories(result.dependencies),
        );
    }

    if (result.repository.length) {
        sections.push(
            "## Repository\n\n" +
            formatMemories(result.repository),
        );
    }

    if (result.commits.length) {
        sections.push(
            "## Commits\n\n" +
            formatMemories(result.commits),
        );
    }

    if (result.gaps.length) {
        sections.push(
            "## Gaps\n\n" +
            formatMemories(result.gaps),
        );
    }

    return sections.join("\n\n");
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

function readAllMemories(dir: string): MemoryObject[] {
    if (!fs.existsSync(dir)) return [];
    const entries: MemoryObject[] = [];
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

function score(
    tokens: string[],
    memory: MemoryObject,
): number {
    let total = 0;

    // Strong boost for memory type matching
    const type = memory.type.toLowerCase();

    for (const token of tokens) {
        if (type.includes(token)) {
            total += 5;
        }
    }

    const haystacks = [
        { text: memory.title ?? "", weight: 4 },
        { text: (memory.tags ?? []).join(" "), weight: 3 },
        { text: (memory.relationships ?? []).join(" "), weight: 2 },
        { text: memory.content ?? "", weight: 1 },
    ];

    for (const { text, weight } of haystacks) {
        const lower = String(text).toLowerCase();

        for (const token of tokens) {
            if (lower.includes(token)) {
                total += weight;
            }
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
    query: string,
    retrievalOrder: MemoryType[] = DEFAULT_RETRIEVAL_ORDER,
): Promise<SearchResult> {
    const dataset = `cliper-${projectName}`;
    const dir = datasetDir(projectRoot, dataset);
    const memories = readAllMemories(dir);


    if (memories.length === 0) {
        return {
            query,
            architecture: [],
            files: [],
            dependencies: [],
            packages: [],
            repository: [],
            commits: [],
            gaps: [],
        };
    }
    const tokens = tokenize(query);


    const ranked: Array<{ memory: MemoryObject; score: number }> = memories
        .map((memory) => ({
            memory,
            score: score(tokens, memory),
        }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
        return {
            query,
            architecture: [],
            files: [],
            dependencies: [],
            packages: [],
            repository: [],
            commits: [],
            gaps: [],
        };
    }

    // Pick the best memory for each preferred type.
    const bestByType = new Map<MemoryType, MemoryObject>();

    for (const { memory } of ranked) {
        if (!bestByType.has(memory.type)) {
            bestByType.set(memory.type, memory);
        }
    }

    const top: MemoryObject[] = [];

    for (const type of retrievalOrder) {
        const memory = bestByType.get(type);
        if (memory) {
            top.push(memory);
        }
    }

    // Fill remaining slots with highest-ranked memories.

    const seenIds = new Set(top.map((m) => m.id));

    for (const { memory } of ranked) {
        if (top.length >= DEFAULT_MAX_RESULTS) break;

        if (!seenIds.has(memory.id)) {
            seenIds.add(memory.id);
            top.push(memory);
        }
    }

    // Expand one hop through explicit relationships.
    const byId = new Map<string, MemoryObject>(
        memories.map((m) => [m.id, m]),
    );

    const related: MemoryObject[] = [];

    for (const memory of top) {
        for (const id of memory.relationships ?? []) {
            const match = byId.get(id);

            if (match && !seenIds.has(match.id)) {
                seenIds.add(match.id);
                related.push(match);
            }
        }
    }

    const all = [...top, ...related];

    const result: SearchResult = {
        query,

        architecture: [],
        files: [],
        dependencies: [],
        packages: [],
        repository: [],
        commits: [],
        gaps: [],
    };

    for (const memory of all) {
        switch (memory.type) {
            case "architecture":
                result.architecture.push(memory);
                break;

            case "file":
                result.files.push(memory);
                break;

            case "dependency":
                result.dependencies.push(memory);
                break;

            case "package":
                result.packages.push(memory);
                break;

            case "repository":
                result.repository.push(memory);
                break;

            case "commit":
                result.commits.push(memory);
                break;

            case "gap":
                result.gaps.push(memory);
                break;
        }
    }

    return result;
}


