import {
    isLocalJsonConfigured,
    rememberContext,
    rememberChunks,
    recallContext,
    buildMemoryChunk,
} from "./client";

import { MemoryObject } from "../../sdk/memory/memory";
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

    async search(
        projectName: string,
        query: string,
        projectRoot: string = process.cwd()
    ): Promise<string> {
        return recallContext(projectRoot, projectName, query);
    }
}
