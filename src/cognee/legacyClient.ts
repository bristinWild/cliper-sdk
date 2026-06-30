import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { FileContent } from "../scanner/fileContent";
import { Gap } from "../gaps/detector";
import { DependencyMap } from "../scanner/dependencies";
import { GitContext } from "../scanner/gitContext";
import simpleGit from "simple-git";

const COGNEE_BASE_URL = process.env.COGNEE_BASE_URL ?? "";
const COGNEE_API_KEY = process.env.COGNEE_API_KEY ?? "";

export function isCogneeConfigured(): boolean {
    return Boolean(COGNEE_BASE_URL && COGNEE_API_KEY);
}

function assertConfigured() {
    if (!isCogneeConfigured()) {
        throw new Error(
            "Cognee not configured. Set COGNEE_BASE_URL and COGNEE_API_KEY environment variables."
        );
    }
}

function chunkArray<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];

    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size));
    }

    return result;
}

// Conservative cap per individual /add document. On a real repo, a single
// large file (~11,375 chars / ~2,844 tokens) was enough to trigger Cognee's
// own extraction max_tokens failure — this is a safety net on top of the
// structural split, not a replacement for it, since structural splitting
// keeps chunks semantically coherent and this only kicks in for outliers.
const MAX_CHUNK_CHARS = 3000;

interface CogneeChunk {
    label: string;
    content: string;
}

interface FileSummary {
    path: string;
    category: string;
    purpose: string;

    exports: string[];
    imports: string[];

    responsibilities: string[];
    externalPackages: string[];
}

interface CommitSummary {
    hash: string;
    author: string;
    message: string;
    timeAgo: string;
    filesChanged: string[];
}



function buildFileSummaryChunk(
    summary: FileSummary
): string {

    return `
        File: ${summary.path}

        Category:
        ${summary.category}

        Purpose:
        ${summary.purpose}

        Responsibilities:
        ${summary.responsibilities.join(", ") || "None"}

        Exports:
        ${summary.exports.join(", ") || "None"}

        Imports:
        ${summary.imports.join(", ") || "None"}

        External Packages:
        ${summary.externalPackages.join(", ") || "None"}
        `.trim();
}

async function buildCommitSummaries(
    projectRoot: string,
    gitContext: GitContext
): Promise<CommitSummary[]> {

    if (!gitContext.isGitRepo) {
        return [];
    }

    const git = simpleGit(projectRoot);
    const commits: CommitSummary[] = [];

    if (gitContext.lastCommit) {
        commits.push({
            hash: gitContext.lastCommit.hash,
            author: gitContext.lastCommit.author,
            message: gitContext.lastCommit.message,
            timeAgo: gitContext.lastCommit.timeAgo,
            filesChanged: await getFilesChangedForCommit(
                git,
                gitContext.lastCommit.hash
            ),
        });
    }

    for (const commit of gitContext.recentCommits) {
        commits.push({
            hash: commit.hash,
            author: commit.author,
            message: commit.message,
            timeAgo: commit.timeAgo,
            filesChanged: await getFilesChangedForCommit(
                git,
                commit.hash
            ),
        });
    }

    return commits;
}


async function buildCommitChunks(
    projectRoot: string,
    projectName: string,
    gitContext: GitContext
): Promise<CogneeChunk[]> {

    const commits = await buildCommitSummaries(
        projectRoot,
        gitContext
    );

    return commits.map(commit => ({
        label: `commit:${commit.hash}`,
        content: `
Memory Type:
Commit

Commit:
${commit.hash}

Project:
${projectName}

Branch:
${gitContext.branch}

Author:
${commit.author}

Message:
${commit.message}

Files Changed:
${commit.filesChanged.join("\n")}

Time:
${commit.timeAgo}
        `.trim()
    }));
}

async function getFilesChangedForCommit(
    git: ReturnType<typeof simpleGit>,
    hash: string
): Promise<string[]> {

    const output = await git.show([
        "--name-only",
        "--pretty=format:",
        hash,
    ]);

    return output
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);
}










