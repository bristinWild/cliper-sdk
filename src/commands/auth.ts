import chalk from "chalk";
import * as readline from "readline";
import { saveGithubToken } from "../auth/github";
import { loadConfig, saveConfig } from "../auth/config";

loadConfig()

const AUTH_URL = "https://cliperhq.vercel.app/auth/cli";

export async function authCommand(
    provider?: string
): Promise<void> {

    if (provider === "github") {

        console.log(chalk.bold.cyan("\n  cliper auth github\n"));
        console.log(chalk.gray("  Enter your GitHub Personal Access Token.\n"));

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(chalk.white("  GitHub Token: "), (token) => {

            rl.close();

            saveGithubToken(token);

            console.log(
                chalk.green("\n  ✓ GitHub authentication saved.\n")
            );

        });

        return;

    }


    if (provider) {
        console.log(
            chalk.red(`Unknown provider: ${provider}`)
        );
        return;
    }

    // Existing Cliper browser auth
    console.log(chalk.bold.cyan("\n  cliper auth\n"));
    console.log(chalk.gray("  Opening browser to authenticate...\n"));

    const { default: open } = await import("open");
    await open(AUTH_URL);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(chalk.white("  Paste your token here: "), (token) => {
        rl.close();
        const config = loadConfig();

        config.cliper = {
            token: token.trim()
        };

        saveConfig(config);
        console.log(chalk.green("\n  ✓ Authenticated. You can now use cliper push and cliper view.\n"));
    });
}

export function getAuthToken(): string | null {
    return loadConfig().cliper?.token ?? null;
}





