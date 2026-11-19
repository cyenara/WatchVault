const cors = require("cors");
const express = require("express");
const db = require("./db");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const cookieParser = require("cookie-parser");

const scrypt = promisify(crypto.scrypt);

const app = express();
const PORT = 3001;

const FRONTEND_ORIGINS = [
    "http://127.0.0.1:3000",
    "http://localhost:3000"
];

app.use(cors({
    origin: FRONTEND_ORIGINS,
    credentials: true
}));

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use("/api/auth", function(req, res, next) {
    const origin = req.get("Origin");

    if (
        req.method !== "GET" &&
        origin &&
        !FRONTEND_ORIGINS.includes(origin)
    ) {
        return res.status(403).json({
            message: "Origin not allowed"
        });
    }

    next();
});


const SESSION_COOKIE = "wv_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
};

function hashSessionToken(token) {
    return crypto.createHash("sha256")
        .update(token)
        .digest("hex");
}

function getSessionUser(req) {
    const token = req.cookies?.[SESSION_COOKIE];

    if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/.test(token)
    ) {
        return null;
    }

    const tokenHash = hashSessionToken(token);

    const session = db.prepare(`
        SELECT users.id, users.username, users.email
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ?
          AND sessions.expires_at > ?
    `).get(tokenHash, Date.now());

    return session || null;
}


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

app.get("/api/movies/:id", async function(req, res) {
    try {
        const movieId = Number(req.params.id);
        const token = process.env.TMDB_READ_TOKEN;

        if (!Number.isSafeInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                message: "Invalid movie ID"
            });
        }

        if (!token) {
            return res.status(500).json({
                message: "TMDB token is missing"
            });
        }

        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${movieId}?language=en-US&append_to_response=credits`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            return res.status(response.status === 404 ? 404 : 502).json({
                message: "Failed to load movie details"
            });
        }

        const data = await response.json();

        res.json(data);

    } catch (error) {
        console.error("Movie details error:", error.message);

        res.status(502).json({
            message: "Failed to fetch movie details"
        });
    }
});


app.post("/api/auth/register", async function(req, res) {
    try {
        const { username, email, password } = req.body || {};

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length < 3 || cleanUsername.length > 30) {
            return res.status(400).json({
                message: "Username must contain 3-30 characters"
            });
        }

        if (
            cleanEmail.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                message: "Invalid email address"
            });
        }

        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({
                message: "Password must contain 8-128 characters"
            });
        }

        const existingUser = db.prepare(
            "SELECT id FROM users WHERE username = ? OR email = ?"
        ).get(cleanUsername, cleanEmail);

        if (existingUser) {
            return res.status(409).json({
                message: "Username or email is already registered"
            });
        }

        const salt = crypto.randomBytes(16).toString("hex");
        const derivedKey = await scrypt(password, salt, 64);

        const passwordHash = `${salt}:${derivedKey.toString("hex")}`;

        const result = db.prepare(`
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        `).run(cleanUsername, cleanEmail, passwordHash);

        res.status(201).json({
            message: "Registration successful",
            user: {
                id: Number(result.lastInsertRowid),
                username: cleanUsername
            }
        });

    } catch (error) {
        if (String(error.message).includes("UNIQUE constraint failed")) {
            return res.status(409).json({
                message: "Username or email is already registered"
            });
        }

        console.error("Registration error:", error);

        res.status(500).json({
            message: "Registration failed"
        });
    }
});


app.post("/api/auth/login", async function(req, res) {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            email.length > 254 ||
            password.length === 0 ||
            password.length > 128
        ) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = db.prepare(`
            SELECT id, username, password_hash
            FROM users
            WHERE email = ?
        `).get(cleanEmail);

        // Naudojame atsargines reikšmes, jeigu vartotojas nerastas.
        const salt = user
            ? user.password_hash.split(":")[0]
            : "0".repeat(32);

        const hashHex = user
            ? user.password_hash.split(":")[1]
            : "0".repeat(128);

        const storedHash = Buffer.from(hashHex, "hex");

        if (storedHash.length !== 64) {
            throw new Error("Invalid stored password hash");
        }

        const enteredHash = await scrypt(password, salt, 64);

        const passwordMatches = crypto.timingSafeEqual(
            storedHash,
            enteredHash
        );

        if (!user || !passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashSessionToken(sessionToken);
        const expiresAt = Date.now() + SESSION_DURATION_MS;

        // Išvalome senas, nebegaliojančias sesijas.
        db.prepare(
            "DELETE FROM sessions WHERE expires_at <= ?"
        ).run(Date.now());

        // Išsaugome naują sesiją duomenų bazėje.
        db.prepare(`
            INSERT INTO sessions (token_hash, user_id, expires_at)
            VALUES (?, ?, ?)
        `).run(tokenHash, user.id, expiresAt);

        // Naršyklei išsiunčiame sesijos slapuką.
        res.cookie(SESSION_COOKIE, sessionToken, {
            ...SESSION_COOKIE_OPTIONS,
            maxAge: SESSION_DURATION_MS
        });

        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username
            }
        });


    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Login failed"
        });
    }
});


// Patikriname, ar vartotojas prisijungęs.
app.get("/api/auth/me", function(req, res) {
    res.set("Cache-Control", "no-store");

    const user = getSessionUser(req);

    if (!user) {
        return res.json({ user: null });
    }

    res.json({
        user: {
            id: user.id,
            username: user.username
        }
    });
});

// Atsijungiame.
app.post("/api/auth/logout", function(req, res) {
    const token = req.cookies?.[SESSION_COOKIE];

    if (typeof token === "string") {
        const tokenHash = hashSessionToken(token);

        db.prepare(
            "DELETE FROM sessions WHERE token_hash = ?"
        ).run(tokenHash);
    }

    res.clearCookie(
        SESSION_COOKIE,
        SESSION_COOKIE_OPTIONS
    );

    res.json({
        message: "Logged out successfully"
    });
});


app.listen(PORT, function() {
    console.log("Server running on port " + PORT);
});