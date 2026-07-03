import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CliperCogneeConfigx } from "./config";

const CONFIG_DIR = path.join(os.homedir(), ".cliper");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function loadConfig(): CliperCogneeConfigx {
    if (!fs.existsSync(CONFIG_FILE)) {
        return {};
    }

    return JSON.parse(
        fs.readFileSync(CONFIG_FILE, "utf8")
    ) as CliperCogneeConfigx;
}

export function saveConfig(config: CliperCogneeConfigx): void {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(config, null, 2),
        "utf8"
    );
}

export function getConfigPath(): string {
    return CONFIG_FILE;
}