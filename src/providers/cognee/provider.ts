import {
    rememberContext,
    rememberChunks,
    recallContext,
    isCogneeConfigured,
    buildMemoryChunk,

} from "./client";

import { MemoryObject } from "../../sdk/memory/memory";
import { MemoryChunk, MemoryProvider } from "../memoryProvider";

export class CogneeProvider implements MemoryProvider {
    readonly name = "cognee";

    isConfigured(): boolean {
        return isCogneeConfigured();
    }

    async upload(
        projectName: string,
        memories: MemoryObject[],
        onProgress?: (
            done: number,
            total: number,
            label: string
        ) => void,
        debugDir?: string
    ) {
        return rememberContext(
            projectName,
            memories,
            onProgress,
            debugDir
        );
    }

    chunk(memory: MemoryObject): MemoryChunk {
        return buildMemoryChunk(memory);
    }

    async uploadChunks(
        projectName: string,
        chunks: MemoryChunk[],
        onProgress?: (done: number, total: number, label: string) => void
    ) {
        return rememberChunks(`cliper-${projectName}`, chunks, onProgress);
    }

    async search(projectName: string, query: string): Promise<string> {
        const results = await recallContext(projectName, query);
        return results
            .flatMap((r) => r.search_result ?? [])
            .join("\n\n")
            .trim();
    }
}
