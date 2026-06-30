import * as fs from "fs";
import * as path from "path";
import { FileContent } from "./fileContent";

export interface DependencyEdge {
    from: string;
    to: string;
    type: "import" | "require" | "use" | "mod";
}

export interface DependencyMap {
    edges: DependencyEdge[];
    externalPackages: string[];
    entryPoints: string[];
}

function extractJSImports(file: FileContent): { internal: string[]; external: string[] } {
    const internal: string[] = [];
    const external: string[] = [];

    const patterns = [
        /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
        /require\(['"]([^'"]+)['"]\)/g,
        /import\(['"]([^'"]+)['"]\)/g,
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(file.content)) !== null) {
            const dep = match[1];
            if (dep.startsWith(".") || dep.startsWith("/")) {
                const dir = path.dirname(file.relativePath);
                const resolved = path.normalize(path.join(dir, dep));
                internal.push(resolved);
            } else if (dep.startsWith("@/")) {
                // TS path alias (e.g. "@/*": ["./*"]) — internal, not an npm scoped package
                internal.push(dep.slice(2));
            } else {
                const pkgName = dep.startsWith("@")
                    ? dep.split("/").slice(0, 2).join("/")
                    : dep.split("/")[0];
                external.push(pkgName);
            }
        }
    }

    return { internal, external };
}

function extractRustImports(file: FileContent): { internal: string[]; external: string[] } {
    const internal: string[] = [];
    const external: string[] = [];

    const usePattern = /^use\s+([\w:]+)/gm;
    const modPattern = /^(?:pub\s+)?mod\s+(\w+)/gm;

    let match;
    while ((match = usePattern.exec(file.content)) !== null) {
        const dep = match[1];
        if (dep.startsWith("crate::") || dep.startsWith("super::") || dep.startsWith("self::")) {
            internal.push(dep.replace(/^(crate|super|self)::/, ""));
        } else {
            external.push(dep.split("::")[0]);
        }
    }

    while ((match = modPattern.exec(file.content)) !== null) {
        internal.push(match[1]);
    }

    return { internal, external };
}

function extractPythonImports(file: FileContent): { internal: string[]; external: string[] } {
    const internal: string[] = [];
    const external: string[] = [];

    const relPattern = /^from\s+(\.+[\w.]*)\s+import/gm;
    const absPatterns = [
        /^import\s+([\w.]+)/gm,
        /^from\s+([\w.]+)\s+import/gm,
    ];

    let match;
    while ((match = relPattern.exec(file.content)) !== null) {
        internal.push(match[1]);
    }

    for (const pattern of absPatterns) {
        while ((match = pattern.exec(file.content)) !== null) {
            external.push(match[1].split(".")[0]);
        }
    }

    return { internal, external };
}

function getExtractor(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    if ([".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext)) return extractJSImports;
    if (ext === ".rs") return extractRustImports;
    if (ext === ".py") return extractPythonImports;
    return null;
}

function isEntryPoint(filePath: string): boolean {
    const name = path.basename(filePath);
    return [
        "index.ts", "index.js", "main.ts", "main.js",
        "main.rs", "lib.rs",
        "main.py", "__init__.py",
        "main.go",
    ].includes(name);
}

export function buildDependencyMap(files: FileContent[]): DependencyMap {
    const edges: DependencyEdge[] = [];
    const externalSet = new Set<string>();
    const entryPoints: string[] = [];

    for (const file of files) {
        if (file.truncated) continue;

        const extractor = getExtractor(file.relativePath);
        if (!extractor) continue;

        if (isEntryPoint(file.relativePath)) {
            entryPoints.push(file.relativePath);
        }

        const { internal, external } = extractor(file);

        for (const dep of internal) {
            edges.push({
                from: file.relativePath,
                to: dep,
                type: file.relativePath.endsWith(".rs") ? "use" : "import",
            });
        }

        for (const pkg of external) {
            externalSet.add(pkg);
        }
    }

    const seen = new Set<string>();
    const uniqueEdges = edges.filter((e) => {
        const key = `${e.from}→${e.to}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return {
        edges: uniqueEdges,
        externalPackages: Array.from(externalSet).sort(),
        entryPoints,
    };
}

export function formatDependencyMap(map: DependencyMap): string {
    if (map.edges.length === 0 && map.externalPackages.length === 0) {
        return "No dependency information available for scoped files.";
    }

    const lines: string[] = [];

    if (map.entryPoints.length > 0) {
        lines.push("**Entry points:**");
        for (const ep of map.entryPoints) {
            lines.push(`  → ${ep}`);
        }
        lines.push("");
    }

    if (map.edges.length > 0) {
        lines.push("**Internal dependencies:**");
        const byFile = new Map<string, string[]>();
        for (const edge of map.edges) {
            if (!byFile.has(edge.from)) byFile.set(edge.from, []);
            byFile.get(edge.from)!.push(edge.to);
        }
        for (const [from, deps] of byFile) {
            lines.push(`  ${from}`);
            for (const dep of deps.slice(0, 8)) {
                lines.push(`    ↳ ${dep}`);
            }
            if (deps.length > 8) lines.push(`    ↳ ... and ${deps.length - 8} more`);
        }
        lines.push("");
    }

    if (map.externalPackages.length > 0) {
        lines.push("**External packages used:**");
        lines.push(`  ${map.externalPackages.join(", ")}`);
    }

    return lines.join("\n");
}