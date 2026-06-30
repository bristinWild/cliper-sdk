import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { loadScopeConfig, getCliperDir } from "../scope/config";
import { getGitContext } from "../scanner/gitContext";

export async function statusCommand(): Promise<void> {
  const projectRoot = process.cwd();
  const cliperDir = getCliperDir(projectRoot);
  const contextPath = path.join(cliperDir, "context.md");
  const config = loadScopeConfig(projectRoot);

  console.log(chalk.bold.cyan("\n  cliper status\n"));

  // Context doc status
  if (!fs.existsSync(contextPath)) {
    console.log(chalk.red("  ✗ No context doc found"));
    console.log(chalk.gray("    Run: cliper init\n"));
    return;
  }

  const stat = fs.statSync(contextPath);
  const ageMs = Date.now() - stat.mtime.getTime();
  const ageHours = Math.floor(ageMs / 3600000);
  const ageMins = Math.floor(ageMs / 60000);
  const ageStr = ageHours > 0 ? `${ageHours}h ago` : `${ageMins}m ago`;
  const sizeKB = Math.round(stat.size / 1024);
  const isFresh = ageMs < 3600000; // < 1 hour

  console.log(
    isFresh
      ? chalk.green(`  ✓ Context doc is fresh`)
      : chalk.yellow(`  ⚡ Context doc may be stale`)
  );
  console.log(chalk.gray(`    Last updated: ${ageStr} | Size: ${sizeKB}KB`));
  console.log(chalk.gray(`    Path: ${contextPath}`));

  // Scope status
  console.log(chalk.bold("\n  Scope:"));
  if (config.active.length === 0) {
    console.log(chalk.gray("    No active scope. Run cliper init to auto-detect."));
  } else {
    for (const p of config.active) console.log(chalk.white(`    • ${p}  `) + chalk.cyan("[active]"));
    for (const p of config.watched) console.log(chalk.white(`    • ${p}  `) + chalk.blue("[watched]"));
  }

  // Git status
  const git = await getGitContext(projectRoot);
  if (git.isGitRepo) {
    console.log(chalk.bold("\n  Git:"));
    console.log(chalk.gray(`    Branch:  ${git.branch}`));
    if (git.lastCommit) {
      console.log(chalk.gray(`    Latest:  ${git.lastCommit.hash} — ${git.lastCommit.message} (${git.lastCommit.timeAgo})`));
    }
    if (git.uncommittedChanges.length > 0) {
      console.log(chalk.yellow(`    Uncommitted: ${git.uncommittedChanges.length} files changed`));
      if (ageMs > 600000) {
        // Context is older than 10 mins and there are uncommitted changes
        console.log(chalk.yellow("\n  ⚡ Changes detected since last context update."));
        console.log(chalk.gray("    Run: cliper sync\n"));
        return;
      }
    }
  }

  console.log();
}
