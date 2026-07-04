import {
    rememberContext,
    rememberChunks,
    recallContext,
    isCogneeConfigured,
    buildMemoryChunk,
    MemoryChunk,
} from "./client";

import { MemoryObject } from "../../sdk/memory/memory";

export class CogneeProvider {

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

    async search(
        projectName: string,
        query: string
    ) {
        return recallContext(
            projectName,
            query
        );
    }
}