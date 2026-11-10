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

        const info = document.createElement("p");
        info.textContent = movie.year + " | " + movie.genre;

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

        const matchesGenre = selectedGenre === "All-genres" || movie.genre === selectedGenre;

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

loadMovies();