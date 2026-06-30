import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

export interface ResolvedReference {
  url: string;
  source: string; // which file it was found in
  status: "fetched" | "blocked" | "failed" | "skipped";
  content?: string;
  reason?: string;
}

const URL_REGEX = /https?:\/\/[^\s\)\]\>"']+/g;

const ALWAYS_BLOCKED_PATTERNS = [
  /robots\.txt/i,
  /localhost/i,
  /127\.0\.0\.1/,
  /internal\./,
  /\.local\//,
];

const SKIP_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip"];

function shouldSkip(url: string): boolean {
  if (SKIP_EXTENSIONS.some((ext) => url.toLowerCase().includes(ext))) return true;
  if (url.includes("shields.io")) return true;
  if (url.includes("badge")) return true;
  if (url.includes("github.com/") && url.includes("/actions/")) return true;
  return false;
}

async function fetchUrl(url: string): Promise<{ ok: boolean; content?: string; reason?: string }> {
  try {
    const { default: fetch } = await import("node-fetch");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal as any,
      headers: {
        "User-Agent": "Cliper/1.0 context-doc-generator",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text") && !contentType.includes("json")) {
      return { ok: false, reason: "Non-text content" };
    }

    const text = await res.text();

    // Strip HTML tags for cleaner context
    const cleaned = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000); // Cap at 3000 chars per URL

    return { ok: true, content: cleaned };
  } catch (err: any) {
    return { ok: false, reason: err.message ?? "Network error" };
  }
}

export async function resolveBlockedReferences(
  projectRoot: string
): Promise<ResolvedReference[]> {
  const markdownFiles = await glob("**/*.md", {
    cwd: projectRoot,
    ignore: ["node_modules/**", ".git/**", "dist/**"],
  });

  const urlMap = new Map<string, string>(); // url -> source file

  for (const mdFile of markdownFiles) {
    const fullPath = path.join(projectRoot, mdFile);
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const matches = content.match(URL_REGEX) ?? [];
      for (const url of matches) {
        if (!urlMap.has(url)) urlMap.set(url, mdFile);
      }
    } catch {
      // Skip unreadable files
    }
  }

  const results: ResolvedReference[] = [];

  for (const [url, source] of urlMap) {
    if (shouldSkip(url)) {
      results.push({ url, source, status: "skipped", reason: "Badge/asset URL" });
      continue;
    }

    if (ALWAYS_BLOCKED_PATTERNS.some((p) => p.test(url))) {
      results.push({ url, source, status: "blocked", reason: "Internal/local URL" });
      continue;
    }

    const result = await fetchUrl(url);
    if (result.ok && result.content) {
      results.push({ url, source, status: "fetched", content: result.content });
    } else {
      results.push({ url, source, status: "failed", reason: result.reason });
    }
  }

  return results;
}
