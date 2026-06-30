import { initCommand } from "../commands/init";

export interface CliperInitOptions {
    path: string;
    maxFileSize?: number;
}

export class Cliper {
    async init(options: CliperInitOptions): Promise<void> {
        return initCommand(options);
    }
}