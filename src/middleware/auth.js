module.exports = async function (req, res, next) {

    const header = req.headers.authorization || "";

    const token = header.startsWith("Bearer ")
        ? header.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    try {

        const githubRes = await fetch(
            "https://api.github.com/user",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "User-Agent": "cliper"
                }
            }
        );

        const githubUser = await githubRes.json();

        if (!githubRes.ok) {
            return res.status(401).json({
                error: "Invalid GitHub token"
            });
        }

        const { data: user } = await supabase
            .from("users")
            .select("*")
            .eq("github_id", String(githubUser.id))
            .single();

        if (!user) {
            return res.status(401).json({
                error: "User not found"
            });
        }

        req.user = user;

        next();

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Authentication failed"
        });

    }

};