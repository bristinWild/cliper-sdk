import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";
import { getCliperDir } from "../scope/config";
import { initCommand } from "./init";

interface SyncOptions {
  watch?: boolean;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  const projectRoot = process.cwd();
  const contextPath = path.join(getCliperDir(projectRoot), "context.md");

  if (!fs.existsSync(contextPath)) {
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
            console.log(chalk.yellow(`\n  New commit detected: ${currentHash.slice(0, 7)} — refreshing context...\n`));
            await initCommand({ path: projectRoot });
          }
          lastHash = currentHash;
        }
      } catch {
        // silently skip
      }
    };

    await check();
    setInterval(check, 10000); // Check every 10 seconds
  } else {
    const spinner = ora("Syncing context document...").start();
    spinner.stop();
    await initCommand({ path: projectRoot });
  }
}
