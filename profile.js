
const API_URL = "/api";

const profileStatus = document.getElementById("profile-status");
const profileContent = document.getElementById("profile-content");
const averageRating = document.getElementById(
    "profile-average-rating"
);

const profileUsername = document.getElementById("profile-username");
const profileAvatar = document.getElementById("profile-avatar");
const watchlistCount = document.getElementById("profile-watchlist-count");
const watchedCount = document.getElementById("profile-watched-count");

async function loadProfile() {
    try {
        // 1. Patikriname prisijungusį vartotoją
        const authResponse = await fetch(
            `${API_URL}/auth/me`,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (!authResponse.ok) {
            throw new Error("Failed to load user information");
        }

        const authData = await authResponse.json();

        // 2. Jei vartotojas neprisijungęs
        if (!authData.user) {
            profileStatus.textContent =
                "You must be logged in to view your profile.";

            const loginLink = document.createElement("a");
            loginLink.href = "login.html";
            loginLink.textContent = " Log In";

            profileStatus.appendChild(loginLink);
            return;
        }

        const user = authData.user;

        // 3. Atvaizduojame vartotojo informaciją
        profileUsername.textContent = user.username;

        profileAvatar.textContent =
            user.username.charAt(0).toUpperCase();

        // 4. Gauname vartotojo Watchlist
        const watchlistResponse = await fetch(
            `${API_URL}/watchlist`,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (!watchlistResponse.ok) {
            throw new Error("Failed to load watchlist statistics");
        }

        const watchlistData = await watchlistResponse.json();

        // 5. Parodome išsaugotų filmų skaičių
        watchlistCount.textContent =
            watchlistData.movieIds.length;

        
        // Gauname peržiūrėtų filmų skaičių
        const watchedResponse = await fetch(
            `${API_URL}/watched`,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (!watchedResponse.ok) {
            throw new Error("Failed to load watched statistics");
        }

        const watchedData = await watchedResponse.json();

        watchedCount.textContent = watchedData.movieIds.length;

        const ratingsResponse = await fetch(
            `${API_URL}/ratings`,
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        if (!ratingsResponse.ok) {
            throw new Error("Failed to load rating statistics");
        }

        const ratingsData = await ratingsResponse.json();

        const ratings = ratingsData.ratings;

        if (ratings.length === 0) {
            averageRating.textContent = "—";
        } else {
            const total = ratings.reduce(function(sum, item) {
                return sum + item.rating;
            }, 0);

            const average = total / ratings.length;

            averageRating.textContent = `${average.toFixed(1)}/10`;
        }



        // 6. Parodome profilį
        profileContent.hidden = false;
        profileStatus.hidden = true;

    } catch (error) {
        console.error("Profile error:", error);

        profileStatus.textContent =
            "Could not load your profile. Please try again.";
    }
}

loadProfile();
