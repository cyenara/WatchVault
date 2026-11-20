
const cors = require("cors");
const express = require("express");
const db = require("./db");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const cookieParser = require("cookie-parser");
const path = require("node:path");
const { rateLimit } = require("express-rate-limit");

const scrypt = promisify(crypto.scrypt);

const app = express();
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}
const PORT = Number(process.env.PORT) || 3001;

// Leidžiami frontend adresai
const FRONTEND_ORIGINS = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.APP_ORIGIN,
    process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : null
].filter(Boolean);

app.use(cors({
    origin: FRONTEND_ORIGINS,
    credentials: true
}));

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());


const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many attempts. Please try again later."
    }
});

app.use(
    ["/api/auth/login", "/api/auth/register"],
    authLimiter
);


// Užklausų kilmės patikrinimas
app.use(
    ["/api/auth", "/api/watchlist", "/api/watched", "/api/ratings"],
    function(req, res, next) {
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

// Sesijų nustatymai
const SESSION_COOKIE = "wv_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
};

// Sesijos tokeno maiša
function hashSessionToken(token) {
    return crypto.createHash("sha256")
        .update(token)
        .digest("hex");
}

// Surandame prisijungusį vartotoją
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

// Apsaugome maršrutus nuo neprisijungusių vartotojų
function requireAuth(req, res, next) {
    const user = getSessionUser(req);

    if (!user) {
        return res.status(401).json({
            message: "You must be logged in"
        });
    }

    req.user = user;
    next();
}

// ========================================
// HEALTH IR ABOUT
// ========================================

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

// ========================================
// TMDB – POPULIARŪS FILMAI
// ========================================

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

// ========================================
// TMDB – FILMO INFORMACIJA
// ========================================

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

// ========================================
// VARTOTOJO REGISTRACIJA
// ========================================

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

// ========================================
// VARTOTOJO PRISIJUNGIMAS
// ========================================

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

        // Atsarginės reikšmės, jei vartotojas nerastas
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

        // Sukuriame naują sesiją
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashSessionToken(sessionToken);
        const expiresAt = Date.now() + SESSION_DURATION_MS;

        // Išvalome pasibaigusias sesijas
        db.prepare(
            "DELETE FROM sessions WHERE expires_at <= ?"
        ).run(Date.now());

        // Išsaugome sesiją SQLite
        db.prepare(`
            INSERT INTO sessions (token_hash, user_id, expires_at)
            VALUES (?, ?, ?)
        `).run(tokenHash, user.id, expiresAt);

        // Naršyklei išsiunčiame slapuką
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

// ========================================
// PRISIJUNGUSIO VARTOTOJO PATIKRINIMAS
// ========================================

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

// ========================================
// ATSIJUNGIMAS
// ========================================

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

// ========================================
// WATCHLIST – AUTENTIFIKACIJOS APSAUGA
// ========================================

app.use("/api/watchlist", requireAuth);

// ========================================
// WATCHLIST – GAUTI FILMŲ SĄRAŠĄ
// ========================================

app.get("/api/watchlist", function(req, res) {
    try {
        const rows = db.prepare(`
            SELECT movie_id
            FROM watchlist
            WHERE user_id = ?
            ORDER BY added_at DESC, rowid DESC
        `).all(req.user.id);

        const movieIds = rows.map(function(row) {
            return row.movie_id;
        });

        res.json({ movieIds });

    } catch (error) {
        console.error("Watchlist error:", error);

        res.status(500).json({
            message: "Failed to load watchlist"
        });
    }
});

// ========================================
// WATCHLIST – PRIDĖTI FILMĄ
// ========================================

app.post("/api/watchlist", function(req, res) {
    try {
        const movieId = req.body?.movieId;

        if (!Number.isSafeInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                message: "Invalid movie ID"
            });
        }

        const result = db.prepare(`
            INSERT OR IGNORE INTO watchlist (user_id, movie_id)
            VALUES (?, ?)
        `).run(req.user.id, movieId);

        res.status(result.changes > 0 ? 201 : 200).json({
            message: result.changes > 0
                ? "Movie added to watchlist"
                : "Movie already in watchlist"
        });

    } catch (error) {
        console.error("Add to watchlist error:", error);

        res.status(500).json({
            message: "Failed to add movie"
        });
    }
});

// ========================================
// WATCHLIST – PAŠALINTI FILMĄ
// ========================================

app.delete("/api/watchlist/:movieId", function(req, res) {
    try {
        const movieId = Number(req.params.movieId);

        if (!Number.isSafeInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                message: "Invalid movie ID"
            });
        }

        const result = db.prepare(`
            DELETE FROM watchlist
            WHERE user_id = ? AND movie_id = ?
        `).run(req.user.id, movieId);

        res.json({
            message: result.changes > 0
                ? "Movie removed from watchlist"
                : "Movie not in watchlist"
        });

    } catch (error) {
        console.error("Remove from watchlist error:", error);

        res.status(500).json({
            message: "Failed to remove movie"
        });
    }
});


// ========================================
// WATCHED MOVIES
// ========================================

// Visus Watched maršrutus gali pasiekti tik prisijungę vartotojai.
app.use("/api/watched", requireAuth);

