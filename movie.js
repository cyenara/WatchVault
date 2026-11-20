const params = new URLSearchParams(window.location.search);
const movieId = Number(params.get("id"));

const statusText = document.getElementById("details-status");
const detailsSection = document.getElementById("movie-details");


const WATCHLIST_API = "/api/watchlist";
const AUTH_API = "/api/auth";
const WATCHED_API = "/api/watched";
const RATINGS_API = "/api/ratings";

async function setupWatchlistButton(movie) {
    const button = document.getElementById("watchlist-button");

    button.disabled = true;
    button.textContent = "Checking Watchlist...";

    try {
        const authResponse = await fetch(`${AUTH_API}/me`, {
            credentials: "include"
        });

        if (!authResponse.ok) {
            throw new Error("Failed to check login status");
        }

        const authData = await authResponse.json();

        // Jei vartotojas neprisijungęs.
        if (!authData.user) {
            button.textContent = "Log in to use Watchlist";
            button.disabled = false;

            button.addEventListener("click", function() {
                window.location.href = "login.html";
            });

            return;
        }

        // Gauname vartotojo išsaugotus filmų ID.
        const response = await fetch(WATCHLIST_API, {
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Failed to load watchlist");
        }

        const data = await response.json();

        let isSaved = data.movieIds.includes(movie.id);

        function updateButton() {
            button.textContent = isSaved
                ? "✓ In Watchlist"
                : "+ Add to Watchlist";

            button.setAttribute(
                "aria-pressed",
                String(isSaved)
            );
        }

        updateButton();
        button.disabled = false;

        button.addEventListener("click", async function() {
            if (button.disabled) {
                return;
            }

            button.disabled = true;

            try {
                const options = {
                    method: isSaved ? "DELETE" : "POST",
                    credentials: "include"
                };

                const url = isSaved
                    ? `${WATCHLIST_API}/${movie.id}`
                    : WATCHLIST_API;

                if (!isSaved) {
                    options.headers = {
                        "Content-Type": "application/json"
                    };

                    options.body = JSON.stringify({
                        movieId: movie.id
                    });
                }

                const response = await fetch(url, options);

                if (!response.ok) {
                    throw new Error("Failed to update watchlist");
                }

                isSaved = !isSaved;
                updateButton();

            } catch (error) {
                console.error(error);
                alert("Could not update watchlist.");

            } finally {
                button.disabled = false;
            }
        });

    } catch (error) {
        console.error(error);

        button.textContent = "Watchlist unavailable";
        button.disabled = true;
    }
}


async function setupWatchedButton(movie) {
    const button = document.getElementById("watched-button");

    button.disabled = true;
    button.textContent = "Checking...";

    try {
        // Gauname prisijungusio vartotojo peržiūrėtus filmus
        const response = await fetch(WATCHED_API, {
            credentials: "include",
            cache: "no-store"
        });

        // Jei vartotojas neprisijungęs
        if (response.status === 401) {
            button.textContent = "Log in to mark as watched";
            button.disabled = false;

            button.addEventListener("click", function() {
                window.location.href = "login.html";
            });

            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load watched movies");
        }

        const data = await response.json();

        let isWatched = data.movieIds.includes(movie.id);

        function updateButton() {
            button.textContent = isWatched
                ? "✓ Watched"
                : "✓ Mark as Watched";

            button.setAttribute(
                "aria-pressed",
                String(isWatched)
            );
        }

        updateButton();
        button.disabled = false;

        // Mygtuko paspaudimas
        button.addEventListener("click", async function() {
            if (button.disabled) {
                return;
            }

            button.disabled = true;

            try {
                const options = {
                    method: isWatched ? "DELETE" : "POST",
                    credentials: "include"
                };

                const url = isWatched
                    ? `${WATCHED_API}/${movie.id}`
                    : WATCHED_API;

                if (!isWatched) {
                    options.headers = {
                        "Content-Type": "application/json"
                    };

                    options.body = JSON.stringify({
                        movieId: movie.id
                    });
                }

                const result = await fetch(url, options);

                if (result.status === 401) {
                    window.location.href = "login.html";
                    return;
                }

                if (!result.ok) {
                    throw new Error("Failed to update watched movies");
                }

                isWatched = !isWatched;
                updateButton();

                document.dispatchEvent(
                    new CustomEvent("watchvault:watched-changed", {
                        detail: {
                            movieId: movie.id,
                            isWatched: isWatched
                        }
                    })
                );

            } catch (error) {
                console.error(error);
                alert("Could not update watched status.");

            } finally {
                button.disabled = false;
            }
        });

    } catch (error) {
        console.error(error);

        button.textContent = "Watched unavailable";
        button.disabled = true;
    }
}


async function setupPersonalRating(movie) {
    const controls = document.getElementById("rating-controls");
    const ratingSelect = document.getElementById("personal-rating");

    const saveButton = document.getElementById("save-rating");
    const removeButton = document.getElementById("remove-rating");
    const message = document.getElementById("rating-message");

    let isWatched = false;
    let savedRating = null;

    // Atnaujiname vertinimo laukelio būseną.
    function updateRatingUI() {
        controls.hidden = !isWatched;

        if (!isWatched) {
            message.textContent =
                "Mark this movie as watched before rating.";
            return;
        }

        if (savedRating === null) {
            message.textContent = "You haven't rated this movie yet.";
            removeButton.hidden = true;
        } else {
            message.textContent = `Your rating: ⭐ ${savedRating}/10`;
            ratingSelect.value = String(savedRating);
            removeButton.hidden = false;
        }
    }

    // Reaguojame į Watched mygtuko pasikeitimą.
    document.addEventListener(
        "watchvault:watched-changed",
        function(event) {
            if (event.detail.movieId !== movie.id) {
                return;
            }

            isWatched = event.detail.isWatched;

            if (!isWatched) {
                savedRating = null;
                ratingSelect.value = "";
            }

            updateRatingUI();
        }
    );

    try {
        // Gauname peržiūrėtus filmus ir įvertinimus.
        const [watchedResponse, ratingsResponse] =
            await Promise.all([
                fetch(WATCHED_API, {
                    credentials: "include",
                    cache: "no-store"
                }),
                fetch(RATINGS_API, {
                    credentials: "include",
                    cache: "no-store"
                })
            ]);

        if (
            watchedResponse.status === 401 ||
            ratingsResponse.status === 401
        ) {
            message.textContent = "Log in to rate movies.";
            return;
        }

        if (!watchedResponse.ok || !ratingsResponse.ok) {
            throw new Error("Failed to load rating information");
        }

        const watchedData = await watchedResponse.json();
        const ratingsData = await ratingsResponse.json();

        isWatched = watchedData.movieIds.includes(movie.id);

        const existingRating = ratingsData.ratings.find(
            function(item) {
                return item.movieId === movie.id;
            }
        );

        savedRating = existingRating
            ? existingRating.rating
            : null;

        updateRatingUI();

    } catch (error) {
        console.error("Rating error:", error);
        message.textContent = "Ratings unavailable.";
        controls.hidden = true;
        return;
    }

    // Išsaugome arba pakeičiame įvertinimą.
    saveButton.addEventListener("click", async function() {
        if (!isWatched || saveButton.disabled) {
            return;
        }

        const rating = Number(ratingSelect.value);

        if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
            message.textContent = "Please select a rating from 1 to 10.";
            return;
        }

        saveButton.disabled = true;
        removeButton.disabled = true;

        try {
            const response = await fetch(
                `${RATINGS_API}/${movie.id}`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        rating: rating
                    })
                }
            );

            if (response.status === 401) {
                window.location.href = "login.html";
                return;
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to save rating");
            }

            savedRating = rating;

            updateRatingUI();
            message.textContent = `Rating saved: ⭐ ${rating}/10`;

        } catch (error) {
            console.error(error);
            message.textContent = error.message;

        } finally {
            saveButton.disabled = false;
            removeButton.disabled = false;
        }
    });

    // Pašaliname asmeninį įvertinimą.
    removeButton.addEventListener("click", async function() {
        if (savedRating === null || removeButton.disabled) {
            return;
        }

        removeButton.disabled = true;
        saveButton.disabled = true;

        try {
            const response = await fetch(
                `${RATINGS_API}/${movie.id}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );

            if (response.status === 401) {
                window.location.href = "login.html";
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to remove rating");
            }

            savedRating = null;
            ratingSelect.value = "";

            updateRatingUI();
            message.textContent = "Your rating has been removed.";

        } catch (error) {
            console.error(error);
            message.textContent = "Could not remove rating.";

        } finally {
            removeButton.disabled = false;
            saveButton.disabled = false;
        }
    });
}



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
            `/api/movies/${movieId}`
        );

        if (!response.ok) {
            throw new Error("Failed to load movie details");
        }

        const movie = await response.json();
        setupWatchlistButton(movie);
        setupWatchedButton(movie);
        setupPersonalRating(movie);

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