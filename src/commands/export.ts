import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { getCliperDir } from "../scope/config";

interface ExportOptions {
  format: string;
}

export async function exportCommand(options: ExportOptions): Promise<void> {
  const projectRoot = process.cwd();
  const contextPath = path.join(getCliperDir(projectRoot), "context.md");

  if (!fs.existsSync(contextPath)) {
    console.error(chalk.red("\n  No context doc found. Run cliper init first.\n"));
    process.exit(1);
  }

  let content = fs.readFileSync(contextPath, "utf-8");

  if (options.format === "txt") {
    // Strip markdown formatting for plain text output
    content = content
      .replace(/```[\w]*\n/g, "")
      .replace(/```/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "");
  }

  // Write to stdout — designed to be piped
  process.stdout.write(content);
}
