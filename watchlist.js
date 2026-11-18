
const WATCHLIST_KEY = "watchvault-watchlist";

const watchlistGrid = document.getElementById("watchlist-grid");
const watchlistCount = document.getElementById("watchlist-count");

function getWatchlist() {
    try {
        const saved = localStorage.getItem(WATCHLIST_KEY);

        const data = saved ? JSON.parse(saved) : [];

        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.error("Failed to read watchlist:", error);
        return [];
    }
}

function removeFromWatchlist(movieId) {
    const watchlist = getWatchlist();

    const updatedWatchlist = watchlist.filter(function(movie) {
        return movie.id !== movieId;
    });

    try {
        localStorage.setItem(
            WATCHLIST_KEY,
            JSON.stringify(updatedWatchlist)
        );

        renderWatchlist();

    } catch (error) {
        console.error("Failed to update watchlist:", error);
        alert("Could not remove movie from watchlist.");
    }
}

function renderWatchlist() {
    const watchlist = getWatchlist();

    watchlistGrid.replaceChildren();

    watchlistCount.textContent =
    `${watchlist.length} ${watchlist.length === 1 ? "movie" : "movies"} saved`;

    if (watchlist.length === 0) {
        const message = document.createElement("p");
        message.textContent = "Your watchlist is empty.";

        const discoverLink = document.createElement("a");
        discoverLink.href = "index.html#discover";
        discoverLink.textContent = "Discover movies";

        watchlistGrid.append(message, discoverLink);
        return;
    }

    watchlist.forEach(function(movie) {

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

        const info = document.createElement("p");

        const year = movie.release_date
            ? movie.release_date.slice(0, 4)
            : "N/A";

        const rating = typeof movie.vote_average === "number"
            ? movie.vote_average.toFixed(1)
            : "N/A";

        info.textContent = `${year} | ⭐ ${rating}`;

        const removeButton = document.createElement("button");
        removeButton.className = "watchlist-remove";
        removeButton.type = "button";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", function() {
            removeFromWatchlist(movie.id);
        });

        card.append(link, info, removeButton);

        watchlistGrid.appendChild(card);
    });
}

renderWatchlist();
