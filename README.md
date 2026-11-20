# WatchVault 

**A full-stack movie discovery and personal tracking web application.**

> **Project status: Active development / portfolio project.** Core functionality works locally, but the application is not yet publicly deployed.

## Features

- **Movie discovery** — browse popular movies from [The Movie Database (TMDB)](https://www.themoviedb.org/) with pagination.
- **Search, filter & sort** — filter the currently loaded movies by title and genre; sort by release year or title.
- **Movie details** — posters, backdrops, synopses, runtime, genres, directors, and cast.
- **User accounts** — registration, sign-in, sign-out, password hashing, and persistent sessions.
- **Personal watchlist** — add and remove movies, with data associated with each signed-in user.
- **Watched movies** — track completed movies and browse them on a dedicated page.
- **Personal ratings** — rate watched movies from 1 to 10, update or remove ratings.
- **Profile statistics** — watchlist count, watched count, and average personal rating.

## 🛠 Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js, Express |
| Database | SQLite (built-in `node:sqlite`) |
| Authentication | Node.js `crypto` / scrypt, server-side sessions, HttpOnly cookies |
| Movie data | TMDB API |
| Development | Git, GitHub, VS Code |

The frontend communicates with the Express API. The backend requests movie metadata from TMDB and stores account-specific data in SQLite. **The TMDB API token is kept server-side** rather than in frontend JavaScript.

## 📷 Screenshots

Screenshots of the discovery page, movie details, watched list, and profile will be added to this README.

**Live demo:** Not deployed yet. Follow the instructions below to run the project locally.

## 🚀 Run locally

### Requirements

- [Node.js 24](https://nodejs.org/) or newer (project currently uses Node.js 24 and its built-in SQLite module)
- npm
- A free **TMDB API Read Access Token** from [TMDB](https://www.themoviedb.org/settings/api)
- A local static HTTP server for the frontend (for example, the VS Code **Live Preview** extension)

### 1. Clone

```bash
git clone https://github.com/cyenara/WatchVault.git
cd WatchVault
```

### 2. Configure the backend

Create `backend/.env` using `backend/.env.example` as a template. Add your own TMDB API Read Access Token:

```env
TMDB_READ_TOKEN=your_tmdb_api_read_access_token
```

Never commit a real `.env` file or API token.

### 3. Install dependencies and start the API

```bash
cd backend
npm install
node --env-file=.env server.js
```

The API runs at **http://localhost:3001**. To confirm it is running, open **http://localhost:3001/api/health**.

On Windows PowerShell, if `npm` is blocked by execution policy, use `npm.cmd install`.

### 4. Start the frontend

Keep the backend running. Open the repository's root folder in VS Code and serve `index.html` using **Live Preview** on port **3000**.

Open **http://localhost:3000/index.html** in your browser.

**Important:** Use `localhost:3000`, not `127.0.0.1:3000`, for the current local login/session configuration. The frontend API addresses are currently set to `http://localhost:3001`.

Register a new local test account to try the watchlist, watched movies, ratings, and profile. The SQLite database is created automatically in `backend/data/watchvault.db`.

## 📁 Project structure

```text
WatchVault/
├── backend/
│   ├── server.js           # Express routes, TMDB proxy and authentication
│   ├── db.js               # SQLite tables and initialization
│   ├── .env.example        # Environment variable template
│   └── package.json
├── images/                 # Local visual assets
├── index.html              # Movie discovery
├── movie.html              # Movie details and personal actions
├── watchlist.html          # Saved-to-watch movies
├── watched.html            # Watched movies and ratings
├── profile.html            # User statistics
├── login.html              # Sign in
├── register.html           # Create account
├── *.js                    # Frontend page logic
└── style.css               # Shared styles
```

## 🧩 API overview

| API route | Purpose |
| --- | --- |
| `GET /api/movies/popular?page=1` | Popular movie listings |
| `GET /api/movies/:id` | Movie details and credits |
| `POST /api/auth/register` | Register account |
| `POST /api/auth/login` | Log in and create session |
| `GET /api/auth/me` | Check current session |
| `POST /api/auth/logout` | Log out |
| `GET /api/watchlist`, `POST /api/watchlist`, `DELETE /api/watchlist/:movieId` | Personal watchlist |
| `GET /api/watched`, `POST /api/watched`, `DELETE /api/watched/:movieId` | Watched movies |
| `GET /api/ratings`, `PUT /api/ratings/:movieId`, `DELETE /api/ratings/:movieId` | Personal ratings |

User-specific endpoints use server-side session authentication.

## 🗺 Roadmap

The project is under active development. Planned improvements include:

- [ ] Public demo and deployment configuration
- [ ] Movie diary / viewing dates
- [ ] More detailed statistics and profile customization
- [ ] Better loading, empty-state, and error handling
- [ ] Automated tests and production security hardening
- [ ] Mobile and accessibility refinements

## 🔒 Development & security notes

This is a **learning and portfolio project**, not yet a production service. Public deployment will require additional work, including HTTPS hosting, production-ready origin and session settings, rate limiting for authentication, and operational database persistence/backups.

The `.env`, `node_modules/`, and local SQLite data directory are excluded from version control. Each local installation starts with its own empty database.

## 🎞 Movie data attribution

Movie information and poster/backdrop images are provided by [The Movie Database (TMDB)](https://www.themoviedb.org/).

**This product uses the TMDB API but is not endorsed or certified by TMDB.**
