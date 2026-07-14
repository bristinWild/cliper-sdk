import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
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
import { resolveProviders } from "../providers/resolve";
import { MemoryObject } from "../sdk/memory/memory";
import {
  diffManifest,
  hashMemory,
  loadManifest,
  memoryLabel,
  saveManifest,
} from "../sdk/manifest";
import { registerRepository } from "../api/backend";
import { initCommand } from "./init";

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
  dotenv.config();
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

  console.log(chalk.bold.cyan("\n  cliper sync\n"));

  const providers = resolveProviders();
  if (providers.length === 0) {
    console.log(
      chalk.yellow(
        "  No memory provider configured. Run `cliper auth cognee` or `cliper auth local-json` first.\n"
      )
    );
    process.exit(1);
  }

  // Only fall back to a full init if NO provider has a baseline at all — a
  // provider added later (e.g. Local JSON after Cognee's been syncing for
  // months) gets its own first upload per-provider below instead.
  const baselineManifests = providers.map((p) => loadManifest(projectRoot, p.name));
  if (baselineManifests.every((m) => m === null)) {
    console.log(chalk.yellow("  No sync manifest found — running a full init to create the baseline.\n"));
    await initCommand({ path: projectRoot });
    return;
  }

  // ---- Rebuild memories ONCE, regardless of how many providers are configured ----
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

  // Fingerprint each memory once; chunk() formatting happens later, only
  // for whatever subset actually needs uploading.
  const memoryByLabel = new Map<string, MemoryObject>();
  const currentHashes: Record<string, string> = {};
  for (const memory of memories) {
    const label = memoryLabel(memory);
    memoryByLabel.set(label, memory);
    currentHashes[label] = hashMemory(memory);
  }

  spinner.succeed(chalk.green(`Scanned ${memories.length} memories`));

  // ---- Diff + upload independently per provider ----
  for (const provider of providers) {
    const dataset = `${provider.name}-cliper-${projectName}`;
    const previous = loadManifest(projectRoot, provider.name);

    if (!previous) {
      // No baseline for this provider yet — full upload instead of diffing against nothing.
      const baselineSpinner = ora(`${provider.name}: no baseline yet, uploading all memories...`).start();
      try {
        await provider.upload(
          projectName,
          memories,
          (done, total, label) => {
            baselineSpinner.text = `${provider.name}: uploading (${done + 1}/${total}: ${label})`;
          },
          undefined,
          projectRoot
        );
        baselineSpinner.succeed(chalk.green(`${provider.name}: baseline uploaded (${memories.length} memories)`));
        saveManifest(projectRoot, provider.name, dataset, currentHashes);
      } catch (err: any) {
        baselineSpinner.fail(chalk.red(`${provider.name}: baseline upload failed: ${err.message}`));
      }
      continue;
    }

    const diff = diffManifest(previous, currentHashes);
    if (process.env.CLIPER_DEBUG) {
      console.log("ADDED:", diff.added);
      console.log("REMOVED:", diff.removed);
    }
    console.log(
      chalk.gray(
        `  ${provider.name}: ${diff.added.length} new, ${diff.changed.length} changed, ` +
        `${diff.removed.length} removed, ${diff.unchanged} unchanged`
      )
    );

    const toUploadLabels = [...diff.added, ...diff.changed];
    if (toUploadLabels.length === 0 && diff.removed.length === 0) {
      console.log(chalk.green(`  ✓ ${provider.name} already up to date.`));
      continue;
    }

    if (toUploadLabels.length > 0) {
      const toUpload = toUploadLabels
        .map((label) => memoryByLabel.get(label))
        .filter((m): m is MemoryObject => Boolean(m))
        .map((m) => provider.chunk(m));

      const upSpinner = ora(`Syncing ${toUpload.length} memories to ${provider.name}...`).start();
      try {
        await provider.uploadChunks(
          projectName,
          toUpload,
          (done, total, label) => {
            upSpinner.text = `${provider.name}: syncing (${done + 1}/${total}: ${label})`;
          },
          projectRoot
        );
        upSpinner.succeed(chalk.green(`${provider.name} memory updated (${toUpload.length} memories)`));
      } catch (err: any) {
        upSpinner.fail(chalk.red(`${provider.name} sync failed: ${err.message}`));
        console.log(chalk.gray(`  Manifest not updated for ${provider.name} — the next sync will retry these memories.`));
        continue; // don't save this provider's manifest; don't block the others
      }
    }

    if (diff.removed.length > 0) {
      console.log(
        chalk.gray(
          `  ${diff.removed.length} stale memor${diff.removed.length === 1 ? "y" : "ies"} no longer exist locally ` +
          `for ${provider.name} (pruned on the next full cliper init).`
        )
      );
    }

    // ---- Persist this provider's new baseline (removed labels drop out naturally) ----
    saveManifest(projectRoot, provider.name, dataset, currentHashes);
  }

  // ---- Bump the backend record so the app shows "Updated just now" ----
  try {
    await registerRepository({
      name: projectName,
      githubOwner: gitContext.githubOwner,
      githubRepo: gitContext.githubRepo,
      branch: gitContext.branch,
      dataset: `cliper-${projectName}`,
    });
  } catch {
    // non-blocking — memory sync already succeeded
  }

  console.log(chalk.green("\n  ✓ Sync complete.\n"));
}
