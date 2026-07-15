import { initProject, CliperInitOptions } from "./init";
import { searchProject, CliperSearchOptions } from "./search";

export class Cliper {
    async init(options: CliperInitOptions) {
        return initProject(options);
    }

    async search(options: CliperSearchOptions) {
        return searchProject(options);
    }
}