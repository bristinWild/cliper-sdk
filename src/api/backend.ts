import { loadConfig } from "../config/config";

const API_URL = "https://cliper-backend-production.up.railway.app";

export async function registerRepository(data: {
    name: string;
    githubOwner?: string;
    githubRepo?: string;
    branch: string;
    dataset: string;
}) {
    const config = loadConfig();




    const token = config.github?.token;

    if (!token) {
        throw new Error(
            "GitHub is not configured. Run `cliper auth github`."
        );
    }

    const res = await fetch(`${API_URL}/repositories/register`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error(await res.text());
    }


    return await res.json();
}

export async function verifyCliAuth(token: string): Promise<{ id: string; username: string }> {
    const res = await fetch(`${API_URL}/auth/cli`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as { id: string; username: string };
}


