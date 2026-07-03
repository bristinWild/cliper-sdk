import fs from "fs";
import os from "os";
import path from "path";

export const CLIPER_DIR =
    path.join(os.homedir(), ".cliper");

export const CONFIG_FILE =
    path.join(CLIPER_DIR, "config.json");

export interface CliperConfig {
    github?: {
        token: string;
    };

    cognee?: {
        baseUrl: string;
        apiKey: string;
    };
}

export interface CliperCogneeConfigx {
    cognee?: {
        baseUrl: string;
        apiKey: string;
    };
}

export function loadConfig(): CliperConfig {

    if (!fs.existsSync(CONFIG_FILE)) {
        return {};
    }

    try {
        return JSON.parse(
            fs.readFileSync(CONFIG_FILE, "utf8")
        );
    } catch {
        return {};
    }

}

export function saveConfig(
    config: CliperConfig
): void {

    if (!fs.existsSync(CLIPER_DIR)) {
        fs.mkdirSync(CLIPER_DIR, {
            recursive: true
        });
    }

    fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(config, null, 2),
        { mode: 0o600 }
    );

}

