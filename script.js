let movies = [];
let currentPage = 1;

const movieGrid = document.getElementById("movie-grid");
const searchInput = document.getElementById("movie-search");
const genreFilter = document.getElementById("genre-search");
const sortFilter = document.getElementById("sort-search");
const loadMoreButton = document.getElementById("load-more");

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

function formatMovies(movieList) {
    return movieList.map(function(movie) {
        return {
            id: movie.id,
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
}

async function testTMDB() {
    try {
        const response = await fetch("http://localhost:3001/api/movies/popular");

        if (!response.ok) {
            throw new Error("Failed to connect to backend");
        }

        const data = await response.json();

        const formattedMovies = formatMovies(data.results);
        
        movies = formattedMovies;
        applyFilters();

    console.log(formattedMovies);

    } catch (error) {
        console.error(error);
    }
}

testTMDB();

loadMoreButton.addEventListener("click", async function() {
    loadMoreButton.disabled = true;
    loadMoreButton.textContent = "Loading...";
    try {
        const nextPage = currentPage + 1;

        const response = await fetch(
            `http://localhost:3001/api/movies/popular?page=${nextPage}`
        );

        if (!response.ok) {
            throw new Error("Failed to load more movies");
        }

        const data = await response.json();

        const newMovies = formatMovies(data.results);

        const existingIds = new Set(movies.map(function(movie) {
            return movie.id;
        }));

        const uniqueMovies = newMovies.filter(function(movie) {
            if (existingIds.has(movie.id)) {
                return false;
            }

            existingIds.add(movie.id);
            return true;
        });

        movies = [...movies, ...uniqueMovies];
        applyFilters();

        currentPage = nextPage;

    } catch (error) {
        console.error(error);
    } finally {
        loadMoreButton.disabled = false;
        loadMoreButton.textContent = "Load More";
    }
});