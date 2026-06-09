function getCurrentUser() {
    return JSON.parse(localStorage.getItem("examUser") || "null");
}

function requireLogin() {
    const user = getCurrentUser();

    if (!user) {
        window.location.href = "index.html";
        return null;
    }

    const currentUserText = document.getElementById("currentUserText");

    if (currentUserText) {
        currentUserText.textContent = `${user.name}（${user.role}）`;
    }

    return user;
}

function logout() {
    localStorage.removeItem("examUser");
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }

    requireLogin();
});
