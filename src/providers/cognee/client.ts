import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { MemoryObject } from "../../sdk/memory/memory";
import { loadConfig } from "../../config/config";
import { MemoryChunk } from "../memoryProvider";




const COGNEE_BASE_URL = process.env.COGNEE_BASE_URL ?? "";
const COGNEE_API_KEY = process.env.COGNEE_API_KEY ?? "";


function creds(): { baseUrl: string; apiKey: string } {
    const cfg = loadConfig();
    return {
        baseUrl: process.env.COGNEE_BASE_URL ?? cfg.cognee?.baseUrl ?? "",
        apiKey: process.env.COGNEE_API_KEY ?? cfg.cognee?.apiKey ?? "",
    };
}

interface CogneeConfig {

    baseUrl: string;

    apiKey: string;

}

export function isCogneeConfigured(): boolean {
    const { baseUrl, apiKey } = creds();
    return Boolean(baseUrl && apiKey);
}

function assertConfigured() {
    if (!isCogneeConfigured()) {
        throw new Error(
            "Cognee not configured. Set COGNEE_BASE_URL and COGNEE_API_KEY environment variables."
        );
    }
}


async function uploadChunk(datasetName: string, label: string, content: string): Promise<void> {
    const tmpPath = path.join(os.tmpdir(), `cliper-${label.replace(/[\/:]/g, "_")}-${Date.now()}.md`);
    fs.writeFileSync(tmpPath, content, "utf-8");

    try {
        const fileBuffer = fs.readFileSync(tmpPath);
        const form = new FormData();
        const safeLabel = label.replace(/[\/:]/g, "_");

        form.append(
            "data",
            new Blob([fileBuffer], { type: "text/markdown" }),
            `${safeLabel}.md`
        );
        form.append("datasetName", datasetName);

        const res = await fetch(`${COGNEE_BASE_URL}/api/v1/add`, {
            method: "POST",
            headers: { "X-Api-Key": COGNEE_API_KEY },
            body: form,
        });

        const body = await res.text();

        if (!res.ok) {
            throw new Error(`/add failed (${label}): ${body}`);
        }


    } finally {
        fs.unlinkSync(tmpPath);
    }
}



/**
 * The exact self-describing chunk format uploaded to Cognee.
 * cliper sync hashes this same string — keep any format change in ONE place
 * or every memory will look "changed" on the next sync.
 */
export function buildMemoryChunk(memory: MemoryObject): MemoryChunk {
    return {
        label: `${memory.type}:${memory.id}`,
        content: `
Memory Type:
${memory.type}

Title:
${memory.title}

Content:
${memory.content}

Metadata:
${JSON.stringify(memory.metadata, null, 2)}

Relationships:
${memory.relationships?.join(", ") ?? "None"}

Tags:
${memory.tags?.join(", ") ?? "None"}
`.trim(),
    };
}

/**
 * Uploads a specific set of chunks (already diffed by the caller) and
 * triggers cognify once. Used by cliper sync for incremental updates.
 */
export async function rememberChunks(
    datasetName: string,
    chunks: MemoryChunk[],
    onProgress?: (done: number, total: number, label: string) => void
): Promise<void> {
    assertConfigured();
    if (chunks.length === 0) return;

    const BATCH_SIZE = 5;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        await Promise.all(
            batch.map((chunk, index) => {
                onProgress?.(i + index, chunks.length, chunk.label);
                return uploadChunk(datasetName, chunk.label, chunk.content);
            })
        );
    }

    const cognifyRes = await fetch(`${COGNEE_BASE_URL}/api/v1/cognify`, {
        method: "POST",
        headers: {
            "X-Api-Key": COGNEE_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ datasets: [datasetName] }),
    });

    if (!cognifyRes.ok) {
        const body = await cognifyRes.text();
        throw new Error(`Cognee /cognify failed: ${cognifyRes.status} ${body}`);
    }
}

/**
 * Uploads structured project data into a Cognee dataset as self-describing,
 * sentence-phrased chunks (see buildCogneeChunks), then triggers cognify
 * once on the whole dataset. Sending one large document caused Cognee's own
 * extraction step to fail with IncompleteOutputException (max_tokens) on a
 * real repo — chunking keeps each /add small enough for that step to
 * complete reliably.
 */
export async function rememberContext(
    projectName: string,
    memories: MemoryObject[],
    onProgress?: (
        done: number,
        total: number,
        label: string
    ) => void,
    debugDir?: string
): Promise<void> {
    assertConfigured();

    const datasetName = `cliper-${projectName}`;
    const chunks = memories.map(buildMemoryChunk);

    if (process.env.COGNEE_DEBUG) {
        console.log("\nCognee Chunks:");
        chunks.forEach((c) => {
            console.log(
                `${c.label.padEnd(35)} ${c.content.length
                    .toString()
                    .padStart(6)} chars`
            );
        });
        console.log("");
    }
    // Optional: write the exact chunks Cognee receives to disk for inspection.
    // Useful because the uploaded content never otherwise touches disk —
    // it's built in memory and sent straight to /add.
    if (debugDir) {
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
        for (const c of chunks) {
            const safeLabel = c.label.replace(/[\/:]/g, "_");
            fs.writeFileSync(path.join(debugDir, `${safeLabel}.md`), c.content, "utf-8");
        }
    }

    // for (let i = 0; i < chunks.length; i++) {
    //     onProgress?.(i, chunks.length, chunks[i].label);
    //     await uploadChunk(datasetName, chunks[i].label, chunks[i].content);
    // }


    const BATCH_SIZE = 5;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        await Promise.all(
            batch.map((chunk, index) => {
                onProgress?.(
                    i + index,
                    chunks.length,
                    chunk.label
                );

                return uploadChunk(
                    datasetName,
                    chunk.label,
                    chunk.content
                );
            })
        );
    }

    const cognifyRes = await fetch(`${COGNEE_BASE_URL}/api/v1/cognify`, {
        method: "POST",
        headers: {
            "X-Api-Key": COGNEE_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ datasets: [datasetName] }),
    });

    const cognifyBody = await cognifyRes.text();

    if (process.env.COGNEE_DEBUG) {
        console.log("Dataset:", datasetName);
        console.log("Cognify status:", cognifyRes.status);
        console.log(cognifyBody);
    }

    if (!cognifyRes.ok) {
        throw new Error(
            `Cognee /cognify failed: ${cognifyRes.status} ${cognifyBody}`
        );
    }
}

export interface CogneeSearchResult {
    dataset_id: string;
    dataset_name: string;
    search_result: string[];
}

/**
 * Queries Cognee memory for a project's dataset.
 * search_type defaults to GRAPH_COMPLETION (verified working).
 */
export async function recallContext(
    projectName: string,
    query: string
): Promise<CogneeSearchResult[]> {
    assertConfigured();

    const datasetName = `cliper-${projectName}`;


    const res = await fetch(`${COGNEE_BASE_URL}/api/v1/search`, {
        method: "POST",
        headers: {
            "X-Api-Key": COGNEE_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query,
            search_type: "GRAPH_COMPLETION",
            datasets: [datasetName],
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Cognee /search failed: ${res.status} ${errText}`);
    }

    return res.json() as Promise<CogneeSearchResult[]>;
}

export class CogneeClient {

    constructor(
        private readonly config: CogneeConfig
    ) { }

    private uploadChunk() { }

}
