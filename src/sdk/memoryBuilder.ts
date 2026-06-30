import * as path from "path";
import { MemoryObject } from "./memory/memory";
import { GitContext } from "../scanner/gitContext";
import { FileContent } from "../scanner/fileContent";
import { DependencyMap } from "../scanner/dependencies"
import { Gap } from "../gaps/detector";
import simpleGit from "simple-git";


interface FileSummary {
    path: string;
    category: string;
    purpose: string;

    exports: string[];
    imports: string[];

    responsibilities: string[];
    externalPackages: string[];
}

interface BuildMemoryOptions {
    projectRoot: string;
    projectName: string;

    files: FileContent[];
    gaps: Gap[];
    dependencyMap: DependencyMap;
    gitContext: GitContext;
}

interface CommitSummary {
    hash: string;
    author: string;
    message: string;
    timeAgo: string;
    filesChanged: string[];
}

interface RepositorySummary {
    name: string;
    root: string;

    language: string;

    entryPoint?: string;

    fileCount: number;
    dependencyCount: number;
    externalPackageCount: number;

    branch?: string;

    modules: string[];
}

interface ReleaseSummary {
    tag: string;
    commit: string;
    date: string;
    message: string;
}

export class MemoryBuilder {

    buildGitMemory(
        projectName: string,
        gitContext: GitContext
    ): MemoryObject[] {

        if (!gitContext.isGitRepo) {
            return [];
        }

        return [{
            id: "git-context",
            type: "git",
            title: "Git Context",
            content: `
Project: ${projectName}
Branch: ${gitContext.branch}
Latest Commit:
${gitContext.lastCommit?.message ?? "None"}
`.trim(),
            metadata: {
                branch: gitContext.branch
            }
        }];
    }

    extractExports(content: string): string[] {
        const exports = new Set<string>();

        const patterns = [
            /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
            /export\s+class\s+([A-Za-z0-9_]+)/g,
            /export\s+const\s+([A-Za-z0-9_]+)/g,
            /export\s+interface\s+([A-Za-z0-9_]+)/g,
            /export\s+type\s+([A-Za-z0-9_]+)/g,
        ];

        for (const pattern of patterns) {
            for (const match of content.matchAll(pattern)) {
                exports.add(match[1]);
            }
        }

        return [...exports];
    }

    inferPurpose(filePath: string): string {
        const name = path.basename(filePath, path.extname(filePath));
        if (filePath === "src/index.ts") {
            return "Entry point for the Cliper CLI";
        }

        const purposeMap: Record<string, string> = {
            init: "Initialize repository analysis and context generation",
            sync: "Synchronize repository state",
            status: "Display repository status information",
            scope: "Manage repository scope configuration",
            auth: "Handle authentication workflows",
            export: "Export repository context",
            analyze: "Analyze repository structure and intelligence",
            dependencies: "Build dependency relationships",
            gitContext: "Collect git repository information",
            fileTree: "Generate repository file tree",
            fileContent: "Extract file contents",
            urlFetcher: "Fetch and resolve external references",
            detector: "Detect repository gaps and missing information",
            builder: "Build repository context documents",
            client: "Communicate with Cognee services",
        };

        return (
            purposeMap[name] ??
            `Provide functionality related to ${name}`
        );
    }

    inferResponsibilities(
        file: FileContent
    ): string[] {

        const responsibilities: string[] = [];

        const content = file.content;

        if (content.includes("generateFileTree")) {
            responsibilities.push("Build repository file tree");
        }

        if (content.includes("extractFileContents")) {
            responsibilities.push("Extract file contents");
        }

        if (content.includes("getGitContext")) {
            responsibilities.push("Collect git metadata");
        }

        if (content.includes("detectGaps")) {
            responsibilities.push("Detect repository gaps");
        }

        if (content.includes("buildContextDoc")) {
            responsibilities.push("Generate repository context");
        }

        if (content.includes("rememberContext")) {
            responsibilities.push("Sync memories to Cognee");
        }

        if (content.includes("buildDependencyMap")) {
            responsibilities.push("Build dependency graph");
        }

        return responsibilities;
    }

