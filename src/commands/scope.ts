import * as path from "path";
import chalk from "chalk";
import { loadScopeConfig, saveScopeConfig } from "../scope/config";

export async function scopeCommand(action: string, scopePath?: string): Promise<void> {
  const projectRoot = process.cwd();
  const config = loadScopeConfig(projectRoot);

  switch (action) {
    case "add": {
      if (!scopePath) { console.error(chalk.red("  Please provide a path.")); process.exit(1); }
      const normalized = path.normalize(scopePath);
      if (!config.active.includes(normalized)) {
        config.active.push(normalized);
        saveScopeConfig(projectRoot, config);
        console.log(chalk.green(`\n  ✓ Added to active scope: ${normalized}\n`));
        console.log(chalk.gray("  Run cliper sync to update the context doc.\n"));
      } else {
        console.log(chalk.yellow(`\n  Already in scope: ${normalized}\n`));
      }
      break;
    }

    case "watch": {
      if (!scopePath) { console.error(chalk.red("  Please provide a path.")); process.exit(1); }
      const normalized = path.normalize(scopePath);
      if (config.watched.length >= 15) {
        console.log(chalk.yellow("\n  Watch list is capped at 15 files. Remove one first:\n"));
        console.log(chalk.gray("  cliper scope remove <path>\n"));
        process.exit(1);
      }
      if (!config.watched.includes(normalized)) {
        config.watched.push(normalized);
        saveScopeConfig(projectRoot, config);
        console.log(chalk.green(`\n  ✓ Added to watch list: ${normalized}\n`));
      } else {
        console.log(chalk.yellow(`\n  Already watched: ${normalized}\n`));
      }
      break;
    }

    case "remove": {
      if (!scopePath) { console.error(chalk.red("  Please provide a path.")); process.exit(1); }
      const normalized = path.normalize(scopePath);
      config.active = config.active.filter((p) => p !== normalized);
      config.watched = config.watched.filter((p) => p !== normalized);
      saveScopeConfig(projectRoot, config);
      console.log(chalk.green(`\n  ✓ Removed from scope: ${normalized}\n`));
      break;
    }

    case "list": {
      console.log(chalk.bold.cyan("\n  Current Scope\n"));
      if (config.active.length === 0 && config.watched.length === 0) {
        console.log(chalk.gray("  No scope configured. Run cliper init to auto-detect.\n"));
        break;
      }
      if (config.active.length > 0) {
        console.log(chalk.bold("  Active scope:"));
        for (const p of config.active) console.log(chalk.white(`    • ${p}`));
      }
      if (config.watched.length > 0) {
        console.log(chalk.bold("\n  Watch list:"));
        for (const p of config.watched) console.log(chalk.white(`    • ${p}`));
        console.log(chalk.gray(`\n  (${config.watched.length}/15 watch slots used)`));
      }
      console.log();
      break;
    }

    default: {
      console.error(chalk.red(`\n  Unknown action: ${action}`));
      console.log(chalk.gray("  Usage: cliper scope <add|remove|watch|list> [path]\n"));
      process.exit(1);
    }
  }
}
