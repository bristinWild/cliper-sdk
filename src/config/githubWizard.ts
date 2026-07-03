import * as readline from "readline";
import chalk from "chalk";
import { saveGithubToken } from "../auth/github";
import { verifyCliAuth } from "../api/backend";



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

export async function configureGithub(): Promise<void> {
    console.log(chalk.bold.cyan("\nConfigure GitHub\n"));

    const token = await ask("GitHub Personal Access Token: ");
    saveGithubToken(token);

    try {
        const { username } = await verifyCliAuth(token.trim());
        console.log(chalk.green(`\n✓ Signed in as ${username} — user registered with Cliper.\n`));
    } catch (err: any) {
        console.log(chalk.red(`\n✖ Token saved locally, but backend verification failed: ${err.message}`));
        console.log(chalk.gray("  Is the Cliper server running on " + "http://localhost:4000?\n"));
    }
}