import * as fs from "fs";
import * as path from "path";
import { LocalJsonProvider } from "../providers/local-json/provider";
import { SearchResult } from "./searchResult";
import { MemoryType } from "./memory/memory";
import {
    RetrievalProfile,
    detectProfile,
    RETRIEVAL_PROFILES,
} from "./retrieval";

import { listMemoriesByType } from "../providers/local-json/client";

export interface CliperSearchOptions {
    path: string;
    query: string;
    profile?: RetrievalProfile;
}

function getRetrievalOrder(
    options: CliperSearchOptions,
): MemoryType[] {
    const profile =
        options.profile ?? detectProfile(options.query);

    return RETRIEVAL_PROFILES[profile];
}

function loadProjectMetadata(projectPath: string) {
    const metadataPath = path.join(
        projectPath,
        ".cliper",
        "metadata.json",
    );

    if (!fs.existsSync(metadataPath)) {
        throw new Error(
            "Repository is not initialized. Run `cliper init` first.",
        );
    }

    return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
}

export async function searchProject(options: CliperSearchOptions) {

    const metadata = loadProjectMetadata(options.path);
    const retrievalOrder = getRetrievalOrder(options);
    const provider = new LocalJsonProvider();


    return provider.search(
        metadata.projectName,
        options.query,
        options.path,
        retrievalOrder,
    );
}

export async function searchProjectStructured(
    options: CliperSearchOptions,
): Promise<SearchResult> {

    const metadata = loadProjectMetadata(options.path);
    const retrievalOrder = getRetrievalOrder(options);
    const provider = new LocalJsonProvider();
    const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

    const profile = options.profile ?? detectProfile(options.query);
    const result = await provider.searchStructured(
        metadata.projectName,
        options.query,
        options.path,
        retrievalOrder,
    );

    if (profile === "gap") {
        result.gaps = listMemoriesByType(options.path, metadata.projectName, "gap")
            .sort((a, b) =>
                (SEVERITY_RANK[a.metadata?.severity] ?? 3) -
                (SEVERITY_RANK[b.metadata?.severity] ?? 3)
            )
            .slice(0, 20);
    }

    if (profile === "dependency") {
        result.packages = listMemoriesByType(options.path, metadata.projectName, "package")
            .slice(0, 30);
    }
    return result;
}