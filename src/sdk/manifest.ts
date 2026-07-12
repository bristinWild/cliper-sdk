import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { getCliperDir } from "../scope/config";
import { MemoryObject } from "./memory/memory";

/**
 * Sync manifest — one per provider, mapping each memory's label (`type:id`)
 * to a content fingerprint. `cliper sync` diffs a fresh build against each
 * configured provider's manifest independently.
 */
export interface SyncManifest {
    version: 1;
    dataset: string;
    syncedAt: string;
    memories: Record<string, string>; // label -> content fingerprint
}

export interface ManifestDiff {
    added: string[];
    changed: string[];
    removed: string[];
    unchanged: number;
}

export function hashChunkContent(content: string): string {
    return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

/** Stable label for a memory, independent of which provider stores it. */
export function memoryLabel(memory: MemoryObject): string {
    return `${memory.type}:${memory.id}`;
}

/**
 * Canonical content fingerprint for a memory, independent of any
 * provider's chunk formatting — Cognee's markdown blob and Local JSON's
 * structured file look nothing alike, but should still agree on whether
 * the memory changed.
 */
export function hashMemory(memory: MemoryObject): string {
    const canonical = JSON.stringify({
        id: memory.id,
        type: memory.type,
        title: memory.title,
        content: memory.content,
        tags: memory.tags ?? [],
        relationships: memory.relationships ?? [],
        metadata: memory.metadata ?? {},
    });
    return hashChunkContent(canonical);
}

function manifestFileName(providerName: string): string {
    return `manifest.${providerName}.json`;
}

export function manifestPath(projectRoot: string, providerName: string): string {
    return path.join(getCliperDir(projectRoot), manifestFileName(providerName));
}

export function loadManifest(projectRoot: string, providerName: string): SyncManifest | null {
    const p = manifestPath(projectRoot, providerName);
    if (!fs.existsSync(p)) return null;
    try {
        const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (parsed?.version !== 1 || typeof parsed.memories !== "object") return null;
        return parsed as SyncManifest;
    } catch {
        return null; // corrupt manifest -> treat as absent (full sync)
    }
}

export function saveManifest(
    projectRoot: string,
    providerName: string,
    dataset: string,
    hashes: Record<string, string>
): void {
    const dir = getCliperDir(projectRoot);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const manifest: SyncManifest = {
        version: 1,
        dataset,
        syncedAt: new Date().toISOString(),
        memories: hashes,
    };
    fs.writeFileSync(
        manifestPath(projectRoot, providerName),
        JSON.stringify(manifest, null, 2),
        "utf-8"
    );
}

export function diffManifest(
    previous: SyncManifest,
    current: Record<string, string>
): ManifestDiff {
    const added: string[] = [];
    const changed: string[] = [];
    let unchanged = 0;

    for (const [label, hash] of Object.entries(current)) {
        const prev = previous.memories[label];
        if (prev === undefined) added.push(label);
        else if (prev !== hash) changed.push(label);
        else unchanged++;
    }

    const removed = Object.keys(previous.memories).filter(
        (label) => !(label in current)
    );

    return { added, changed, removed, unchanged };
}
