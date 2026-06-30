import simpleGit from "simple-git";
import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";

// Files always included regardless of scope
const ALWAYS_INCLUDE = [
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "Cargo.toml",
  "Cargo.lock",
  "go.mod",
  "go.sum",
  "requirements.txt",
  "pyproject.toml",
  "README.md",
  ".env.example",
  "docker-compose.yml",
  "Dockerfile",
];

type ProjectType = "rust" | "node" | "python" | "go" | "unknown";

function detectProjectType(projectRoot: string): ProjectType {
  if (fs.existsSync(path.join(projectRoot, "Cargo.toml"))) return "rust";
  if (fs.existsSync(path.join(projectRoot, "package.json"))) return "node";
  if (fs.existsSync(path.join(projectRoot, "pyproject.toml")) ||
    fs.existsSync(path.join(projectRoot, "requirements.txt"))) return "python";
  if (fs.existsSync(path.join(projectRoot, "go.mod"))) return "go";
  return "unknown";
}

function parseRustWorkspaceMembers(projectRoot: string): string[] {
  const cargoPath = path.join(projectRoot, "Cargo.toml");
  if (!fs.existsSync(cargoPath)) return [];

  try {
    const content = fs.readFileSync(cargoPath, "utf-8");
    // Parse [workspace] members = [...] from Cargo.toml
    const workspaceMatch = content.match(/\[workspace\][\s\S]*?members\s*=\s*\[([\s\S]*?)\]/);
    if (!workspaceMatch) return [];

    const membersRaw = workspaceMatch[1];
    return membersRaw
      .split(",")
      .map((m) => m.replace(/["'\s]/g, "").trim())
      .filter((m) => m.length > 0 && !m.startsWith("#"))
      .map((m) => m.replace(/\/\*$/, "").replace(/\*$/, "").trim()); // strip glob wildcards
  } catch {
    return [];
  }
}

async function getRustScope(projectRoot: string): Promise<string[]> {
  const scope: Set<string> = new Set();

  // Parse workspace members from Cargo.toml
  const members = parseRustWorkspaceMembers(projectRoot);

  if (members.length > 0) {
    // It's a workspace — include src/ of each member
    for (const member of members) {
      const memberSrc = path.join(member, "src");
      const fullMemberSrc = path.join(projectRoot, memberSrc);
      if (fs.existsSync(fullMemberSrc)) {
        scope.add(memberSrc);
      }
      // Also include member Cargo.toml
      const memberCargo = path.join(member, "Cargo.toml");
      if (fs.existsSync(path.join(projectRoot, memberCargo))) {
        scope.add(memberCargo);
      }
    }
  } else {
    // Single crate — just include src/
    const srcPath = path.join(projectRoot, "src");
    if (fs.existsSync(srcPath)) scope.add("src");
  }

  // Also catch any */src dirs not listed in workspace (safety net)
  const allSrcDirs = await glob("*/src", {
    cwd: projectRoot,
    ignore: ["node_modules/**", ".git/**", "target/**"],
  });
  for (const s of allSrcDirs) scope.add(s);

  return Array.from(scope);
}

async function getNodeScope(projectRoot: string): Promise<string[]> {
  const scope: Set<string> = new Set();
  const srcPath = path.join(projectRoot, "src");
  if (fs.existsSync(srcPath)) scope.add("src");

  // Check for monorepo patterns (packages/, apps/, libs/)
  for (const dir of ["packages", "apps", "libs"]) {
    const fullPath = path.join(projectRoot, dir);
    if (fs.existsSync(fullPath)) scope.add(dir);
  }

  // Check for Next.js / React App Router conventions
  // These live at project root (not nested under src/) in many Next.js 13+ projects
  for (const dir of ["app", "pages", "components", "lib", "hooks", "utils", "styles", "store", "context", "config", "middleware.ts", "middleware.js"]) {
    const fullPath = path.join(projectRoot, dir);
    if (fs.existsSync(fullPath)) scope.add(dir);
  }

  return Array.from(scope);
}

async function getPythonScope(projectRoot: string): Promise<string[]> {
  const scope: Set<string> = new Set();
  // Python projects typically have a src/ or a package dir matching project name
  const srcPath = path.join(projectRoot, "src");
  if (fs.existsSync(srcPath)) scope.add("src");

  // Look for dirs with __init__.py
  const initFiles = await glob("*/__init__.py", {
    cwd: projectRoot,
    ignore: ["node_modules/**", ".git/**", "venv/**", ".venv/**"],
  });
  for (const f of initFiles) scope.add(path.dirname(f));

  return Array.from(scope);
}

async function getGoScope(projectRoot: string): Promise<string[]> {
  const scope: Set<string> = new Set();
  const internalPath = path.join(projectRoot, "internal");
  const pkgPath = path.join(projectRoot, "pkg");
  const cmdPath = path.join(projectRoot, "cmd");
  if (fs.existsSync(internalPath)) scope.add("internal");
  if (fs.existsSync(pkgPath)) scope.add("pkg");
  if (fs.existsSync(cmdPath)) scope.add("cmd");
  return Array.from(scope);
}

export async function autoDetectScope(projectRoot: string): Promise<string[]> {
  const git = simpleGit(projectRoot);
  const autoScope: Set<string> = new Set();
  const projectType = detectProjectType(projectRoot);

  // Step 1: Detect language-specific source dirs
  let langScope: string[] = [];
  switch (projectType) {
    case "rust": langScope = await getRustScope(projectRoot); break;
    case "node": langScope = await getNodeScope(projectRoot); break;
    case "python": langScope = await getPythonScope(projectRoot); break;
    case "go": langScope = await getGoScope(projectRoot); break;
    default: {
      const srcPath = path.join(projectRoot, "src");
      if (fs.existsSync(srcPath)) langScope = ["src"];
    }
  }
  for (const s of langScope) autoScope.add(s);

  // Step 2: Layer git activity on top — add dirs of recently modified files
  try {
    const log = await git.raw([
      "log", "--since=7 days ago", "--name-only", "--pretty=format:", "--diff-filter=AM"
    ]);

    const recentFiles = log
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (const file of recentFiles) {
      const fullPath = path.join(projectRoot, file);
      if (fs.existsSync(fullPath)) {
        const dir = path.dirname(file);
        if (dir !== ".") autoScope.add(dir);
      }
    }
  } catch {
    // Not a git repo or no recent commits — lang scope is enough
  }

  // Step 3: Always include root-level config files
  for (const file of ALWAYS_INCLUDE) {
    const fullPath = path.join(projectRoot, file);
    if (fs.existsSync(fullPath)) autoScope.add(file);
  }

  return Array.from(autoScope).filter((s) => s !== "." && s.length > 0);
}