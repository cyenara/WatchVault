
const registerForm = document.getElementById("register-form");
const registerButton = document.getElementById("register-button");
const registerMessage = document.getElementById("register-message");

registerForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const passwordInput = document.getElementById("password");
    const password = passwordInput.value;

    registerButton.disabled = true;
    registerButton.textContent = "Creating account...";
    registerMessage.textContent = "";

    try {
        const response = await fetch(
            "/api/auth/register",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Registration failed");
        }

        registerMessage.textContent =
            "Account created successfully!";

        registerForm.reset();

    } catch (error) {
        console.error(error);
        registerMessage.textContent = error.message;

    } finally {
        passwordInput.value = "";
        registerButton.disabled = false;
        registerButton.textContent = "Create Account";
    }
});