/**
 * Splits an oversized chunk further, preferring paragraph boundaries
 * (blank lines) to avoid cutting mid-sentence, falling back to a hard
 * character split if a single paragraph is itself larger than the cap.
 */
function subSplitOversizedChunk(label: string, content: string): CogneeChunk[] {
    if (content.length <= MAX_CHUNK_CHARS) {
        return [{ label, content }];
    }

    const paragraphs = content.split(/\n\s*\n/);
    const pieces: string[] = [];
    let current = "";

    for (const para of paragraphs) {
        if (para.length > MAX_CHUNK_CHARS) {
            if (current.length > 0) {
                pieces.push(current);
                current = "";
            }
            for (let i = 0; i < para.length; i += MAX_CHUNK_CHARS) {
                pieces.push(para.slice(i, i + MAX_CHUNK_CHARS));
            }
            continue;
        }

        if (current.length + para.length + 2 > MAX_CHUNK_CHARS) {
            pieces.push(current);
            current = para;
        } else {
            current = current.length > 0 ? `${current}\n\n${para}` : para;
        }
    }
    if (current.length > 0) pieces.push(current);

    return pieces.map((content, i) => ({ label: `${label}:part${i + 1}`, content }));
}

/**
 * Improvement #1 — self-describing chunks.
 * Cognee extracts entities/relationships from each chunk INDEPENDENTLY
 * (unlike Claude, which reads the whole doc in one pass with full context).
 * Without a header, Cognee has to infer from raw code alone that
 * "src/commands/init.ts" belongs to "cliper-sdk" and implements "cliper init".
 * A one-line header gives entity extraction an explicit subject and project
 * anchor to attach relationships to.
 */
function fileHeader(projectName: string, relativePath: string): string {
    return `# File: ${relativePath} — part of the ${projectName} project.\n\n`;
}

/**
 * Improvement #3 — dependency edges as plain sentences instead of a
 * "from -> arrow -> to" tree. Cognee's relationship extraction maps far
 * more reliably onto "X imports Y" sentence structure than onto a list
 * formatted for human visual scanning, which is what the dependency-map
 * tree (↳ characters, indentation) was designed for in the original doc.
 */
function buildDependencyChunks(
    projectName: string,
    dependencyMap: DependencyMap
): CogneeChunk[] {
    const chunks: CogneeChunk[] = [];

    const edgeGroups = chunkArray(dependencyMap.edges, 10);

    edgeGroups.forEach((group, index) => {
        const lines: string[] = [
            `# Dependency relationships in ${projectName}.`,
            "",
        ];

        for (const edge of group) {
            const verb =
                edge.type === "use"
                    ? "uses"
                    : edge.type === "mod"
                        ? "declares the module"
                        : "imports";

            lines.push(`${edge.from} ${verb} ${edge.to}.`);
        }

        chunks.push({
            label: `dependency-map-part${index + 1}`,
            content: lines.join("\n"),
        });
    });

    const externalGroups = chunkArray(
        dependencyMap.externalPackages,
        10
    );

    externalGroups.forEach((group, index) => {
        const lines: string[] = [
            `# External packages used by ${projectName}.`,
            "",
        ];

        for (const pkg of group) {
            lines.push(
                `${projectName} depends on the external package ${pkg}.`
            );
        }

        chunks.push({
            label: `external-packages-part${index + 1}`,
            content: lines.join("\n"),
        });
    });

    return chunks;
}

/**
 * Improvement #2 — gaps as plain sentences instead of bracketed metadata.
 * The original format `⚠️ [file.ts:6] description` is dense and scannable
 * for a human, but has no clear grammatical subject/predicate for entity
 * extraction to latch onto. A full sentence per gap extracts more reliably.
 */
