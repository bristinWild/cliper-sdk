import { MemoryObject } from "./memory/memory";

export class MemoryDeduplicator {

    deduplicate(
        memories: MemoryObject[]
    ): MemoryObject[] {

        const unique = new Map<string, MemoryObject>();

        for (const memory of memories) {

            unique.set(
                `${memory.type}:${memory.id}`,
                memory
            );

        }

        return [...unique.values()];

    }

}