import { loadConfig, saveConfig } from "../config/config"
import chalk from "chalk";

export function getGithubToken(): string | null {

    return loadConfig().github?.token ?? null;

}

export function saveGithubToken(
    token: string
): void {

    const config = loadConfig();

    config.github = {
        token: token.trim()
    };

    saveConfig(config);

}

export function hasGithubAuth(): boolean {

    return getGithubToken() !== null;

}

export function getGithubHeaders(): Record<string, string> {

    const token = getGithubToken();

    if (!token) {
        console.log(
            chalk.yellow(
                "\nGitHub not authenticated.\nRun:\n\n  cliper auth github\n"
            )
        );
    }

    const headers: Record<string, string> = {
        Accept: "application/vnd.github+json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;

}
