import chalk from "chalk";
import ora from "ora";
import * as dotenv from "dotenv";
import { execSync } from "child_process";
import WebSocket from "ws";
import { getGithubToken } from "../auth/github";

const WS_URL = "ws://localhost:4000/ws";

/** Which coding agents are installed on this machine? */
function detectAgents(): string[] {
    const candidates = [
        { bin: "claude", name: "Claude Code" },
        { bin: "codex", name: "Codex CLI" },
        { bin: "cursor-agent", name: "Cursor Agent" },
    ];
    return candidates
        .filter(({ bin }) => {
            try {
                execSync(`which ${bin}`, { stdio: "ignore" });
                return true;
            } catch {
                return false;
            }
        })
        .map(({ name }) => name);
}

export async function agentCommand(action?: string): Promise<void> {
    dotenv.config();
    if (action !== "connect") {
        console.log(chalk.red(`Unknown action: ${action ?? "(none)"} — try: cliper agent connect`));
        return;
    }

    const token = getGithubToken();
    if (!token) {
        console.log(chalk.yellow("Not authenticated. Run: cliper auth github"));
        return;
    }

    console.log(chalk.bold.cyan("\n  cliper agent\n"));

    const agents = detectAgents();
    if (agents.length === 0) {
        console.log(chalk.yellow("  ⚠ No coding agents detected (looked for claude, codex, cursor-agent)"));
    } else {
        agents.forEach((a) => console.log(chalk.green(`  ✓ ${a} detected`)));
    }

    const spinner = ora("Connecting to Cliper cloud...").start();

    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
        const ws = new WebSocket(WS_URL, {
            headers: { Authorization: `Bearer ${token}` },
        });

        ws.on("open", () => {
            spinner.succeed(chalk.green("Connected to Cliper cloud"));
            ws.send(JSON.stringify({ type: "agent:register", agents }));
            console.log(chalk.gray("\n  Agent is online. Your phone can now see this machine."));
            console.log(chalk.gray("  Waiting for tasks... (Ctrl+C to disconnect)\n"));
            heartbeat = setInterval(() => ws.ping(), 20_000);
        });

        ws.on("message", (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "task") {
                    console.log(chalk.bold.magenta(`  → Task received: ${msg.prompt}`));
                    console.log(chalk.gray("    (execution pipeline coming soon — acknowledging)"));
                    ws.send(JSON.stringify({ type: "task:ack", taskId: msg.taskId }));
                }
            } catch {
                /* ignore malformed frames */
            }
        });

        ws.on("close", () => {
            if (heartbeat) clearInterval(heartbeat);
            console.log(chalk.yellow("\n  Disconnected — retrying in 3s..."));
            setTimeout(connect, 3000);
        });

        ws.on("error", (err) => {
            spinner.fail(chalk.red(`Connection failed: ${err.message}`));
            // 'close' fires after 'error' and handles the retry.
        });
    };

    connect();
}