    getFileCategory(filePath: string): string {

        if (filePath === "src/index.ts") {
            return "CLI Entry Point";
        }

        if (filePath.includes("/commands/")) {
            return "CLI Command";
        }

        if (filePath.includes("/scanner/")) {
            return "Repository Scanner";
        }

        if (filePath.includes("/resolver/")) {
            return "Reference Resolver";
        }

        if (filePath.includes("/scope/")) {
            return "Scope Management";
        }

        if (filePath.includes("/gaps/")) {
            return "Gap Detection";
        }

        if (filePath.includes("/context/")) {
            return "Context Builder";
        }

        if (filePath.includes("/cognee/")) {
            return "Cognee Integration";
        }

        return "Project File";
    }

    extractExternalPackages(
        content: string
    ): string[] {

        const packages = new Set<string>();

        const importRegex =
            /from\s+["']([^"']+)["']/g;

        const requireRegex =
            /require\(["']([^"']+)["']\)/g;

        for (const match of content.matchAll(importRegex)) {
            const pkg = match[1];

            if (
                !pkg.startsWith(".") &&
                !pkg.startsWith("/")
            ) {
                packages.add(pkg);
            }
        }

        for (const match of content.matchAll(requireRegex)) {
            const pkg = match[1];

            if (
                !pkg.startsWith(".") &&
                !pkg.startsWith("/")
            ) {
                packages.add(pkg);
            }
        }

        return [...packages];
    }

    buildFileSummary(
        file: FileContent,
        dependencyMap: DependencyMap
    ): FileSummary {

        const imports = dependencyMap.edges
            .filter(edge => edge.from === file.relativePath)
            .map(edge => edge.to);

        return {
            path: file.relativePath,
            category: this.getFileCategory(file.relativePath),
            purpose: this.inferPurpose(file.relativePath),

            exports: this.extractExports(file.content),
            imports,

            responsibilities: this.inferResponsibilities(file),

            externalPackages:
                this.extractExternalPackages(
                    file.content
                )
        };
    }

    private async buildCommitSummaries(
        projectRoot: string,
        gitContext: GitContext
    ): Promise<CommitSummary[]> {

        if (!gitContext.isGitRepo) {
            return [];
        }

        const git = simpleGit(projectRoot);

        const commits: CommitSummary[] = [];

        if (gitContext.lastCommit) {

            commits.push({

                hash: gitContext.lastCommit.hash,
                author: gitContext.lastCommit.author,
                message: gitContext.lastCommit.message,
                timeAgo: gitContext.lastCommit.timeAgo,

                filesChanged: await this.getFilesChangedForCommit(
                    git,
                    gitContext.lastCommit.hash
                )
            });

        }

        for (const commit of gitContext.recentCommits) {

            commits.push({

                hash: commit.hash,
                author: commit.author,
                message: commit.message,
                timeAgo: commit.timeAgo,

                filesChanged: await this.getFilesChangedForCommit(
                    git,
                    commit.hash
                )

            });

        }

        return commits;
    }

    async buildCommitMemories(
        projectRoot: string,
        gitContext: GitContext
    ): Promise<MemoryObject[]> {

        const commits =
            await this.buildCommitSummaries(
                projectRoot,
                gitContext
            );

        return commits.map(commit => ({

            id: commit.hash,

            type: "commit",

            title: commit.message,

            content: `
Commit:
${commit.hash}

Author:
${commit.author}

Message:
${commit.message}

Files Changed:
${commit.filesChanged.join("\n")}

Time:
${commit.timeAgo}
        `.trim(),

            metadata: {
                hash: commit.hash,
                author: commit.author,
                timeAgo: commit.timeAgo,
            },

            tags: ["git", "commit"],

            relationships: commit.filesChanged,

        }));
    }


