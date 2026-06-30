import {
    rememberContext,
    recallContext,
    isCogneeConfigured,
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