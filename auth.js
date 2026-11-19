
const AUTH_API = "http://localhost:3001/api/auth";

async function updateAuthNavigation() {
    const navList = document.querySelector("header nav ul");

    if (!navList) {
        return;
    }

    try {
        const response = await fetch(`${AUTH_API}/me`, {
            credentials: "include",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Failed to check login status");
        }

        const data = await response.json();

        if (!data.user) {
            return;
        }

        document.querySelectorAll(".auth-nav-link").forEach(
            function(item) {
                item.remove();
            }
        );

        const userItem = document.createElement("li");
        userItem.className = "nav-user";

        const profileLink = document.createElement("a");
        profileLink.href = "profile.html";
        profileLink.textContent = data.user.username;

        userItem.appendChild(profileLink);

        const logoutItem = document.createElement("li");

        const logoutButton = document.createElement("button");
        logoutButton.type = "button";
        logoutButton.className = "nav-logout";
        logoutButton.textContent = "Logout";

        logoutButton.addEventListener("click", async function() {
            logoutButton.disabled = true;

            try {
                const response = await fetch(
                    `${AUTH_API}/logout`,
                    {
                        method: "POST",
                        credentials: "include"
                    }
                );

                if (!response.ok) {
                    throw new Error("Logout failed");
                }

                window.location.href = "index.html";

            } catch (error) {
                console.error(error);
                alert("Could not log out.");
                logoutButton.disabled = false;
            }
        });

        logoutItem.appendChild(logoutButton);
        navList.append(userItem, logoutItem);

    } catch (error) {
        console.error("Authentication check failed:", error);
    }
}

updateAuthNavigation();
