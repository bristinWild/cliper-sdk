import * as fs from "fs";
import * as path from "path";
import ignore from "ignore";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "coverage", ".cache", "__pycache__", ".pytest_cache", "vendor",
  ".cliper",
]);

interface TreeNode {
  name: string;
  isDir: boolean;
  children?: TreeNode[];
  inScope: boolean;
  watched: boolean;
  relativePath: string;
  modifiedAt?: Date;
}

function loadGitignore(projectRoot: string) {
  const ig = ignore();
  const gitignorePath = path.join(projectRoot, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, "utf-8"));
  }
  return ig;
}

function getModifiedTime(filePath: string): Date | undefined {
  try {
    return fs.statSync(filePath).mtime;
  } catch {
    return undefined;
  }
}

function buildTree(
  dirPath: string,
  projectRoot: string,
  activeScope: string[],
  watchedScope: string[],
  ig: ReturnType<typeof ignore>,
  depth = 0,
  maxDepth = 4
): TreeNode[] {
  if (depth > maxDepth) return [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(projectRoot, fullPath);

    if (IGNORE_DIRS.has(entry.name)) continue;
    if (ig.ignores(relativePath)) continue;
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;

    const inScope = activeScope.some(
      (s) => relativePath.startsWith(s) || s.startsWith(relativePath)
    );
    const watched = watchedScope.some(
      (s) => relativePath.startsWith(s) || relativePath === s
    );

    const node: TreeNode = {
      name: entry.name,
      isDir: entry.isDirectory(),
      inScope,
      watched,
      relativePath,
      modifiedAt: entry.isFile() ? getModifiedTime(fullPath) : undefined,
    };

    if (entry.isDirectory()) {
      node.children = buildTree(
        fullPath, projectRoot, activeScope, watchedScope, ig, depth + 1, maxDepth
      );
    }

    nodes.push(node);
  }

  return nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function renderTree(nodes: TreeNode[], prefix = "", isRoot = false): string {
  const lines: string[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = prefix + (isLast ? "    " : "│   ");

    let annotation = "";
    if (node.inScope) annotation += " ← ACTIVE SCOPE";
    else if (node.watched) annotation += " ← WATCHED";

    let timeAnnotation = "";
    if (node.modifiedAt && !node.isDir) {
      timeAnnotation = ` (${formatTimeAgo(node.modifiedAt)})`;
    }

    if (node.isDir && !node.inScope && !node.watched && !isRoot) {
      const childCount = node.children?.length ?? 0;
      lines.push(`${prefix}${connector}${node.name}/${annotation || ` ← out of scope (${childCount} items)`}`);
    } else {
      lines.push(`${prefix}${connector}${node.name}${node.isDir ? "/" : ""}${annotation}${timeAnnotation}`);
      if (node.children && node.children.length > 0 && (node.inScope || node.watched || isRoot)) {
        lines.push(renderTree(node.children, childPrefix));
      }
    }
  }

  return lines.filter(Boolean).join("\n");
}

export function generateFileTree(
  projectRoot: string,
  activeScope: string[],
  watchedScope: string[]
): string {
  const ig = loadGitignore(projectRoot);
  const projectName = path.basename(projectRoot);
  const nodes = buildTree(projectRoot, projectRoot, activeScope, watchedScope, ig, 0);
  const tree = renderTree(nodes, "", true);
  return `${projectName}/\n${tree}`;
}
