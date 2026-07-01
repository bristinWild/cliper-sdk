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
}


export async function fetchGithubPullRequests(
    owner: string,
    repo: string
): Promise<GitHubPullRequest[]> {

    try {

        const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=30`
        );

        if (!res.ok) {
            return [];
        }

        interface GithubPRResponse {
            number: number;
            title: string;
            state: "open" | "closed";
            user: { login: string };
            created_at: string;
            updated_at: string;
            merged_at: string | null;
            html_url: string;
            base: { ref: string };
            head: { ref: string };
        }

        const prs = (await res.json()) as GithubPRResponse[];

        const result: GitHubPullRequest[] = [];

        for (const pr of prs) {

            const commitsRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/commits`
            );

            const commits = commitsRes.ok
                ? ((await commitsRes.json()) as any[]).map(c => c.sha.substring(0, 7))
                : [];

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
            });
        }

        return result;

    } catch {
        return [];
    }

}