export type MemoryType =
    | "repository"
    | "file"
    | "commit"
    | "release"
    | "gap"
    | "dependency"
    | "package"
    | "architecture"
    | "responsibility"
    | "git";

export interface MemoryObject {

    id: string;

    type: MemoryType;

    title: string;

    content: string;

    metadata: Record<string, any>;

    tags?: string[];

    relationships?: string[];
}