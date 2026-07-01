export interface GitHubIssue {
    number: number;
    title: string;
    state: "open" | "closed";
    labels: string[];
    author: string;
    createdAt: string;
    updatedAt: string;
    url: string;
}

interface GithubIssueResponse {
    number: number;
    title: string;
    state: "open" | "closed";
    labels: { name: string }[];
    user: { login: string };
    created_at: string;
    updated_at: string;
    html_url: string;
    pull_request?: unknown;
}

export async function fetchGithubIssues(
    owner: string,
    repo: string
): Promise<GitHubIssue[]> {

    try {

        const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=30`
        );

        if (!res.ok) {
            return [];
        }

        const issues = (await res.json()) as GithubIssueResponse[];

        return issues
            .filter(i => !i.pull_request)
            .map(i => ({
                number: i.number,
                title: i.title,
                state: i.state,
                labels: i.labels.map((l: any) => l.name),
                author: i.user.login,
                createdAt: i.created_at,
                updatedAt: i.updated_at,
                url: i.html_url,
            }));

    } catch {
        return [];
    }
}