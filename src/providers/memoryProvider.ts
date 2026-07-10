import { MemoryObject } from "../sdk/memory/memory";

/** A self-describing unit of memory as stored by a provider. */
export interface MemoryChunk {
    label: string;   // "<type>:<id>" — stable across syncs
    content: string; // exact text persisted — cliper sync hashes this
}

export type UploadProgress = (done: number, total: number, label: string) => void;

/**
 * Contract every memory backend implements.
 * Reference implementation: src/providers/cognee/
 */
export interface MemoryProvider {
    /** Short identifier, e.g. "cognee", "neo4j" — used in `cliper auth <name>`. */
    readonly name: string;

    /** Are credentials present (config.json or environment)? */
    isConfigured(): boolean;

    /** Deterministic chunk formatting — incremental sync hashes the result. */
    chunk(memory: MemoryObject): MemoryChunk;

    /** Full upload of a repository's memories (`cliper init`). */
    upload(
        projectName: string,
        memories: MemoryObject[],
        onProgress?: UploadProgress,
        debugDir?: string
    ): Promise<void>;

    /** Delta upload of pre-diffed chunks (`cliper sync`). */
    uploadChunks(
        projectName: string,
        chunks: MemoryChunk[],
        onProgress?: UploadProgress
    ): Promise<void>;

    /** Natural-language answer over this repository's stored memory. */
    search(projectName: string, query: string): Promise<string>;
}