function buildGapChunks(
    projectName: string,
    gaps: Gap[]
): CogneeChunk[] {
    if (gaps.length === 0) {
        return [
            {
                label: "detected-gaps",
                content: `# Gaps in ${projectName}.\n\nNo significant gaps were detected.`,
            },
        ];
    }

    const severityLabel: Record<Gap["severity"], string> = {
        high: "high-priority",
        medium: "medium-priority",
        low: "low-priority",
    };

    const typeLabel: Record<Gap["type"], string> = {
        undocumented_function: "an undocumented function",
        missing_env_var: "a missing environment variable",
        todo_fixme: "a TODO or FIXME comment",
        implicit_dependency: "an implicit dependency",
        stale_reference: "a stale reference",
    };

    const chunks: CogneeChunk[] = [];

    const groups = chunkArray(gaps, 10);

    groups.forEach((group, index) => {
        const lines: string[] = [
            `# Gaps in ${projectName}.`,
            "",
        ];

        for (const g of group) {
            const location = g.line
                ? `${g.file}, line ${g.line}`
                : g.file;

            lines.push(
                `${location} has a ${severityLabel[g.severity]} gap: ${typeLabel[g.type]}. ${g.description}`
            );
        }

        chunks.push({
            label: `detected-gaps-part${index + 1}`,
            content: lines.join("\n"),
        });
    });

    return chunks;
}

function gitContextSentences(projectName: string, git: GitContext): string {
    if (!git.isGitRepo) {
        return `# Git context for ${projectName}.\n\n${projectName} is not a git repository.`;
    }

    const lines: string[] = [`# Git context for ${projectName}.\n`];
    lines.push(`${projectName} is currently on branch ${git.branch}.`);

    if (git.lastCommit) {
        lines.push(
            `The last commit on ${projectName} was ${git.lastCommit.hash} by ${git.lastCommit.author}: "${git.lastCommit.message}" (${git.lastCommit.timeAgo}).`
        );
    }

    for (const c of git.recentCommits) {
        lines.push(`Commit ${c.hash} on ${projectName}: "${c.message}".`);
    }

    if (git.uncommittedChanges.length > 0) {
        const noun = git.uncommittedChanges.length === 1 ? "change" : "changes";
        lines.push(`${projectName} currently has ${git.uncommittedChanges.length} uncommitted ${noun}.`);
    }

    return lines.join("\n");
}

/**
 * Builds Cognee-specific chunks directly from structured data (files, gaps,
 * dependencyMap, gitContext) rather than regex-parsing the flattened
 * context.md markdown. This avoids re-parsing a format designed for human/
 * Claude readability, and lets each chunk be phrased for how Cognee's
 * entity/relationship extraction actually works — independently per chunk,
 * not with the whole-document context a single Claude pass gets.
 *
 * Note: this transform is intentionally Cognee-only. context.md itself
 * (read by Claude, cliper export, and the dashboard parser) is untouched.
 */
// async function buildCogneeChunks(
//     projectRoot: string,
//     projectName: string,
//     files: FileContent[],
//     gaps: Gap[],
//     dependencyMap: DependencyMap,
//     gitContext: GitContext
// ): Promise<CogneeChunk[]> {
//     const chunks: CogneeChunk[] = [];

//     chunks.push({ label: "git-context", content: gitContextSentences(projectName, gitContext) });
//     chunks.push(
//         ...buildDependencyChunks(projectName, dependencyMap)
//     );

//     chunks.push(
//         ...buildGapChunks(projectName, gaps)
//     );

//     const commitChunks = await buildCommitChunks(
//         projectRoot,
//         projectName,
//         gitContext
//     );

//     chunks.push(...commitChunks);

//     for (const file of files) {
//         const summary = buildFileSummary(
//             file,
//             dependencyMap
//         );

//         chunks.push({
//             label: `summary:${file.relativePath}`,
//             content: buildFileSummaryChunk(summary)
//         });
//     }

//     const nonEmptyChunks = chunks.filter((c) => c.content.trim().length > 0);

//     // Safety net: sub-split anything still too large after structural splitting
//     return nonEmptyChunks.flatMap((c) => subSplitOversizedChunk(c.label, c.content));
// }




