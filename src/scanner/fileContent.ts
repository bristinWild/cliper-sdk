import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import ignore from "ignore";


const MAX_TOTAL_CHARS = 150_000;

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
  ".pdf", ".zip", ".tar", ".gz", ".exe", ".bin", ".wasm",
  ".ttf", ".woff", ".woff2", ".eot", ".mp4", ".mp3",
]);

const PRIORITY_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go",
  ".java", ".kt", ".swift", ".rb", ".php", ".cs",
  ".json", ".yaml", ".yml", ".toml", ".env.example",
  ".md", ".mdx", ".sql", ".graphql", ".prisma",
];

function isBinary(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function getPriority(filePath: string): number {
  const ext = path.extname(filePath).toLowerCase();
  const idx = PRIORITY_EXTENSIONS.indexOf(ext);
  return idx === -1 ? 999 : idx;
}



export interface FileContent {
  relativePath: string;
  content: string;
  truncated: boolean;
  size: number;
}

export async function extractFileContents(
  projectRoot: string,
  activeScope: string[],
  watchedScope: string[],
  maxFileSizeKB: number = 50
): Promise<FileContent[]> {
  const MAX_FILE_SIZE_BYTES = maxFileSizeKB * 1024;
  const ig = ignore();
  const gitignorePath = path.join(projectRoot, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, "utf-8"));
  }

  const allPaths = new Set<string>();

  // Collect files from active scope and watched scope
  for (const scopePath of [...activeScope, ...watchedScope]) {
    const fullScopePath = path.join(projectRoot, scopePath);
    if (!fs.existsSync(fullScopePath)) continue;

    const stat = fs.statSync(fullScopePath);
    if (stat.isFile()) {
      allPaths.add(scopePath);
    } else if (stat.isDirectory()) {
      const files = await glob("**/*", {
        cwd: fullScopePath,
        nodir: true,
        ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
      });
      for (const f of files) {
        const rel = path.join(scopePath, f);
        if (!ig.ignores(rel)) allPaths.add(rel);
      }
    }
  }

  // Sort by priority, then path to ensure deterministic extraction order.
  const sortedPaths = Array.from(allPaths).sort((a, b) => {
    const priorityDiff = getPriority(a) - getPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return a.localeCompare(b);
  });

  const results: FileContent[] = [];
  let totalChars = 0;

  for (const relativePath of sortedPaths) {
    if (totalChars >= MAX_TOTAL_CHARS) break;
    if (isBinary(relativePath)) continue;

    const fullPath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(fullPath)) continue;

    const stat = fs.statSync(fullPath);
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      results.push({
        relativePath,
        content: `[File too large to include: ${Math.round(stat.size / 1024)}KB]`,
        truncated: true,
        size: stat.size,
      });
      continue;
    }

    try {
      let content = fs.readFileSync(fullPath, "utf-8");
      let truncated = false;

      if (totalChars + content.length > MAX_TOTAL_CHARS) {
        content = content.slice(0, MAX_TOTAL_CHARS - totalChars);
        truncated = true;
      }

      totalChars += content.length;
      results.push({ relativePath, content, truncated, size: stat.size });
    } catch {
      // Skip files that can't be read
    }
  }

  return results;
}