    buildFileMemories(
        files: FileContent[],
        dependencyMap: DependencyMap
    ): MemoryObject[] {

        return files.map(file => {

            const summary = this.buildFileSummary(
                file,
                dependencyMap
            );

            return {

                id: summary.path,

                type: "file",

                title: summary.path,

                content: this.buildFileSummaryContent(summary),

                metadata: summary,

                tags: [
                    summary.category
                ],

                relationships: summary.imports

            };

        });

    }


    private buildFileSummaryContent(
        summary: FileSummary
    ): string {

        return `
        File: ${summary.path}

        Category:
        ${summary.category}

        Purpose:
        ${summary.purpose}

        Responsibilities:
        ${summary.responsibilities.join(", ") || "None"}

        Exports:
        ${summary.exports.join(", ") || "None"}

        Imports:
        ${summary.imports.join(", ") || "None"}

        External Packages:
        ${summary.externalPackages.join(", ") || "None"}
        `.trim();

    }


    buildDependencyMemories(
        dependencyMap: DependencyMap
    ): MemoryObject[] {

        return dependencyMap.edges.map(edge => ({

            id: `${edge.from}->${edge.to}`,

            type: "dependency",

            title: `${edge.from} imports ${edge.to}`,

            content: `
    ${edge.from}
    imports
    ${edge.to}
    `.trim(),

            metadata: edge,

            tags: [
                "dependency"
            ],

            relationships: [
                edge.from,
                edge.to
            ]

        }));

    }

    buildExternalPackageMemories(
        dependencyMap: DependencyMap
    ): MemoryObject[] {

        return dependencyMap.externalPackages.map(pkg => ({

            id: `package:${pkg}`,

            type: "package",

            title: pkg,

            content: `
        External Package

        ${pkg}
        `.trim(),

            metadata: {
                package: pkg
            },

            tags: [
                "package"
            ],

            relationships: []

        }));

    }

    buildGapMemories(
        gaps: Gap[]
    ): MemoryObject[] {

        return gaps.map(gap => ({

            id: `${gap.file}:${gap.line ?? 0}`,

            type: "gap",

            title: gap.description,

            content: `
            File:
            ${gap.file}

            Severity:
            ${gap.severity}

            Type:
            ${gap.type}

            Description:
            ${gap.description}

            Line:
            ${gap.line ?? "Unknown"}
        `.trim(),

            metadata: gap,

            tags: [
                "gap",
                gap.severity,
                gap.type
            ],

            relationships: [
                gap.file
            ]

        }));

    }

    buildArchitectureMemories(
        dependencyMap: DependencyMap
    ): MemoryObject[] {

        const grouped = new Map<string, Set<string>>();

        for (const edge of dependencyMap.edges) {

            if (!grouped.has(edge.from)) {
                grouped.set(edge.from, new Set());
            }

            grouped.get(edge.from)!.add(edge.to);

        }

        return [...grouped.entries()].map(([module, imports]) => ({

            id: module,

            type: "architecture",

            title: module,

            content: `
            Module:
            ${module}

            Depends on:
            ${[...imports].join("\n")}
            `.trim(),

            metadata: {
                module,
                imports: [...imports]
            },

            tags: ["architecture"],

            relationships: [...imports]

        }));

    }


    buildResponsibilityMemories(
        files: FileContent[]
    ): MemoryObject[] {

        const memories: MemoryObject[] = [];

        for (const file of files) {

            const responsibilities =
                this.inferResponsibilities(file);

            for (const responsibility of responsibilities) {

                memories.push({

                    id: `${file.relativePath}:${responsibility}`,

                    type: "responsibility",

                    title: responsibility,

                    content: `
Responsibility:
${responsibility}

Owner:
${file.relativePath}
`.trim(),

                    metadata: {
                        responsibility,
                        owner: file.relativePath
                    },

                    tags: [
                        "responsibility"
                    ],

                    relationships: [
                        file.relativePath
                    ]

                });

            }

        }

        return memories;

    }

