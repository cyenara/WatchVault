const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");

const dataFolder = path.join(__dirname, "data");

fs.mkdirSync(dataFolder, { recursive: true });

const db = new DatabaseSync(
    path.join(dataFolder, "watchvault.db")
);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlist (
        user_id INTEGER NOT NULL,
        movie_id INTEGER NOT NULL,
        added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (user_id, movie_id),

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );
`);


db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_expires
    ON sessions(expires_at);
`);


db.exec(`
    CREATE TABLE IF NOT EXISTS watched_movies (
        user_id INTEGER NOT NULL,
        movie_id INTEGER NOT NULL,
        watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (user_id, movie_id),

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );
`);


db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS ratings (
        user_id INTEGER NOT NULL,
        movie_id INTEGER NOT NULL,

        rating INTEGER NOT NULL
            CHECK (rating BETWEEN 1 AND 10),

        created_at TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP,

        updated_at TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (user_id, movie_id),

        FOREIGN KEY (user_id, movie_id)
            REFERENCES watched_movies(user_id, movie_id)
            ON DELETE CASCADE
    );
`);


module.exports = db;
