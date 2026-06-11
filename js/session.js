function getCurrentUser() {
    return JSON.parse(localStorage.getItem("examUser") || "null");
}

function hasCompleteProfile(user) {
    return Boolean(user?.role && user?.courses?.length);
}

function requireLogin() {
    const user = getCurrentUser();

    if (!user) {
        window.location.href = "index.html";
        return null;
    }

    const page = window.location.pathname.split("/").pop() || "index.html";

    if (page !== "profile.html" && !hasCompleteProfile(user)) {
        window.location.href = "profile.html";
        return null;
    }

    const currentUserText = document.getElementById("currentUserText");

    if (currentUserText) {
        const roleLabel = ROLE_NAMES[user.role] || user.role;
        currentUserText.textContent = roleLabel
            ? `${user.name || user.email || user.user_id} (${roleLabel})`
            : user.name || user.email || user.user_id;
    }

    return user;
}

function logout() {
    const logoutUrl = new URL(`${APP_CONFIG.COGNITO_DOMAIN}/logout`);

    // localStorage.removeItem("examUser");
    // localStorage.removeItem("examAuthSession");
    // localStorage.removeItem("examProfile");
    localStorage.clear();

    logoutUrl.search = new URLSearchParams({
        client_id: APP_CONFIG.COGNITO_CLIENT_ID,
        logout_uri: APP_CONFIG.COGNITO_LOGOUT_URI
    }).toString();

    window.location.href = logoutUrl.toString();
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }

    requireLogin();
});
