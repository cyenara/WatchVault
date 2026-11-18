const params = new URLSearchParams(window.location.search);
const movieId = Number(params.get("id"));

const statusText = document.getElementById("details-status");
const detailsSection = document.getElementById("movie-details");

async function loadMovieDetails() {

    const WATCHLIST_KEY = "watchvault-watchlist";

    function getWatchlist() {
        try {
            const saved = localStorage.getItem(WATCHLIST_KEY);

            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Failed to read watchlist:", error);
            return [];
        }
    }


    if (!Number.isSafeInteger(movieId) || movieId <= 0) {
        statusText.textContent = "Invalid movie ID.";
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:3001/api/movies/${movieId}`
        );

        if (!response.ok) {
            throw new Error("Failed to load movie details");
        }

        const movie = await response.json();

        const watchlistButton = document.getElementById("watchlist-button");

        function updateWatchlistButton() {
            const watchlist = getWatchlist();

            const isSaved = watchlist.some(function(item) {
                return item.id === movie.id;
            });

            watchlistButton.textContent = isSaved
                ? "✓ In Watchlist"
                : "+ Add to Watchlist";

            watchlistButton.setAttribute("aria-pressed", String(isSaved));
        }

        updateWatchlistButton();

        watchlistButton.addEventListener("click", function() {
            const watchlist = getWatchlist();

            const isSaved = watchlist.some(function(item) {
                return item.id === movie.id;
            });

            let updatedWatchlist;

            if (isSaved) {
                updatedWatchlist = watchlist.filter(function(item) {
                    return item.id !== movie.id;
                });
            } else {
                updatedWatchlist = [...watchlist, {
                    id: movie.id,
                    title: movie.title,
                    poster_path: movie.poster_path,
                    release_date: movie.release_date,
                    vote_average: movie.vote_average
                }];
            }

            try {
                localStorage.setItem(
                    WATCHLIST_KEY,
                    JSON.stringify(updatedWatchlist)
                );

                updateWatchlistButton();
            } catch (error) {
                console.error("Failed to save watchlist:", error);
                alert("Could not update watchlist.");
            }
        });

        const backdrop = document.getElementById("details-backdrop");

        if (movie.backdrop_path) {
            const backdropUrl =
                `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`;

            backdrop.style.backgroundImage =
                `linear-gradient(to top, #202d47, transparent 85%), url("${backdropUrl}")`;

            backdrop.hidden = false;
        }

        document.title = `${movie.title} | WatchVault`;

        document.getElementById("details-title").textContent =
            movie.title;

        const poster = document.getElementById("details-poster");

        if (movie.poster_path) {
            poster.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
            poster.alt = `${movie.title} poster`;
        } else {
            poster.hidden = true;
        }

        const year = movie.release_date
            ? movie.release_date.slice(0, 4)
            : "N/A";

        const rating = typeof movie.vote_average === "number"
            ? movie.vote_average.toFixed(1)
            : "N/A";

        const runtime = movie.runtime
            ? `${movie.runtime} min`
            : "Runtime unknown";

        document.getElementById("details-meta").textContent =
            `${year} | ⭐ ${rating} | ${runtime}`;

        const genres = (movie.genres || []).map(function(genre) {
            return genre.name;
        });

        document.getElementById("details-genres").textContent =
            genres.join(", ") || "Genres unavailable";

        document.getElementById("details-overview").textContent =
            movie.overview || "No description available.";

        const directors = (movie.credits?.crew || [])
            .filter(function(person) {
                return person.job === "Director";
            })
            .map(function(person) {
                return person.name;
            });

        document.getElementById("details-director").textContent =
            directors.join(", ") || "Not available";

        const castGrid = document.getElementById("details-cast");

        castGrid.replaceChildren();

        const cast = (movie.credits?.cast || []).slice(0, 8);

        cast.forEach(function(person) {

            const card = document.createElement("article");
            card.className = "cast-card";

            if (person.profile_path) {
                const photo = document.createElement("img");

                photo.src = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
                photo.alt = `${person.name} portrait`;
                photo.loading = "lazy";

                card.appendChild(photo);
            } else {
                const placeholder = document.createElement("div");
                placeholder.className = "cast-placeholder";
                placeholder.textContent = "No photo";

                card.appendChild(placeholder);
            }

            const name = document.createElement("h4");
            name.textContent = person.name;

            const character = document.createElement("p");
            character.textContent = person.character || "Unknown role";

            card.append(name, character);

            castGrid.appendChild(card);
        });

        if (cast.length === 0) {
            castGrid.textContent = "Cast information unavailable.";
        }

        detailsSection.hidden = false;
        statusText.hidden = true;

    } catch (error) {
        console.error(error);
        statusText.textContent =
            "Could not load movie details. Please try again.";
    }
}

loadMovieDetails();