    private async getFilesChangedForCommit(
        git: ReturnType<typeof simpleGit>,
        hash: string
    ): Promise<string[]> {

        const output = await git.show([
            "--name-only",
            "--pretty=format:",
            hash,
        ]);

        return output
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);
    }

    private buildRepositorySummary(
        options: BuildMemoryOptions
    ): RepositorySummary {

        const modules = new Set<string>();

        for (const file of options.files) {

            const parts = file.relativePath.split("/");

            if (parts.length > 1) {
                modules.add(parts[1]);
            }

        }

        return {

            name: options.projectName,

            root: options.projectRoot,

            language: "TypeScript",

            entryPoint: options.files.find(
                f => f.relativePath === "src/index.ts"
            )?.relativePath,

            fileCount: options.files.length,

            dependencyCount:
                options.dependencyMap.edges.length,

            externalPackageCount:
                options.dependencyMap.externalPackages.length,

            branch:
                options.gitContext.branch,

            modules: [...modules].sort()

        };

    }

    buildRepositoryMemory(
        options: BuildMemoryOptions
    ): MemoryObject[] {

        const repo =
            this.buildRepositorySummary(options);

        return [{

            id: repo.name,

            type: "repository",

            title: repo.name,

            content: `
                Repository:
                ${repo.name}

                Language:
                ${repo.language}

                Entry Point:
                ${repo.entryPoint ?? "Unknown"}

                Files:
                ${repo.fileCount}

                Dependencies:
                ${repo.dependencyCount}

                External Packages:
                ${repo.externalPackageCount}

                Branch:
                ${repo.branch ?? "Unknown"}

                Modules:
                ${repo.modules.join("\n")}
                `.trim(),

            metadata: repo,

            tags: [
                "repository"
            ],

            relationships: [

                "git-context",

                repo.entryPoint ?? "",

                "package.json",

                "README.md"

            ].filter(Boolean)

        }];

    }


    private async buildReleaseSummaries(
        projectRoot: string,
        gitContext: GitContext
    ): Promise<ReleaseSummary[]> {

        if (!gitContext.isGitRepo) {
            return [];
        }

        const git = simpleGit(projectRoot);

        const tags = await git.tags();

        const releases: ReleaseSummary[] = [];

        for (const tag of tags.all) {

            const output = await git.raw([
                "show",
                "--quiet",
                "--format=%H%n%cI%n%s",
                tag
            ]);

            const [commit, date, message] =
                output.trim().split("\n");

            releases.push({
                tag,
                commit,
                date,
                message
            });
        }

        return releases;
    }


    async buildReleaseMemories(
        projectRoot: string,
        gitContext: GitContext
    ): Promise<MemoryObject[]> {

        const releases =
            await this.buildReleaseSummaries(
                projectRoot,
                gitContext
            );

        return releases.map(release => ({

            id: `release:${release.tag}`,

            type: "release",

            title: release.tag,

            content: `
Release:
${release.tag}

Commit:
${release.commit}

Date:
${release.date}

Message:
${release.message}
        `.trim(),

            metadata: release,

            tags: [
                "release"
            ],

            relationships: [
                release.commit
            ]

        }));

    }

    async build(
        options: BuildMemoryOptions
    ): Promise<MemoryObject[]> {

        const memories: MemoryObject[] = [];

        memories.push(
            ...this.buildGitMemory(
                options.projectName,
                options.gitContext
            )
        );

        memories.push(
            ...this.buildFileMemories(
                options.files,
                options.dependencyMap
            )
        );

        memories.push(
            ...this.buildDependencyMemories(
                options.dependencyMap
            )
        );

        memories.push(
            ...this.buildExternalPackageMemories(
                options.dependencyMap
            )
        );


        memories.push(
            ...await this.buildCommitMemories(
                options.projectRoot,
                options.gitContext
            )
        );
        memories.push(
            ...this.buildGapMemories(
                options.gaps
            )
        );

        memories.push(
            ...this.buildArchitectureMemories(
                options.dependencyMap
            )
        );

        memories.push(
            ...this.buildResponsibilityMemories(
                options.files
            )
        );

        memories.push(
            ...this.buildRepositoryMemory(options)
        );

        memories.push(
            ...await this.buildReleaseMemories(
                options.projectRoot,
                options.gitContext
            )
        );

        return memories;
    }



}