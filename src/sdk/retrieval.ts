import { MemoryType } from "./memory/memory";


export type RetrievalProfile =
    | "auto"
    | "architecture"
    | "dependency"
    | "timeline"
    | "gap"
    | "repository";

export const DEFAULT_RETRIEVAL_ORDER: MemoryType[] = [
    "file",
    "architecture",
    "dependency",
    "gap",
    "commit",
    "repository",
];

export const TIMELINE_RETRIEVAL_ORDER: MemoryType[] = [
    "timeline",
    "commit",
    "release",
    "issue",
    "pull-request",
];

export const SECURITY_RETRIEVAL_ORDER: MemoryType[] = [
    "gap",
    "dependency",
    "file",
    "commit",
];


export const RETRIEVAL_PROFILES: Record<RetrievalProfile, MemoryType[]> = {
    auto: DEFAULT_RETRIEVAL_ORDER,

    architecture: [
        "architecture",
        "file",
        "dependency",
        "repository",
    ],
    dependency: ["package", "dependency", "file"],
    timeline: [
        "commit",
        "timeline",
        "release",
        "issue",
        "pull-request",
    ],
    gap: [
        "gap",
        "file",
        "repository",
    ],
    repository: [
        "repository",
        "architecture",
        "file",
    ],
};

export function detectProfile(query: string): RetrievalProfile {
    const q = query.toLowerCase();

    if (
        q.includes("architecture") ||
        q.includes("module") ||
        q.includes("design") ||
        q.includes("structure")
    )
        return "architecture";

    if (
        q.includes("dependency") ||
        q.includes("import") ||
        q.includes("package")
    )
        return "dependency";

    if (
        q.includes("commit") ||
        q.includes("history") ||
        q.includes("changed") ||
        q.includes("latest")
    )
        return "timeline";

    if (
        q.includes("gap") ||
        q.includes("documentation") ||
        q.includes("todo") ||
        q.includes("missing")
    )
        return "gap";


    return "auto";
}