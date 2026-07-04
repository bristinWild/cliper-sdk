import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { getCliperDir } from "../scope/config";

/**
 * Sync manifest — the memory of what has already been uploaded.
 *
 * Maps every memory chunk label (`type:id`) to a sha256 of the exact
 * content that was sent to Cognee. `cliper sync` diffs a fresh build
 * against this to upload only what actually changed.
 */
export interface SyncManifest {
    version: 1;
    dataset: string;
    syncedAt: string;
    memories: Record<string, string>; // label -> content sha256
}

export interface ManifestDiff {
    added: string[];
    changed: string[];
    removed: string[];
    unchanged: number;
}

const MANIFEST_FILE = "manifest.json";

export function hashChunkContent(content: string): string {
    return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

export function manifestPath(projectRoot: string): string {
    return path.join(getCliperDir(projectRoot), MANIFEST_FILE);
}

export function loadManifest(projectRoot: string): SyncManifest | null {
    const p = manifestPath(projectRoot);
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
    fs.writeFileSync(manifestPath(projectRoot), JSON.stringify(manifest, null, 2), "utf-8");
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
