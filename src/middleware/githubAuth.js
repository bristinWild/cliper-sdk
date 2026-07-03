const supabase = require("../lib/supabase");

module.exports = async function githubAuth(req, res, next) {
    const header = req.headers.authorization || "";

    const token = header.startsWith("Bearer ")
        ? header.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            error: "Missing GitHub token",
        });
    }

    try {
        // Verify GitHub token by fetching the authenticated user
        const githubRes = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${token}`,
                "User-Agent": "cliper",
                Accept: "application/vnd.github+json",
            },
        });

        const githubUser = await githubRes.json();

        if (!githubRes.ok) {
            console.error("GitHub Auth Error:", githubUser);

            return res.status(401).json({
                error: "Invalid GitHub token",
            });
        }

        // Find the corresponding Cliper user
        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("github_id", String(githubUser.id))
            .single();

        if (error || !user) {
            console.error("Supabase User Lookup Error:", error);

            return res.status(404).json({
                error: "User not found. Please sign in to the Cliper app first.",
            });
        }

        // Attach user to request
        req.user = user;
        req.github = githubUser;

        next();
    } catch (err) {
        console.error("GitHub Auth Middleware Error:", err);

        return res.status(500).json({
            error: "Authentication failed",
        });
    }
};