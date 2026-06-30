import { FileContent } from "../scanner/fileContent";
import { GitContext } from "../scanner/gitContext";
import { ResolvedReference } from "../resolver/urlFetcher";
import { Gap } from "../gaps/detector";

export interface ContextDocOptions {
  projectRoot: string;
  projectName: string;
  activeScope: string[];
  watchedScope: string[];
  fileTree: string;
  files: FileContent[];
  gitContext: GitContext;
  references: ResolvedReference[];
  gaps: Gap[];
  generatedAt: string;
  dependencyMap: string;
}

const DIVIDER = "━".repeat(50);

function formatGitContext(git: GitContext): string {
  if (!git.isGitRepo) return "Not a git repository.";

  const lines: string[] = [];
  lines.push(`Branch:        ${git.branch}`);

  if (git.lastCommit) {
    lines.push(`Last commit:   ${git.lastCommit.hash} — ${git.lastCommit.message} (${git.lastCommit.timeAgo})`);
    lines.push(`Author:        ${git.lastCommit.author}`);
  }

  if (git.uncommittedChanges.length > 0) {
    lines.push(`\nUncommitted changes (${git.uncommittedChanges.length} files):`);
    for (const f of git.uncommittedChanges.slice(0, 10)) {
      lines.push(`  - ${f}`);
    }
  }

  if (git.recentCommits.length > 0) {
    lines.push("\nRecent commits:");
    for (const c of git.recentCommits) {
      lines.push(`  ${c.hash} — ${c.message}`);
    }
  }

  return lines.join("\n");
}

function formatFileContents(files: FileContent[]): string {
  if (files.length === 0) return "No files in scope.";

  return files
    .map((f) => {
      const ext = f.relativePath.split(".").pop() ?? "";
      const truncatedNote = f.truncated ? "\n[... truncated ...]" : "";
      return `### ${f.relativePath}\n\`\`\`${ext}\n${f.content}${truncatedNote}\n\`\`\``;
    })
    .join("\n\n");
}

function formatReferences(refs: ResolvedReference[]): string {
  const fetched = refs.filter((r) => r.status === "fetched");
  const failed = refs.filter((r) => r.status === "failed");

  const lines: string[] = [];

  if (fetched.length === 0 && failed.length === 0) {
    return "No external references found in markdown files.";
  }

  for (const ref of fetched) {
    lines.push(`#### ${ref.url}`);
    lines.push(`Source: ${ref.source}`);
    lines.push(`\n${ref.content}\n`);
  }

  if (failed.length > 0) {
    lines.push("\n**Could not fetch:**");
    for (const ref of failed) {
      lines.push(`  - ${ref.url} (${ref.reason})`);
    }
  }

  return lines.join("\n");
}

function formatGaps(gaps: Gap[]): string {
  if (gaps.length === 0) return "No significant gaps detected.";

  const bySeverity = {
    high: gaps.filter((g) => g.severity === "high"),
    medium: gaps.filter((g) => g.severity === "medium"),
    low: gaps.filter((g) => g.severity === "low"),
  };

  const lines: string[] = [];

  if (bySeverity.high.length > 0) {
    lines.push("**HIGH PRIORITY**");
    for (const g of bySeverity.high) {
      lines.push(`  ⚠️  [${g.file}${g.line ? `:${g.line}` : ""}] ${g.description}`);
    }
  }

  if (bySeverity.medium.length > 0) {
    lines.push("\n**MEDIUM PRIORITY**");
    for (const g of bySeverity.medium) {
      lines.push(`  ⚡ [${g.file}${g.line ? `:${g.line}` : ""}] ${g.description}`);
    }
  }

  if (bySeverity.low.length > 0) {
    lines.push("\n**LOW PRIORITY**");
    for (const g of bySeverity.low.slice(0, 10)) {
      lines.push(`  ℹ️  [${g.file}${g.line ? `:${g.line}` : ""}] ${g.description}`);
    }
  }

  return lines.join("\n");
}

export function buildContextDoc(opts: ContextDocOptions): string {
  const scopeSummary = [
    ...opts.activeScope.map((s) => `${s} (active)`),
    ...opts.watchedScope.map((s) => `${s} (watched)`),
  ].join(", ") || "auto-detected";

  return `${DIVIDER}
CLIPER CONTEXT DOCUMENT
${DIVIDER}
PROJECT:      ${opts.projectName}
GENERATED:    ${opts.generatedAt}
BRANCH:       ${opts.gitContext.branch || "unknown"}
SCOPED TO:    ${scopeSummary}
${DIVIDER}

## FOLDER STRUCTURE

\`\`\`
${opts.fileTree}
\`\`\`

${DIVIDER}

## GIT CONTEXT

${formatGitContext(opts.gitContext)}

${DIVIDER}

## DEPENDENCY MAP

${opts.dependencyMap}

${DIVIDER}

## KEY FILES

${formatFileContents(opts.files)}

${DIVIDER}

## BLOCKED REFERENCES (fetched locally)

${formatReferences(opts.references)}

${DIVIDER}

## DETECTED GAPS

${formatGaps(opts.gaps)}

${DIVIDER}
END OF CLIPER CONTEXT DOCUMENT
${DIVIDER}
`;
}