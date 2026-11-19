
const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const passwordInput = document.getElementById("password");
    const password = passwordInput.value;

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    loginMessage.textContent = "";

    try { 
        const response = await fetch(
            "http://localhost:3001/api/auth/login",
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );


        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Login failed");
        }

        window.location.href = "index.html";

    } catch (error) {
        console.error(error);
        loginMessage.textContent = error.message;

    } finally {
        passwordInput.value = "";
        loginButton.disabled = false;
        loginButton.textContent = "Log In";
    }
});
