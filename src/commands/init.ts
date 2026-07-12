import { buildDependencyMap, formatDependencyMap } from "../scanner/dependencies";
import * as fs from "fs";
import * as path from "path";
import simpleGit from "simple-git";
import chalk from "chalk";
import ora from "ora";
import { autoDetectScope } from "../scope/autoScope";
import { loadScopeConfig, saveScopeConfig, getCliperDir } from "../scope/config";
import { generateFileTree } from "../scanner/fileTree";
import { extractFileContents } from "../scanner/fileContent";
import { getGitContext } from "../scanner/gitContext";
import { resolveBlockedReferences } from "../resolver/urlFetcher";
import { detectGaps } from "../gaps/detector";
import { buildContextDoc } from "../context/builder";
import { resolveProviders } from "../providers/resolve";
import { MemoryBuilder } from "../sdk/memoryBuilder";
import { buildSemanticLabels } from "../scanner/semanticLabels";
import { registerRepository } from "../api/backend";
import { hashMemory, memoryLabel, saveManifest } from "../sdk/manifest";

interface InitOptions {
  path: string;
  maxFileSize?: number;
}


export async function initCommand(options: InitOptions): Promise<void> {
  const projectRoot = path.resolve(options.path);
  const builder = new MemoryBuilder();



  if (!fs.existsSync(projectRoot)) {
    console.error(chalk.red(`Project path not found: ${projectRoot}`));
    process.exit(1);
  }

  console.log(chalk.bold.cyan("\n  cliper init\n"));
  console.log(chalk.gray(`  Project: ${projectRoot}\n`));

  // Step 1: Load or create scope config
  const spinner = ora("Detecting scope from git activity...").start();
  let scopeConfig = loadScopeConfig(projectRoot);

  // Always re-run auto-detection and merge with any manual additions
  const autoScope = await autoDetectScope(projectRoot);
  const manualAdditions = scopeConfig.active.filter((p) => !autoScope.includes(p));
  scopeConfig.active = [...new Set([...autoScope, ...manualAdditions])];
  saveScopeConfig(projectRoot, scopeConfig);
  spinner.succeed(
    chalk.green(`Scope detected: ${scopeConfig.active.length} paths active, ${scopeConfig.watched.length} watched`)
  );

  // Step 2: Generate file tree
  const treeSpinner = ora("Building annotated file tree...").start();
  const fileTree = generateFileTree(projectRoot, scopeConfig.active, scopeConfig.watched);
  treeSpinner.succeed(chalk.green("File tree built"));

  // Step 3: Extract file contents
  const contentSpinner = ora("Extracting file contents within scope...").start();
  const files = await extractFileContents(
    projectRoot,
    scopeConfig.active,
    scopeConfig.watched,
    options.maxFileSize ?? 50
  );

  contentSpinner.succeed(chalk.green(`Extracted ${files.length} files`));

  const semanticLabels = buildSemanticLabels(files);

  // Step 4: Git context
  const gitSpinner = ora("Reading git context...").start();
  const gitContext = await getGitContext(projectRoot);
  gitSpinner.succeed(
    gitContext.isGitRepo
      ? chalk.green(`Git: ${gitContext.branch} — ${gitContext.lastCommit?.message ?? "no commits"}`)
      : chalk.yellow("Not a git repository")
  );

  // Step 5: Resolve blocked references
  const refSpinner = ora("Fetching blocked external references...").start();
  const references = await resolveBlockedReferences(projectRoot);
  const fetched = references.filter((r) => r.status === "fetched").length;
  const failed = references.filter((r) => r.status === "failed").length;
  refSpinner.succeed(chalk.green(`References: ${fetched} fetched, ${failed} failed`));


  // Step 6: Detect gaps



  const gapSpinner = ora("Detecting gaps and undocumented patterns...").start();
  const gaps = detectGaps(files, projectRoot);
  gapSpinner.succeed(
    gaps.length > 0
      ? chalk.yellow(`Found ${gaps.length} gaps (${gaps.filter((g) => g.severity === "high").length} high priority)`)
      : chalk.green("No significant gaps detected")
  );
  const depSpinner = ora("Mapping dependencies...").start();
  const dependencyMap = buildDependencyMap(files);
  depSpinner.succeed(chalk.green(`Dependency map: ${dependencyMap.edges.length} edges, ${dependencyMap.externalPackages.length} external packages`));

  // Step 7: Build context doc
  const buildSpinner = ora("Building context document...").start();
  const projectName = path.basename(projectRoot);
  const contextDoc = buildContextDoc({
    projectRoot,
    projectName,
    activeScope: scopeConfig.active,
    watchedScope: scopeConfig.watched,
    fileTree,
    files,
    gitContext,
    references,
    gaps,
    generatedAt: new Date().toISOString(),
    dependencyMap: formatDependencyMap(dependencyMap),
  });

  // Step 8: Write to disk
  const cliperDir = getCliperDir(projectRoot);
  if (!fs.existsSync(cliperDir)) fs.mkdirSync(cliperDir, { recursive: true });
  const contextPath = path.join(cliperDir, "context.md");
  fs.writeFileSync(contextPath, contextDoc, "utf-8");
  buildSpinner.succeed(chalk.green("Context document built"));


  if (!gitContext.githubOwner || !gitContext.githubRepo) {
    console.log(chalk.yellow("  ⚠ No GitHub remote detected — skipping backend registration"));
  } else {
    const regSpinner = ora("Registering repository with Cliper...").start();
    try {
      await registerRepository({
        name: projectName,
        githubOwner: gitContext.githubOwner,
        githubRepo: gitContext.githubRepo,
        branch: gitContext.branch,
        dataset: `cliper-${projectName}`,
      });
      regSpinner.succeed(chalk.green("Repository registered with Cliper"));
    } catch (err: any) {
      regSpinner.fail(chalk.red(`Registration failed: ${err.message}`));
    }
  }

  // Step 8b: Push to memory providers (opt-in — only runs for configured ones).
  const providers = resolveProviders();
  if (providers.length > 0) {
    const memories = await builder.build({
      projectRoot,
      projectName,
      files,
      gaps,
      dependencyMap,
      gitContext,
      semanticLabels,
    });

    // Fingerprint each memory once and reuse it for every provider's manifest.
    const currentHashes: Record<string, string> = {};
    for (const m of memories) {
      currentHashes[memoryLabel(m)] = hashMemory(m);
    }

    for (const provider of providers) {
      const providerSpinner = ora(`Syncing to ${provider.name} memory...`).start();
      // Set COGNEE_DEBUG=1 to write the exact uploaded chunks to .cliper/<provider>-debug/
      // for inspection — useful for providers (like Cognee) whose uploaded
      // content is otherwise built in memory and sent straight over the wire,
      // never touching disk.
      const debugDir = process.env.COGNEE_DEBUG
        ? path.join(cliperDir, `${provider.name}-debug`)
        : undefined;

      try {
        await provider.upload(
          projectName,
          memories,
          (done, total, label) => {
            providerSpinner.text =
              `Syncing to ${provider.name} memory... (${done + 1}/${total}: ${label})`;
          },
          debugDir,
          projectRoot
        );

        providerSpinner.succeed(chalk.green(`${provider.name} memory updated`));
        saveManifest(projectRoot, provider.name, `${provider.name}-cliper-${projectName}`, currentHashes);

        if (debugDir) {
          console.log(
            chalk.gray(
              `  (Uploaded chunks written to ${debugDir} for inspection)`
            )
          );
        }
      } catch (err: any) {
        // Non-blocking: context.md is already built successfully on disk regardless,
        // and a failure in one provider shouldn't stop the others from syncing.
        // Cognee's /cognify error payload can include one entry per uploaded chunk
        // (e.g. 30+ UUIDs) when only one chunk actually fails — truncate to keep
        // the warning readable instead of dumping the full payload to the terminal.
        const rawMessage: string = err.message ?? String(err);
        const shortMessage = rawMessage;
        providerSpinner.warn(chalk.yellow(`${provider.name} sync incomplete: ${shortMessage}`));
        console.error(rawMessage);
        console.log(chalk.gray("  (Most context was still synced — this does not affect your local context.md)"));
      }
    }
  }

  // Auto-manage .gitignore — add anything cliper introduces that shouldn't be committed
  const gitignorePath = path.join(projectRoot, ".gitignore");

  const entriesToEnsure: Array<{ check: string; line: string }> = [
    { check: "node_modules", line: "node_modules/" },
    { check: "package-lock.json", line: "package-lock.json" },
    { check: ".cliper/cache", line: ".cliper/cache/" },
    { check: ".cliper/prompt-", line: ".cliper/prompt-*.md" },
  ];

  let gitignoreContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf-8")
    : "";

  const missingEntries = entriesToEnsure.filter((e) => !gitignoreContent.includes(e.check));

  if (missingEntries.length > 0) {
    const block = "\n# Cliper — auto-managed\n" + missingEntries.map((e) => e.line).join("\n") + "\n";
    if (fs.existsSync(gitignorePath)) {
      fs.appendFileSync(gitignorePath, block);
    } else {
      fs.writeFileSync(gitignorePath, block.trimStart());
    }
  }

  // Remove node_modules from git tracking if accidentally staged
  try {
    const gitInstance = simpleGit(projectRoot);
    const tracked = await gitInstance.raw(["ls-files", "node_modules"]);
    if (tracked.trim().length > 0) {
      await gitInstance.raw(["rm", "-r", "--cached", "node_modules/"]);
      console.log(chalk.yellow("  ⚡ Removed node_modules from git tracking"));
    }
    const lockTracked = await gitInstance.raw(["ls-files", "package-lock.json"]);
    if (lockTracked.trim().length > 0) {
      await gitInstance.raw(["rm", "--cached", "package-lock.json"]);
      console.log(chalk.yellow("  ⚡ Removed package-lock.json from git tracking"));
    }
  } catch {
    // Not a git repo or already clean — skip silently
  }

  // Summary
  const sizeKB = Math.round(Buffer.byteLength(contextDoc, "utf-8") / 1024);
  const estimatedTokens = Math.round(contextDoc.length / 4);

  console.log(chalk.bold.green("\n  ✓ Context document ready\n"));
  console.log(chalk.gray(`  Location:  ${contextPath}`));
  console.log(chalk.gray(`  Size:      ${sizeKB}KB (~${estimatedTokens.toLocaleString()} tokens)`));
  console.log(chalk.gray(`  Files:     ${files.length} files in context`));
  console.log(chalk.gray(`  Gaps:      ${gaps.length} detected\n`));
  console.log(chalk.cyan("  Copy to clipboard:"));
  console.log(chalk.white("    cliper export | pbcopy        # macOS"));
  console.log(chalk.white("    cliper export | xclip         # Linux\n"));
}

