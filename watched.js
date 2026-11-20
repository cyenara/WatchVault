
const API_URL = "http://localhost:3001/api";

const watchedGrid = document.getElementById("watched-grid");
const watchedCount = document.getElementById("watched-count");
const watchedStatus = document.getElementById("watched-status");

// Pašaliname filmą iš peržiūrėtų sąrašo.
async function removeWatchedMovie(movieId, button) {
    button.disabled = true;
    button.textContent = "Removing...";

    try {
        const response = await fetch(
            `${API_URL}/watched/${movieId}`,
            {
                method: "DELETE",
                credentials: "include"
            }
        );

        if (!response.ok) {
            throw new Error("Failed to remove watched movie");
        }

        await loadWatchedMovies();

    } catch (error) {
        console.error(error);

        alert("Could not remove movie.");

        button.disabled = false;
        button.textContent = "Remove Watched";
    }
}

// Sukuriame filmų korteles.
function renderWatchedMovies(movieList, ratingsByMovieId = new Map()) {
    watchedGrid.replaceChildren();

    watchedCount.textContent =
        `${movieList.length} ${
            movieList.length === 1 ? "movie" : "movies"
        } watched`;

    if (movieList.length === 0) {
        const message = document.createElement("p");
        message.textContent = "You haven't watched any movies yet.";

        const discoverLink = document.createElement("a");
        discoverLink.href = "index.html#discover";
        discoverLink.textContent = "Discover movies";

        watchedGrid.append(message, discoverLink);
        return;
    }

    movieList.forEach(function(movie) {

        const card = document.createElement("article");
        card.className = "movie-card watched-card";

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
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "watched-placeholder";
            placeholder.textContent = "No poster";

            link.appendChild(placeholder);
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

        const personalRating = ratingsByMovieId.get(movie.id);

        const yourRating = document.createElement("p");
        yourRating.className = "personal-rating-text";

        yourRating.textContent = Number.isInteger(personalRating)
            ? `Your Rating: ⭐ ${personalRating}/10`
            : "Your Rating: Not rated";

        const removeButton = document.createElement("button");
        removeButton.className = "watched-remove";
        removeButton.type = "button";
        removeButton.textContent = "Remove Watched";

        removeButton.addEventListener("click", function() {
            removeWatchedMovie(movie.id, removeButton);
        });

        card.append(link, info, yourRating, removeButton);

        watchedGrid.appendChild(card);
    });
}

// Užkrauname vartotojo peržiūrėtus filmus.
async function loadWatchedMovies() {
    watchedStatus.hidden = false;
    watchedStatus.textContent = "Loading watched movies...";
    watchedCount.textContent = "";
    watchedGrid.replaceChildren();

    try {
        // 1. Gauname peržiūrėtų filmų ID.
        const response = await fetch(
            `${API_URL}/watched`,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        // Jei vartotojas neprisijungęs.
        if (response.status === 401) {
            watchedStatus.textContent =
                "Please log in to view your watched movies.";

            const loginLink = document.createElement("a");
            loginLink.href = "login.html";
            loginLink.textContent = " Log In";

            watchedStatus.appendChild(loginLink);
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load watched movies");
        }

        const data = await response.json();
        const movieIds = data.movieIds;


        const ratingsResponse = await fetch(
            `${API_URL}/ratings`,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (!ratingsResponse.ok) {
            throw new Error("Failed to load personal ratings");
        }

        const ratingsData = await ratingsResponse.json();

        const ratingsByMovieId = new Map(
            ratingsData.ratings.map(function(item) {
                return [item.movieId, item.rating];
            })
        );


        // 2. Jei sąrašas tuščias.
        if (movieIds.length === 0) {
            renderWatchedMovies([]);
            watchedStatus.hidden = true;
            return;
        }

        // 3. Gauname filmų informaciją iš TMDB per backend.
        const results = await Promise.allSettled(
            movieIds.map(async function(id) {

                const movieResponse = await fetch(
                    `${API_URL}/movies/${id}`
                );

                if (!movieResponse.ok) {
                    throw new Error(`Failed to load movie ${id}`);
                }

                return await movieResponse.json();
            })
        );

        // 4. Sudarome filmų masyvą.
        // Jei filmo duomenys nepasiekiami, paliekame jo ID,
        // kad vartotojas neprarastų galimybės pašalinti įrašo.
        const movies = results.map(function(result, index) {
            if (result.status === "fulfilled") {
                return result.value;
            }

            return {
                id: movieIds[index],
                title: `Movie #${movieIds[index]}`,
                poster_path: null,
                release_date: null,
                vote_average: null
            };
        });

        renderWatchedMovies(movies, ratingsByMovieId);

        watchedStatus.hidden = true;

    } catch (error) {
        console.error("Watched movies error:", error);

        watchedStatus.textContent =
            "Could not load watched movies. Please try again.";
    }
}

loadWatchedMovies();
