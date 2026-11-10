let movies = [];

const movieGrid = document.getElementById("movie-grid");
const searchInput = document.getElementById("movie-search");
const genreFilter = document.getElementById("genre-search");
const sortFilter = document.getElementById("sort-search");

function renderMovies(movieList) {

    movieGrid.replaceChildren();

    if(movieList.length === 0){
        const nomovies = document.createElement("p");
        nomovies.textContent = "No movies found!";
        movieGrid.appendChild(nomovies);
        return;
    }
    movieList.forEach(function(movie) {

        const card = document.createElement("article");
        card.className = "movie-card";

        const poster = document.createElement("img");
        poster.className = "movie-poster";
        poster.src = movie.poster;
        poster.alt = "Movie poster";

        const title = document.createElement("h3");
        title.textContent = movie.title;

        const genreNames = movie.genreIds.map(function(id) {
            return genreNamesById[id];
        });

        const knownGenres = genreNames.filter(function(name) {
            return name !== undefined;
        });

        const genreText = knownGenres.join(", ");

        const info = document.createElement("p");

        info.textContent = `${movie.year ?? "N/A"} | ⭐ ${movie.rating.toFixed(1)} | ${genreText}`;
        card.append(poster, title, info);

        movieGrid.appendChild(card);
    });
}

renderMovies(movies);

searchInput.addEventListener("input", function() {
    applyFilters();
});

genreFilter.addEventListener("change", function() {
    applyFilters();
});
sortFilter.addEventListener("change", function(){
    applyFilters();
});

function applyFilters() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedGenre = genreFilter.value;
    const selectedSort = sortFilter.value;

    const filteredMovies = movies.filter(function(movie) {

        const matchesSearch = movie.title.toLowerCase().includes(searchText);

        const matchesGenre = selectedGenre === "All-genres"
            || movie.genreIds.includes(Number(selectedGenre));

        return matchesSearch && matchesGenre;
    });

    if (selectedSort === "newest"){
        filteredMovies.sort(function(a, b){
            return b.year - a.year;
        });
    }
    else if (selectedSort === "oldest"){
        filteredMovies.sort(function(a, b){
            return a.year - b.year;
        });
    }
    else if (selectedSort === "az"){
        filteredMovies.sort(function(a, b){
            return a.title.localeCompare(b.title);
        });
    }

    renderMovies(filteredMovies);
}

async function loadMovies() {
    try {
        const response = await fetch("movies.json");

        if (!response.ok) {
            throw new Error("Failed to load movies");
        }

        const data = await response.json();

        movies = data;
        applyFilters();

    } catch (error) {
        console.error(error);
    }
}

//loadMovies();
const genreNamesById = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western"
};

async function testTMDB() {
    try {
        const response = await fetch("http://localhost:3001/api/movies/popular");

        if (!response.ok) {
            throw new Error("Failed to connect to backend");
        }

        const data = await response.json();

        const formattedMovies = data.results.map(function(movie) {
            return {
                title: movie.title,
                year: movie.release_date
                    ? Number(movie.release_date.slice(0, 4))
                    : null,
                rating: movie.vote_average,
                poster: movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : "images/placeholder.jpg",
                genreIds: movie.genre_ids

            };
        });

        movies = formattedMovies;
        applyFilters();

    console.log(formattedMovies);

    } catch (error) {
        console.error(error);
    }
}

testTMDB();