async function uploadChunk(datasetName: string, label: string, content: string): Promise<void> {
    const tmpPath = path.join(os.tmpdir(), `cliper-${label.replace(/[\/:]/g, "_")}-${Date.now()}.md`);
    fs.writeFileSync(tmpPath, content, "utf-8");

    try {
        const fileBuffer = fs.readFileSync(tmpPath);
        const form = new FormData();
        form.append("data", new Blob([fileBuffer], { type: "text/markdown" }), `${label}.md`);
        form.append("datasetName", datasetName);

        const res = await fetch(`${COGNEE_BASE_URL}/api/v1/add`, {
            method: "POST",
            headers: { "X-Api-Key": COGNEE_API_KEY },
            body: form,
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`/add failed for chunk "${label}": ${res.status} ${errText}`);
        }
    } finally {
        fs.unlinkSync(tmpPath);
    }
}

/**
 * Uploads structured project data into a Cognee dataset as self-describing,
 * sentence-phrased chunks (see buildCogneeChunks), then triggers cognify
 * once on the whole dataset. Sending one large document caused Cognee's own
 * extraction step to fail with IncompleteOutputException (max_tokens) on a
 * real repo — chunking keeps each /add small enough for that step to
 * complete reliably.
 */
// export async function rememberContext(
//     projectRoot: string,
//     projectName: string,
//     files: FileContent[],
//     gaps: Gap[],
//     dependencyMap: DependencyMap,
//     gitContext: GitContext,
//     onProgress?: (done: number, total: number, label: string) => void,
//     debugDir?: string
// ): Promise<void> {
//     assertConfigured();

//     const datasetName =
//         `cliper-${projectName}-${Date.now()}`;

//     const summary = buildFileSummary(
//         files[0],
//         dependencyMap
//     );

//     console.log(summary);
//     const chunks = await buildCogneeChunks(
//         projectRoot,
//         projectName,
//         files,
//         gaps,
//         dependencyMap,
//         gitContext
//     );

//     if (process.env.COGNEE_DEBUG) {
//         console.log("\nCognee Chunks:");
//         chunks.forEach((c) => {
//             console.log(
//                 `${c.label.padEnd(35)} ${c.content.length
//                     .toString()
//                     .padStart(6)} chars`
//             );
//         });
//         console.log("");
//     }
//     // Optional: write the exact chunks Cognee receives to disk for inspection.
//     // Useful because the uploaded content never otherwise touches disk —
//     // it's built in memory and sent straight to /add.
//     if (debugDir) {
//         if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
//         for (const c of chunks) {
//             const safeLabel = c.label.replace(/[\/:]/g, "_");
//             fs.writeFileSync(path.join(debugDir, `${safeLabel}.md`), c.content, "utf-8");
//         }
//     }

//     for (let i = 0; i < chunks.length; i++) {
//         onProgress?.(i, chunks.length, chunks[i].label);
//         await uploadChunk(datasetName, chunks[i].label, chunks[i].content);
//     }

//     const cognifyRes = await fetch(`${COGNEE_BASE_URL}/api/v1/cognify`, {
//         method: "POST",
//         headers: {
//             "X-Api-Key": COGNEE_API_KEY,
//             "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ datasets: [datasetName] }),
//     });

//     if (!cognifyRes.ok) {
//         const errText = await cognifyRes.text();
//         throw new Error(`Cognee /cognify failed: ${cognifyRes.status} ${errText}`);
//     }
// }

export interface CogneeSearchResult {
    dataset_id: string;
    dataset_name: string;
    search_result: string[];
}

/**
 * Queries Cognee memory for a project's dataset.
 * search_type defaults to GRAPH_COMPLETION (verified working).
 */
export async function recallContext(
    projectName: string,
    query: string
): Promise<CogneeSearchResult[]> {
    assertConfigured();

    const datasetName = `cliper-${projectName}`;

    const res = await fetch(`${COGNEE_BASE_URL}/api/v1/search`, {
        method: "POST",
        headers: {
            "X-Api-Key": COGNEE_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query,
            search_type: "GRAPH_COMPLETION",
            datasets: [datasetName],
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Cognee /search failed: ${res.status} ${errText}`);
    }

    return res.json() as Promise<CogneeSearchResult[]>;
}

