import * as readline from "readline";
import chalk from "chalk";
import { loadConfig, saveConfig } from "./config";

function ask(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

export async function configureLocalJson(): Promise<void> {
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("        Configure Local JSON");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("Zero-dependency offline provider — memories are written as");
    console.log("plain JSON files under .cliper/memory/ in each repo. No");
    console.log("account, API key, or network access required.");
    console.log("");

    const config = loadConfig();
    const currentDir = config.localJson?.dataDir;

    const dataDir = await ask(
        `Storage directory relative to repo root [${currentDir ?? ".cliper/memory"}]: `
    );

    config.localJson = {
        enabled: true,
        ...(dataDir || currentDir ? { dataDir: dataDir || currentDir } : {}),
    };

    saveConfig(config);

    console.log("");
    console.log(chalk.green("✔ Local JSON configured successfully."));
    console.log("");
    console.log("You can now run:");
    console.log("");
    console.log("  cliper init");
    console.log("");
}
