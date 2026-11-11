const cors = require("cors");
const express = require("express");

const app = express();
app.use(cors({
    origin: [
        "http://127.0.0.1:3000",
        "http://localhost:3000"
    ]
}));

const PORT = 3001;

app.get("/api/health", function(req, res) {
    res.json({
        message: "WatchVault API is running!"
    });
});

app.get("/api/about", function(req, res) {
    res.json({
    project: "WatchVault",
    version: "1.0",
    description: "Movie discovery and tracking platform"
});
});

app.get("/api/movies/popular", async function(req, res) {
    try {
        const page = Number(req.query.page) || 1;
        const token = process.env.TMDB_READ_TOKEN;

        if (!token) {
            return res.status(500).json({
                message: "TMDB token is missing"
            });
        }

        const response = await fetch(
            `https://api.themoviedb.org/3/movie/popular?language=en-US&page=${page}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            return res.status(502).json({
                message: "TMDB request failed",
                status: response.status
            });
        }

        const data = await response.json();

        res.json(data);

    } catch (error) {
        console.error("TMDB request error:", error.message);

        res.status(502).json({
            message: "Failed to fetch movies"
        });
    }
});

app.listen(PORT, function() {
    console.log("Server running on port " + PORT);
});