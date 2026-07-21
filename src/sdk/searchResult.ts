import { MemoryObject } from "./memory/memory";

export interface SearchResult {
    query: string;

    architecture: MemoryObject[];
    files: MemoryObject[];
    dependencies: MemoryObject[];
    repository: MemoryObject[];
    commits: MemoryObject[];
    gaps: MemoryObject[];
    packages: MemoryObject[];
}