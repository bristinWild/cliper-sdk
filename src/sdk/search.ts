import * as fs from "fs";
import * as path from "path";
import { LocalJsonProvider } from "../providers/local-json/provider";

export interface CliperSearchOptions {
    path: string;
    query: string;
}

export async function searchProject(options: CliperSearchOptions) {
    const provider = new LocalJsonProvider();

    const metadataPath = path.join(
        options.path,
        ".cliper",
        "metadata.json",
    );

    if (!fs.existsSync(metadataPath)) {
        throw new Error(
            "Repository is not initialized. Run `cliper init` first."
        );
    }

    const metadata = JSON.parse(
        fs.readFileSync(metadataPath, "utf8")
    );

    return provider.search(
        metadata.projectName,
        options.query,
        options.path,
    );
}