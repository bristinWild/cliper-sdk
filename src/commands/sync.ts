import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";
import { autoDetectScope } from "../scope/autoScope";
import { loadScopeConfig, saveScopeConfig, getCliperDir } from "../scope/config";
import { extractFileContents } from "../scanner/fileContent";
import { getGitContext } from "../scanner/gitContext";
import { detectGaps } from "../gaps/detector";
import { buildDependencyMap } from "../scanner/dependencies";
import { buildSemanticLabels } from "../scanner/semanticLabels";
import { MemoryBuilder } from "../sdk/memoryBuilder";
import { CogneeProvider } from "../providers/cognee/provider";
import { MemoryChunk } from "../providers/memoryProvider";
import {
  diffManifest,
  hashChunkContent,
  loadManifest,
  saveManifest,
} from "../sdk/manifest";
import { registerRepository } from "../api/backend";
import { initCommand } from "./init";

const provider = new CogneeProvider();

interface SyncOptions {
  watch?: boolean;
}

/**
 * cliper sync — incremental memory synchronization.
 *
 * Rebuilds the repository's memories, diffs them against the manifest
 * written by the last init/sync, and uploads ONLY what changed:
 *   added    → new memories (new files, new commits, new PRs...)
 *   changed  → memories whose content hash moved
 *   removed  → memories that no longer exist (reported; pruned on full rebuild)
 * If nothing changed, no upload and no cognify run at all.
 */
export async function syncCommand(options: SyncOptions): Promise<void> {
  const projectRoot = process.cwd();
  const cliperDir = getCliperDir(projectRoot);

  if (!fs.existsSync(path.join(cliperDir, "context.md"))) {
    console.log(chalk.yellow("\n  No context doc found. Run cliper init first.\n"));
    process.exit(1);
  }

  if (options.watch) {
    console.log(chalk.cyan("\n  Watching for git changes... (Ctrl+C to stop)\n"));
    let lastHash = "";

    const check = async () => {
      try {
        const { default: simpleGit } = await import("simple-git");
        const git = simpleGit(projectRoot);
        const log = await git.log({ maxCount: 1 });
        const currentHash = log.latest?.hash ?? "";

        if (currentHash && currentHash !== lastHash) {
          if (lastHash !== "") {
            console.log(
              chalk.yellow(`\n  New commit detected: ${currentHash.slice(0, 7)} — syncing...\n`)
            );
            await runIncrementalSync(projectRoot);
          }
          lastHash = currentHash;
        }
      } catch {
        // silently skip a failed poll
      }
    };

    await check();
    setInterval(check, 10000);
    return;
  }

  await runIncrementalSync(projectRoot);
}

async function runIncrementalSync(projectRoot: string): Promise<void> {
  const projectName = path.basename(projectRoot);
  const dataset = `cliper-${projectName}`;

  console.log(chalk.bold.cyan("\n  cliper sync\n"));

  const previous = loadManifest(projectRoot);
  if (!previous) {
    console.log(chalk.yellow("  No sync manifest found — running a full init to create the baseline.\n"));
    await initCommand({ path: projectRoot });
    return;
  }

  if (!provider.isConfigured()) {
    console.log(chalk.yellow("  Cognee is not configured. Run cliper auth cognee first.\n"));
    process.exit(1);
  }

  // ---- Rebuild memories with the same pipeline init uses ----
  const spinner = ora("Scanning repository...").start();

  const scopeConfig = loadScopeConfig(projectRoot);
  const autoScope = await autoDetectScope(projectRoot);
  const manualAdditions = scopeConfig.active.filter((p) => !autoScope.includes(p));
  scopeConfig.active = [...new Set([...autoScope, ...manualAdditions])];
  saveScopeConfig(projectRoot, scopeConfig);

  const files = await extractFileContents(
    projectRoot,
    scopeConfig.active,
    scopeConfig.watched,
    50
  );
  const semanticLabels = buildSemanticLabels(files);
  const gitContext = await getGitContext(projectRoot);
  const gaps = detectGaps(files, projectRoot);
  const dependencyMap = buildDependencyMap(files);

  spinner.text = "Building memories...";
  const builder = new MemoryBuilder();
  const memories = await builder.build({
    projectRoot,
    projectName,
    files,
    gaps,
    dependencyMap,
    gitContext,
    semanticLabels,
  });

  // ---- Diff against the manifest ----
  const chunkByLabel = new Map<string, MemoryChunk>();
  const currentHashes: Record<string, string> = {};

  for (const memory of memories) {
    const chunk = provider.chunk(memory);
    chunkByLabel.set(chunk.label, chunk);
    currentHashes[chunk.label] = hashChunkContent(chunk.content);
  }

  const diff = diffManifest(previous, currentHashes);
  spinner.succeed(
    chalk.green(
      `Scanned ${memories.length} memories — ` +
      `${diff.added.length} new, ${diff.changed.length} changed, ` +
      `${diff.removed.length} removed, ${diff.unchanged} unchanged`
    )
  );

  const toUpload = [...diff.added, ...diff.changed]
    .map((label) => chunkByLabel.get(label))
    .filter((c): c is MemoryChunk => Boolean(c));

  if (toUpload.length === 0 && diff.removed.length === 0) {
    console.log(chalk.green("\n  ✓ Memory already up to date — nothing to sync.\n"));
    return;
  }

  // ---- Upload only the delta ----
  if (toUpload.length > 0) {
    const upSpinner = ora(`Syncing ${toUpload.length} memories to Cognee...`).start();
    try {
      await provider.uploadChunks(projectName, toUpload, (done, total, label) => {
        upSpinner.text = `Syncing ${toUpload.length} memories... (${done + 1}/${total}: ${label})`;
      });
      upSpinner.succeed(chalk.green(`Cognee memory updated (${toUpload.length} memories)`));
    } catch (err: any) {
      upSpinner.fail(chalk.red(`Sync failed: ${err.message}`));
      console.log(chalk.gray("  Manifest not updated — the next sync will retry these memories.\n"));
      process.exit(1);
    }
  }

  if (diff.removed.length > 0) {
    console.log(
      chalk.gray(
        `  ${diff.removed.length} stale memor${diff.removed.length === 1 ? "y" : "ies"} no longer exist locally ` +
        `(pruned from the graph on the next full cliper init).`
      )
    );
  }

  // ---- Persist the new baseline (removed labels drop out naturally) ----
  saveManifest(projectRoot, dataset, currentHashes);

  // ---- Bump the backend record so the app shows "Updated just now" ----
  try {
    await registerRepository({
      name: projectName,
      githubOwner: gitContext.githubOwner,
      githubRepo: gitContext.githubRepo,
      branch: gitContext.branch,
      dataset,
    });
  } catch {
    // non-blocking — memory sync already succeeded
  }

  console.log(chalk.green("\n  ✓ Sync complete.\n"));
}
