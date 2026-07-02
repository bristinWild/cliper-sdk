import { getGithubHeaders } from "../auth/github";


export interface GitHubPullRequest {
    number: number;
    title: string;
    state: "open" | "closed";
    author: string;
    createdAt: string;
    updatedAt: string;
    merged: boolean;
    baseBranch: string;
    headBranch: string;
    url: string;
    commits: string[];
    issues: number[];
    changedFiles: string[];
}

interface GithubCommitResponse {
    sha: string;
}

interface GithubFileResponse {
    filename: string;
}

 interface GithubPRResponse {
            number: number;
            title: string;
            body: string | null;
            state: "open" | "closed";
            user: { login: string };
            created_at: string;
            updated_at: string;
            merged_at: string | null;
            html_url: string;
            base: { ref: string };
            head: { ref: string };
        }


export async function fetchGithubPullRequests(
    owner: string,
    repo: string
): Promise<GitHubPullRequest[]> {

    const headers = getGithubHeaders();

    try {

        const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=30`,
            {
                headers
            }
        );

        if (!res.ok) {
            return [];
        }



        const prs = (await res.json()) as GithubPRResponse[];

        const result: GitHubPullRequest[] = [];

        for (const pr of prs) {

            const commitsRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/commits`,
                {
                    headers
                }
            );

            const commits = commitsRes.ok
                ? ((await commitsRes.json()) as GithubCommitResponse[])
                    .map(c => c.sha.substring(0, 7))
                : [];

            const filesRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/files`,
                {
                    headers
                }
            );

            const changedFiles = filesRes.ok
                ? ((await filesRes.json()) as GithubFileResponse[])
                    .map(file => file.filename)
                : [];

            const text = `${pr.title}\n${pr.body ?? ""}`;

            const issues = [
                ...text.matchAll(/#(\d+)/g)
            ].map(match => Number(match[1]));

            result.push({
                number: pr.number,
                title: pr.title,
                state: pr.state,
                author: pr.user.login,
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
                merged: pr.merged_at !== null,
                baseBranch: pr.base.ref,
                headBranch: pr.head.ref,
                url: pr.html_url,
                commits,
                issues,
                changedFiles
            });
        }

        return result;

    } catch {
        return [];
    }

}