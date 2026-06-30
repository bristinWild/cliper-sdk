import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";
import { getCliperDir } from "../scope/config";
import { getAuthToken } from "./auth";

const API_URL = "https://cliperhq.vercel.app/api/push";

export async function pushCommand(): Promise<void> {
    const projectRoot = process.cwd();
    const contextPath = path.join(getCliperDir(projectRoot), "context.md");
    const cliperDir = getCliperDir(projectRoot);
    const promptClaudePath = path.join(cliperDir, "prompt-claude.md");
    const promptGptPath = path.join(cliperDir, "prompt-gpt.md");

    const promptClaude = fs.existsSync(promptClaudePath)
        ? fs.readFileSync(promptClaudePath, "utf-8")
        : null;
    const promptGpt = fs.existsSync(promptGptPath)
        ? fs.readFileSync(promptGptPath, "utf-8")
        : null;

    if (!fs.existsSync(contextPath)) {
        console.error(chalk.red("\n  No context doc found. Run cliper init first.\n"));
        process.exit(1);
    }

    const token = getAuthToken();
    if (!token) {
        console.error(chalk.red("\n  Not authenticated. Run cliper auth first.\n"));
        process.exit(1);
    }

    const content = fs.readFileSync(contextPath, "utf-8");
    const projectName = path.basename(projectRoot);

    const spinner = ora("Pushing context to dashboard...").start();

    try {
        const { default: fetch } = await import("node-fetch");
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ projectName, content, promptClaude, promptGpt }),

        });

        const data = await res.json() as any;

        if (!res.ok) {
            spinner.fail(chalk.red(`Push failed: ${data.error}`));
            process.exit(1);
        }

        spinner.succeed(chalk.green("Context pushed successfully"));
        console.log(chalk.gray(`\n  Dashboard: ${data.dashboardUrl}\n`));
    } catch (err: any) {
        spinner.fail(chalk.red(`Push failed: ${err.message}`));
        process.exit(1);
    }
}