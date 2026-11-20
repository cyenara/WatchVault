const WATCHLIST_API = "/api/watchlist";
const MOVIES_API = "/api/movies";
const AUTH_API = "/api/auth";

const watchlistGrid = document.getElementById("watchlist-grid");
const watchlistCount = document.getElementById("watchlist-count");

async function removeFromWatchlist(movieId, button) {
    button.disabled = true;

    try {
        const response = await fetch(
            `${WATCHLIST_API}/${movieId}`,
            {
                method: "DELETE",
                credentials: "include"
            }
        );

        if (!response.ok) {
            throw new Error("Failed to remove movie");
        }

        await loadWatchlist();

    } catch (error) {
        console.error(error);
        alert("Could not remove movie.");
        button.disabled = false;
    }
}

function renderWatchlist(movieList, totalCount) {
    watchlistGrid.replaceChildren();

    watchlistCount.textContent =
        `${totalCount} ${totalCount === 1 ? "movie" : "movies"} saved`;

    if (totalCount === 0) {
        const message = document.createElement("p");
        message.textContent = "Your watchlist is empty.";

        const link = document.createElement("a");
        link.href = "index.html#discover";
        link.textContent = "Discover movies";

        watchlistGrid.append(message, link);
        return;
    }

    if (movieList.length === 0) {
        watchlistGrid.textContent =
            "Saved movies could not be loaded right now.";
        return;
    }

    movieList.forEach(function(movie) {
        const card = document.createElement("article");
        card.className = "movie-card watchlist-card";

        const link = document.createElement("a");
        link.className = "movie-link";
        link.href = `movie.html?id=${movie.id}`;

        if (movie.poster_path) {
            const poster = document.createElement("img");

            poster.className = "movie-poster";
            poster.src =
                `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

            poster.alt = `${movie.title} poster`;
            poster.loading = "lazy";

            link.appendChild(poster);
        }

        const title = document.createElement("h3");
        title.textContent = movie.title;
        link.appendChild(title);

        const year = movie.release_date
            ? movie.release_date.slice(0, 4)
            : "N/A";

        const rating = typeof movie.vote_average === "number"
            ? movie.vote_average.toFixed(1)
            : "N/A";

        const info = document.createElement("p");
        info.textContent = `${year} | ⭐ ${rating}`;

        const removeButton = document.createElement("button");
        removeButton.className = "watchlist-remove";
        removeButton.type = "button";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", function() {
            removeFromWatchlist(movie.id, removeButton);
        });

        card.append(link, info, removeButton);
        watchlistGrid.appendChild(card);
    });
}

async function loadWatchlist() {
    watchlistCount.textContent = "Loading watchlist...";
    watchlistGrid.replaceChildren();

    try {
        const authResponse = await fetch(`${AUTH_API}/me`, {
            credentials: "include"
        });

        if (!authResponse.ok) {
            throw new Error("Failed to check login status");
        }

        const authData = await authResponse.json();

        if (!authData.user) {
            watchlistCount.textContent =
                "Please log in to view your watchlist.";

            const link = document.createElement("a");
            link.href = "login.html";
            link.textContent = "Log In";

            watchlistGrid.appendChild(link);
            return;
        }

        const response = await fetch(WATCHLIST_API, {
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Failed to load watchlist");
        }

        const data = await response.json();
        const movieIds = data.movieIds;

        if (movieIds.length === 0) {
            renderWatchlist([], 0);
            return;
        }

        // Gauname kiekvieno išsaugoto filmo informaciją.
        const results = await Promise.allSettled(
            movieIds.map(async function(id) {
                const response = await fetch(
                    `${MOVIES_API}/${id}`
                );

                if (!response.ok) {
                    throw new Error(`Failed to load movie ${id}`);
                }

                return response.json();
            })
        );

        const movies = results
            .filter(function(result) {
                return result.status === "fulfilled";
            })
            .map(function(result) {
                return result.value;
            });

        renderWatchlist(movies, movieIds.length);

        const failedCount = movieIds.length - movies.length;

        if (failedCount > 0) {
            const warning = document.createElement("p");
            warning.textContent =
                `${failedCount} saved movie(s) could not be loaded.`;

            watchlistGrid.prepend(warning);
        }

    } catch (error) {
        console.error(error);

        watchlistCount.textContent =
            "Could not load watchlist. Please try again.";
    }
}

loadWatchlist();
