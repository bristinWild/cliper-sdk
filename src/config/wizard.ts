import * as readline from "readline";
import { loadConfig, saveConfig } from "./loader";
import chalk from "chalk";
import { loadConfig as loadFullConfig } from "./config";

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

export async function configureCognee(): Promise<void> {
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("        Configure Cognee");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("You will need:");
    console.log("• Cognee Base URL");
    console.log("• Cognee API Key");
    console.log("");
    console.log("You can find both in your Cognee Cloud dashboard.");
    console.log("");

    const config = loadConfig();

    if (config.cognee) {
        console.log("Existing configuration detected.");
        console.log("Leave a field blank to keep its current value.");
        console.log("");
    }

    const baseUrl = await ask("Cognee Base URL: ");
    const apiKey = await ask("Cognee API Key: ");

    const finalBaseUrl =
        baseUrl || config.cognee?.baseUrl || "";

    const finalApiKey =
        apiKey || config.cognee?.apiKey || "";

    if (!finalBaseUrl) {
        console.log("");
        throw new Error("Cognee Base URL is required.");
    }

    if (!finalApiKey) {
        console.log("");
        throw new Error("Cognee API Key is required.");
    }

    config.cognee = {
        baseUrl: finalBaseUrl,
        apiKey: finalApiKey,
    };

    saveConfig(config);

    // Sync Cognee credentials to the Cliper backend (per-user storage)
    try {
        const fullConfig = loadFullConfig();
        const githubToken = fullConfig.github?.token;
        if (githubToken) {


            const API_URL = "http://localhost:4000";
            const res = await fetch(`${API_URL}/auth/cognee`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    baseUrl: finalBaseUrl,
                    apiKey: finalApiKey,
                }),
            });
            if (res.ok) {
                console.log(chalk.green("  ✓ Cognee credentials synced to Cliper cloud"));
            }
        }
    } catch {
        console.log(chalk.gray("  (Saved locally; cloud sync skipped — server may be offline)"));
    }

    console.log("");
    console.log("✔ Cognee configuration saved successfully.");
    console.log("");
    console.log("You can now run:");
    console.log("");
    console.log("  cliper init");
    console.log("");
}