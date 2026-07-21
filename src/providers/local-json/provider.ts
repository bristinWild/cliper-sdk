import {
    isLocalJsonConfigured,
    rememberContext,
    rememberChunks,
    recallContext,
    buildMemoryChunk,
    formatSearchResult,
} from "./client";
import { SearchResult } from "../../sdk/searchResult";

import {
    MemoryObject,
    MemoryType,
} from "../../sdk/memory/memory";
import { MemoryChunk, MemoryProvider, UploadProgress } from "../memoryProvider";

/**
 * Zero-dependency offline provider: memories are persisted as plain JSON
 * files under .cliper/memory/<dataset>/ in the target repo. No account,
 * no network access, nothing to configure beyond `cliper auth local-json`.
 * Intended for tests, air-gapped environments, and as the "just works, no
 * cloud required" default path.
 */
export class LocalJsonProvider implements MemoryProvider {
    readonly name = "local-json";

    isConfigured(): boolean {
        return isLocalJsonConfigured();
    }

    chunk(memory: MemoryObject): MemoryChunk {
        return buildMemoryChunk(memory);
    }

    async upload(
        projectName: string,
        memories: MemoryObject[],
        onProgress?: UploadProgress,
        _debugDir?: string,
        projectRoot: string = process.cwd()
    ): Promise<void> {
        // No debugDir handling needed: every uploaded memory already lives
        // on disk as a readable JSON file — that IS the debug output.
        return rememberContext(projectRoot, projectName, memories, onProgress);
    }

    async uploadChunks(
        projectName: string,
        chunks: MemoryChunk[],
        onProgress?: UploadProgress,
        projectRoot: string = process.cwd()
    ): Promise<void> {
        return rememberChunks(projectRoot, projectName, chunks, onProgress);
    }

    async searchStructured(
        projectName: string,
        query: string,
        projectRoot = process.cwd(),
        retrievalOrder?: MemoryType[],
    ): Promise<SearchResult> {
        return recallContext(
            projectRoot,
            projectName,
            query,
            retrievalOrder,
        );
    }

    async search(
        projectName: string,
        query: string,
        projectRoot = process.cwd(),
        retrievalOrder?: MemoryType[],
    ): Promise<string> {
        const result = await recallContext(
            projectRoot,
            projectName,
            query,
            retrievalOrder,
        );

        return formatSearchResult(result);
    }
}