import { initProject, CliperInitOptions } from "./init";

import {
    searchProject,
    searchProjectStructured,
    CliperSearchOptions
} from "./search";

import { SearchResult } from "./searchResult";


export class Cliper {
    async init(options: CliperInitOptions) {
        return initProject(options);
    }

    async search(
        options: CliperSearchOptions,
    ): Promise<string> {
        return searchProject(options);
    }

    async searchStructured(
        options: CliperSearchOptions,
    ): Promise<SearchResult> {
        return searchProjectStructured(options);
    }


}