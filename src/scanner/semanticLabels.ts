import { FileContent } from "./fileContent";

export interface SemanticLabel {
    file: string;

    language: string;

    layer: string;

    role: string;

    framework?: string;

    runtime?: string;

    tags: string[];
}


function detectLanguage(file: string): string {

    if (file.endsWith(".ts"))
        return "typescript";

    if (file.endsWith(".tsx"))
        return "typescript-react";

    if (file.endsWith(".js"))
        return "javascript";

    if (file.endsWith(".rs"))
        return "rust";

    if (file.endsWith(".py"))
        return "python";

    if (file.endsWith(".go"))
        return "go";

    return "unknown";

}

function detectLayer(file: string): string {

    if (file.includes("/commands/"))
        return "command";

    if (file.includes("/scanner/"))
        return "scanner";

    if (file.includes("/providers/"))
        return "provider";

    if (file.includes("/resolver/"))
        return "resolver";

    if (file.includes("/context/"))
        return "context";

    if (file.includes("/scope/"))
        return "scope";

    if (file.includes("/gaps/"))
        return "gap-detection";

    if (file.includes("/sdk/"))
        return "sdk";

    if (file.includes("/api/"))
        return "api";

    if (file.includes("/services/"))
        return "service";

    if (file.includes("/controllers/"))
        return "controller";

    if (file.includes("/models/"))
        return "model";

    if (file.includes("/utils/"))
        return "utility";

    return "unknown";

}


function detectRole(
    file: FileContent
): string {

    const path = file.relativePath;
    const content = file.content;

    // Entry point
    if (path === "src/index.ts") {
        return "entry-point";
    }

    // CLI Commands
    if (path.includes("/commands/")) {
        return "cli-command";
    }

    // Scanners
    if (content.includes("extractFileContents"))
        return "file-scanner";

    if (content.includes("generateFileTree"))
        return "tree-scanner";

    if (content.includes("getGitContext"))
        return "git-scanner";

    if (content.includes("buildDependencyMap"))
        return "dependency-scanner";

    // Providers
    if (content.includes("rememberContext"))
        return "memory-provider";

    if (content.includes("recallContext"))
        return "memory-provider";

    // Context
    if (content.includes("buildContextDoc"))
        return "context-builder";

    // Gap detection
    if (content.includes("detectGaps"))
        return "gap-detector";

    // SDK
    if (path.includes("/sdk/"))
        return "sdk";

    return "general";
}

function detectFramework(
    content: string
): string | undefined {

    if (content.includes("from \"commander\"") ||
        content.includes("from 'commander'")) {
        return "commander";
    }

    if (content.includes("from \"express\"") ||
        content.includes("from 'express'")) {
        return "express";
    }

    if (content.includes("@nestjs")) {
        return "nestjs";
    }

    if (content.includes("react")) {
        return "react";
    }

    if (content.includes("next/")) {
        return "nextjs";
    }

    if (content.includes("@coral-xyz/anchor")) {
        return "anchor";
    }

    if (content.includes("@solana/web3.js")) {
        return "solana";
    }

    if (content.includes("mongoose")) {
        return "mongoose";
    }

    if (content.includes("typeorm")) {
        return "typeorm";
    }

    if (content.includes("prisma")) {
        return "prisma";
    }

    if (content.includes("simple-git")) {
        return "simple-git";
    }

    return undefined;
}

function detectRuntime(
    content: string
): string | undefined {

    if (
        content.includes("process.") ||
        content.includes("node:")
    ) {
        return "node";
    }

    if (
        content.includes("window.") ||
        content.includes("document.")
    ) {
        return "browser";
    }

    if (
        content.includes("Deno.")
    ) {
        return "deno";
    }

    if (
        content.includes("Bun.")
    ) {
        return "bun";
    }

    return undefined;
}

function buildTags(
    file: FileContent
): string[] {

    const tags = new Set<string>();

    tags.add(detectLanguage(file.relativePath));

    tags.add(detectLayer(file.relativePath));

    tags.add(detectRole(file));

    const framework = detectFramework(file.content);

    if (framework) {
        tags.add(framework);
    }

    const runtime = detectRuntime(file.content);

    if (runtime) {
        tags.add(runtime);
    }

    if (file.relativePath.includes("test")) {
        tags.add("test");
    }

    if (file.relativePath.includes("spec")) {
        tags.add("test");
    }

    if (file.relativePath.endsWith(".md")) {
        tags.add("documentation");
    }

    if (file.relativePath.includes("package.json")) {
        tags.add("configuration");
    }

    if (file.relativePath.includes("tsconfig")) {
        tags.add("configuration");
    }

    if (file.relativePath.startsWith("docs/")) {
        tags.add("documentation");
    }

    return [...tags];

}


export function buildSemanticLabels(
    files: FileContent[]
): SemanticLabel[] {

    return files.map(file => {

        return {
            file: file.relativePath,

            language: detectLanguage(file.relativePath),

            layer: detectLayer(file.relativePath),

            role: detectRole(file),

            framework: detectFramework(file.content),

            runtime: detectRuntime(file.content),

            tags: buildTags(file)
        };

    });

}