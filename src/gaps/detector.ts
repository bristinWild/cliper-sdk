import * as fs from "fs";
import * as path from "path";
import { FileContent } from "../scanner/fileContent";

export interface Gap {
  type: "undocumented_function" | "missing_env_var" | "todo_fixme" | "implicit_dependency" | "stale_reference";
  file: string;
  line?: number;
  description: string;
  severity: "high" | "medium" | "low";
}

// Detect functions/classes with no JSDoc or comments above them
function detectUndocumentedCode(file: FileContent): Gap[] {
  const gaps: Gap[] = [];
  const lines = file.content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const prevLine = i > 0 ? lines[i - 1].trim() : "";

    const isFunctionOrClass =
      /^(export\s+)?(async\s+)?function\s+\w+/.test(line) ||
      /^(export\s+)?(default\s+)?class\s+\w+/.test(line) ||
      /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/.test(line);

    if (isFunctionOrClass) {
      const hasComment =
        prevLine.startsWith("//") ||
        prevLine.startsWith("*") ||
        prevLine.startsWith("/*") ||
        prevLine.startsWith("/**") ||
        prevLine === "*/";

      if (!hasComment) {
        gaps.push({
          type: "undocumented_function",
          file: file.relativePath,
          line: i + 1,
          description: `Undocumented: "${line.slice(0, 60)}..."`,
          severity: "low",
        });
      }
    }
  }

  return gaps.slice(0, 5); // Cap at 5 per file to avoid noise
}

// Detect TODO/FIXME/HACK comments
function detectTodos(file: FileContent): Gap[] {
  const gaps: Gap[] = [];
  const lines = file.content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/TODO|FIXME|HACK|XXX|TEMP/i.test(line)) {
      gaps.push({
        type: "todo_fixme",
        file: file.relativePath,
        line: i + 1,
        description: line.trim().slice(0, 100),
        severity: /FIXME|HACK/i.test(line) ? "high" : "medium",
      });
    }
  }

  return gaps;
}

// Detect env vars referenced in code but not in .env.example
function detectMissingEnvVars(
  files: FileContent[],
  projectRoot: string
): Gap[] {
  const gaps: Gap[] = [];
  const envExamplePath = path.join(projectRoot, ".env.example");

  let knownEnvVars: Set<string> = new Set();
  if (fs.existsSync(envExamplePath)) {
    const content = fs.readFileSync(envExamplePath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
      if (match) knownEnvVars.add(match[1]);
    }
  }

  const ENV_REGEX = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

  for (const file of files) {
    let match;
    while ((match = ENV_REGEX.exec(file.content)) !== null) {
      const varName = match[1];
      if (!knownEnvVars.has(varName)) {
        gaps.push({
          type: "missing_env_var",
          file: file.relativePath,
          description: `process.env.${varName} used but not in .env.example`,
          severity: "high",
        });
      }
    }
  }

  // Deduplicate by description
  const seen = new Set<string>();
  return gaps.filter((g) => {
    if (seen.has(g.description)) return false;
    seen.add(g.description);
    return true;
  });
}

export function detectGaps(files: FileContent[], projectRoot: string): Gap[] {
  const gaps: Gap[] = [];

  for (const file of files) {
    if (file.truncated) continue;
    const ext = path.extname(file.relativePath);
    if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
      gaps.push(...detectUndocumentedCode(file));
      gaps.push(...detectTodos(file));
    }
  }

  gaps.push(...detectMissingEnvVars(files, projectRoot));

  // Sort by severity
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return gaps.sort((a, b) => order[a.severity] - order[b.severity]);
}
