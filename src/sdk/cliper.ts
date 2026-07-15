import { initProject, CliperInitOptions } from "./init";

export class Cliper {
    async init(options: CliperInitOptions): Promise<void> {
        return initProject(options);
    }
}