// Gauti peržiūrėtų filmų ID
app.get("/api/watched", function(req, res) {
    try {
        const rows = db.prepare(`
            SELECT movie_id
            FROM watched_movies
            WHERE user_id = ?
            ORDER BY watched_at DESC, rowid DESC
        `).all(req.user.id);

        const movieIds = rows.map(function(row) {
            return row.movie_id;
        });

        res.json({ movieIds });

    } catch (error) {
        console.error("Watched movies error:", error);

        res.status(500).json({
            message: "Failed to load watched movies"
        });
    }
});

// Pažymėti filmą kaip peržiūrėtą
app.post("/api/watched", function(req, res) {
    try {
        const movieId = req.body?.movieId;

        if (!Number.isSafeInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                message: "Invalid movie ID"
            });
        }

        const result = db.prepare(`
            INSERT OR IGNORE INTO watched_movies (user_id, movie_id)
            VALUES (?, ?)
        `).run(req.user.id, movieId);

        res.status(result.changes > 0 ? 201 : 200).json({
            message: result.changes > 0
                ? "Movie marked as watched"
                : "Movie already watched"
        });

    } catch (error) {
        console.error("Mark as watched error:", error);

        res.status(500).json({
            message: "Failed to mark movie as watched"
        });
    }
});

// Pašalinti peržiūrėto filmo žymą
app.delete("/api/watched/:movieId", function(req, res) {
    try {
        const movieId = Number(req.params.movieId);

        if (!Number.isSafeInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                message: "Invalid movie ID"
            });
        }

        const result = db.prepare(`
            DELETE FROM watched_movies
            WHERE user_id = ? AND movie_id = ?
        `).run(req.user.id, movieId);

        res.json({
            message: result.changes > 0
                ? "Movie removed from watched list"
                : "Movie was not marked as watched"
        });

    } catch (error) {
        console.error("Remove watched movie error:", error);

        res.status(500).json({
            message: "Failed to remove watched movie"
        });
    }
});


// ========================================
// PERSONAL MOVIE RATINGS
// ========================================

// Visi vertinimai susieti su prisijungusia paskyra.
app.use("/api/ratings", requireAuth);

// Gauti visus savo įvertinimus.
app.get("/api/ratings", function(req, res) {
    try {
        const ratings = db.prepare(`
            SELECT movie_id AS movieId, rating
            FROM ratings
            WHERE user_id = ?
        `).all(req.user.id);

        res.json({ ratings });

    } catch (error) {
        console.error("Load ratings error:", error);

        res.status(500).json({
            message: "Failed to load ratings"
        });
    }
});

// Sukurti arba atnaujinti filmo įvertinimą.
app.put("/api/ratings/:movieId", function(req, res) {
    try {
        const movieId = Number(req.params.movieId);
        const rating = req.body?.rating;

        if (!Number.isSafeInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                message: "Invalid movie ID"
            });
        }

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 10
        ) {
            return res.status(400).json({
                message: "Rating must be between 1 and 10"
            });
        }

        // Vertinti leidžiame tik peržiūrėtus filmus.
        const watchedMovie = db.prepare(`
            SELECT movie_id
            FROM watched_movies
            WHERE user_id = ? AND movie_id = ?
        `).get(req.user.id, movieId);

        if (!watchedMovie) {
            return res.status(409).json({
                message: "Mark the movie as watched before rating"
            });
        }

        db.prepare(`
            INSERT INTO ratings (user_id, movie_id, rating)
            VALUES (?, ?, ?)

            ON CONFLICT(user_id, movie_id)
            DO UPDATE SET
                rating = excluded.rating,
                updated_at = CURRENT_TIMESTAMP
        `).run(req.user.id, movieId, rating);

        res.json({
            message: "Rating saved successfully",
            movieId: movieId,
            rating: rating
        });

    } catch (error) {
        console.error("Save rating error:", error);

        res.status(500).json({
            message: "Failed to save rating"
        });
    }
});

// Pašalinti savo filmo įvertinimą.
app.delete("/api/ratings/:movieId", function(req, res) {
    try {
        const movieId = Number(req.params.movieId);

        if (!Number.isSafeInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                message: "Invalid movie ID"
            });
        }

        const result = db.prepare(`
            DELETE FROM ratings
            WHERE user_id = ? AND movie_id = ?
        `).run(req.user.id, movieId);

        res.json({
            message: result.changes > 0
                ? "Rating removed"
                : "Movie was not rated"
        });

    } catch (error) {
        console.error("Remove rating error:", error);

        res.status(500).json({
            message: "Failed to remove rating"
        });
    }
});


const FRONTEND_FOLDER = path.join(__dirname, "..");

const publicFiles = [
    "index.html",
    "movie.html",
    "watchlist.html",
    "watched.html",
    "profile.html",
    "login.html",
    "register.html",
    "style.css",
    "script.js",
    "movie.js",
    "watchlist.js",
    "watched.js",
    "profile.js",
    "auth.js",
    "login.js",
    "register.js"
];

publicFiles.forEach(function(filename) {
    app.get(`/${filename}`, function(req, res) {
        res.sendFile(path.join(FRONTEND_FOLDER, filename));
    });
});

app.use(
    "/images",
    express.static(path.join(FRONTEND_FOLDER, "images"))
);

app.get("/", function(req, res) {
    res.sendFile(path.join(FRONTEND_FOLDER, "index.html"));
});


// ========================================
// SERVERIO PALEIDIMAS
// ========================================

app.listen(PORT, function() {
    console.log("Server running on port " + PORT);
});
