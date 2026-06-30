export type MemoryType =
    | "file"
    | "commit"
    | "gap"
    | "dependency"
    | "package"
    | "git"
    | "architecture"
    | "responsibility"
    | "repository"
    | "release"
    | "timeline";

export interface MemoryObject {

    id: string;

    type: MemoryType;

    title: string;

    content: string;

    metadata: Record<string, any>;

    tags?: string[];

    relationships?: string[];
}