import simpleGit from "simple-git";

export interface GitContext {
  branch: string;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
    timeAgo: string;
  } | null;
  recentCommits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
    timeAgo: string;
  }>;
  uncommittedChanges: string[];
  isGitRepo: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}

export async function getGitContext(projectRoot: string): Promise<GitContext> {
  const git = simpleGit(projectRoot);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return { branch: "", lastCommit: null, recentCommits: [], uncommittedChanges: [], isGitRepo: false };
    }

    const [branch, log, status] = await Promise.all([
      git.revparse(["--abbrev-ref", "HEAD"]),
      git.log({ maxCount: 5 }),
      git.status(),
    ]);

    const [latest, ...rest] = log.all;

    return {
      isGitRepo: true,
      branch: branch.trim(),
      lastCommit: latest
        ? {
          hash: latest.hash.slice(0, 7),
          message: latest.message,
          author: latest.author_name,
          date: latest.date,
          timeAgo: timeAgo(latest.date),
        }
        : null,
      recentCommits: rest.map((c) => ({
        hash: c.hash.slice(0, 7),
        message: c.message,
        author: c.author_name,
        date: c.date,
        timeAgo: timeAgo(c.date),
      })),
      uncommittedChanges: [
        ...status.modified,
        ...status.created,
        ...status.deleted,
      ],
    };
  } catch {
    return { branch: "", lastCommit: null, recentCommits: [], uncommittedChanges: [], isGitRepo: false };
  }
}
