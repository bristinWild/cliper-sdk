import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import chalk from "chalk";
import * as readline from "readline";

const AUTH_FILE = path.join(os.homedir(), ".cliper", "auth");
const AUTH_URL = "https://cliperhq.vercel.app/auth/cli";

export async function authCommand(): Promise<void> {
    console.log(chalk.bold.cyan("\n  cliper auth\n"));
    console.log(chalk.gray("  Opening browser to authenticate...\n"));

    const { default: open } = await import("open");
    await open(AUTH_URL);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(chalk.white("  Paste your token here: "), (token) => {
        rl.close();
        const dir = path.dirname(AUTH_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(AUTH_FILE, JSON.stringify({ token: token.trim() }), { mode: 0o600 });
        console.log(chalk.green("\n  ✓ Authenticated. You can now use cliper push and cliper view.\n"));
    });
}

export function getAuthToken(): string | null {
    try {
        if (!fs.existsSync(AUTH_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
        return data.token ?? null;
    } catch {
        return null;
    }
}