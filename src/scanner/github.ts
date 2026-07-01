import simpleGit from "simple-git";

export async function getGithubRepo(
    projectRoot: string
): Promise<{ owner: string; repo: string } | null> {

    const git = simpleGit(projectRoot);

    try {
        const remote = await git.remote(["get-url", "origin"]);

        if (!remote) {
            return null;
        }

        const url = remote.trim();

        // https://github.com/user/repo.git
        const match = url.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);

        if (!match) {
            return null;
        }

        return {
            owner: match[1],
            repo: match[2],
        };

    } catch {
        return null;
    }
}